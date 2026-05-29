from __future__ import annotations

import logging
from datetime import datetime, timezone

from django.conf import settings
from django.db import transaction
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.teams.models import Team
from apps.teams.permissions import IsTeamAdmin, IsTeamManager
from config.utils import standardize_response

from .models import Invoice, InvoiceLineItem, TeamBilling
from .serializers import InvoiceSerializer
from .stripe import create_checkout_session, get_plan_from_price_id, verify_webhook

logger = logging.getLogger(__name__)


class TeamCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTeamAdmin]

    def post(self, request: HttpRequest, team_id: str):
        team = get_object_or_404(Team, id=team_id)

        base = (getattr(settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/")
        plan = request.data.get("plan") or "pro"
        if plan not in {"pro", "ai"}:
            return standardize_response(success=False, error="Invalid plan", status=status.HTTP_400_BAD_REQUEST)
        success_url = f"{base}/settings/billing?checkout=success"
        cancel_url = f"{base}/settings/billing?checkout=cancel"

        try:
            session = create_checkout_session(
                team_id=str(team.id),
                customer_email=request.user.email,
                success_url=success_url,
                cancel_url=cancel_url,
                plan=plan,
            )
        except Exception as e:
            return standardize_response(success=False, error=str(e), status=status.HTTP_400_BAD_REQUEST)

        return standardize_response(data={"checkout_url": session.get("url"), "session_id": session.get("id")})


class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: HttpRequest):
        try:
            event = verify_webhook(
                payload=request.body,
                signature_header=request.headers.get("Stripe-Signature", ""),
            )
        except Exception as e:
            logger.warning("Stripe webhook rejected", extra={"error": str(e)})
            return Response({"error": "invalid signature"}, status=400)

        event_type = (event.get("type") or "").strip()
        obj = (event.get("data") or {}).get("object") or {}

        try:
            if event_type == "checkout.session.completed":
                team_id = (obj.get("metadata") or {}).get("team_id") or ""
                customer_id = obj.get("customer") or ""
                subscription_id = obj.get("subscription") or ""
                if not team_id:
                    return Response({"ok": True})

                with transaction.atomic():
                    team = Team.objects.select_for_update().get(id=team_id)
                    billing, _ = TeamBilling.objects.get_or_create(team=team)
                    billing.customer_id = customer_id or billing.customer_id
                    billing.subscription_id = subscription_id or billing.subscription_id
                    billing.status = "active"
                    billing.cancel_at_period_end = False
                    billing.save()

                    plan = (obj.get("metadata") or {}).get("plan") or "pro"
                    team.plan = plan
                    team.ai_enabled = plan == "ai"
                    team.save(update_fields=["plan", "ai_enabled"])

            elif event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
                subscription_id = obj.get("id") or ""
                if not subscription_id:
                    return Response({"ok": True})

                billing = TeamBilling.objects.select_related("team").filter(subscription_id=subscription_id).first()
                if not billing:
                    return Response({"ok": True})

                status_value = obj.get("status") or ""
                cancel_at_period_end = bool(obj.get("cancel_at_period_end") or False)
                current_period_end = obj.get("current_period_end")
                dt_end = None
                if isinstance(current_period_end, (int, float)) and current_period_end:
                    dt_end = datetime.fromtimestamp(int(current_period_end), tz=timezone.utc)

                with transaction.atomic():
                    billing.status = status_value or billing.status
                    billing.cancel_at_period_end = cancel_at_period_end
                    billing.current_period_end = dt_end
                    billing.save()

                    items = (((obj.get("items") or {}).get("data")) or [])
                    price_id = ""
                    if items:
                        price_id = (((items[0] or {}).get("price") or {}).get("id")) or ""
                    plan = get_plan_from_price_id(price_id)

                    if event_type == "customer.subscription.deleted" or status_value in {"canceled", "unpaid", "incomplete_expired"}:
                        team = billing.team
                        if team.plan != "free":
                            team.plan = "free"
                            team.ai_enabled = False
                            team.save(update_fields=["plan", "ai_enabled"])
                    elif plan in {"pro", "ai"}:
                        team = billing.team
                        team.plan = plan
                        team.ai_enabled = plan == "ai"
                        team.save(update_fields=["plan", "ai_enabled"])

        except Exception:
            logger.exception("Stripe webhook processing failed", extra={"type": event_type})
            return Response({"ok": False}, status=500)

        return Response({"ok": True})


class TeamInvoiceListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTeamManager]

    def get(self, request, team_id: str):
        team = get_object_or_404(Team, id=team_id)
        qs = Invoice.objects.filter(team=team).select_related("project", "created_by").prefetch_related("line_items")
        return standardize_response(data=InvoiceSerializer(qs, many=True).data)

    def post(self, request, team_id: str):
        team = get_object_or_404(Team, id=team_id)
        serializer = InvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save(team=team, created_by=request.user)
        _recompute_totals(invoice)
        return standardize_response(data=InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, invoice_id: str) -> Invoice:
        invoice = get_object_or_404(
            Invoice.objects.select_related("team", "project", "created_by").prefetch_related("line_items"),
            id=invoice_id,
        )
        if not _can_manage_invoice(self.request.user, invoice.team_id):
            raise PermissionDenied("Forbidden")
        return invoice

    def get(self, request, invoice_id: str):
        invoice = self.get_object(invoice_id)
        return standardize_response(data=InvoiceSerializer(invoice).data)

    def patch(self, request, invoice_id: str):
        invoice = self.get_object(invoice_id)
        serializer = InvoiceSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        _recompute_totals(invoice)
        return standardize_response(data=InvoiceSerializer(invoice).data)


def _recompute_totals(invoice: Invoice) -> None:
    subtotal = 0
    for item in invoice.line_items.all():
        qty = float(item.quantity or 0)
        amount = int(round(qty * int(item.unit_price_cents or 0)))
        if amount != item.amount_cents:
            InvoiceLineItem.objects.filter(id=item.id).update(amount_cents=amount)
        subtotal += amount
    tax = int(invoice.tax_cents or 0)
    total = subtotal + tax
    Invoice.objects.filter(id=invoice.id).update(subtotal_cents=subtotal, total_cents=total)


class InvoiceHtmlView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invoice_id: str):
        invoice = get_object_or_404(
            Invoice.objects.select_related("team", "project").prefetch_related("line_items"),
            id=invoice_id,
        )
        if not _can_manage_invoice(request.user, invoice.team_id):
            raise PermissionDenied("Forbidden")
        items = list(invoice.line_items.all())
        currency = (invoice.currency or "USD").upper()
        html = _render_invoice_html(invoice, items, currency=currency)
        return Response(html, content_type="text/html; charset=utf-8")


def _can_manage_invoice(user, team_id: str) -> bool:
    if getattr(user, "is_superuser", False):
        return True
    from apps.teams.models import TeamMember

    return TeamMember.objects.filter(team_id=team_id, user=user, role__in=("ceo", "admin", "manager")).exists()


def _money(cents: int, currency: str) -> str:
    try:
        value = (cents or 0) / 100.0
    except Exception:
        value = 0.0
    return f"{currency} {value:,.2f}"


def _render_invoice_html(invoice: Invoice, items: list[InvoiceLineItem], currency: str) -> str:
    issued = invoice.issued_at.isoformat() if invoice.issued_at else ""
    due = invoice.due_at.isoformat() if invoice.due_at else ""
    rows = "\n".join(
        f"<tr><td>{i.description}</td><td style='text-align:right'>{i.quantity}</td>"
        f"<td style='text-align:right'>{_money(i.unit_price_cents, currency)}</td>"
        f"<td style='text-align:right'>{_money(i.amount_cents, currency)}</td></tr>"
        for i in items
    )
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice {invoice.invoice_number or invoice.id}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; padding: 32px; color: #0f172a; }}
    h1 {{ margin: 0 0 6px; font-size: 22px; }}
    .muted {{ color: #64748b; font-size: 12px; }}
    .box {{ border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
    th, td {{ padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }}
    th {{ text-align: left; background: #f8fafc; }}
    .totals {{ margin-top: 12px; display: flex; justify-content: flex-end; }}
    .totals div {{ width: 280px; }}
    .totals .row {{ display:flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }}
    .totals .grand {{ font-weight: 700; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px; }}
    @media print {{ body {{ padding: 0; }} .box {{ border: none; }} }}
  </style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
    <div>
      <h1>Invoice {invoice.invoice_number or ""}</h1>
      <div class="muted">Status: {invoice.status}</div>
      <div class="muted">Issued: {issued} &nbsp; Due: {due}</div>
      <div class="muted">Project: {(invoice.project.name if invoice.project else '')}</div>
    </div>
    <div class="box" style="min-width:280px;">
      <div style="font-weight:700; margin-bottom:8px;">Bill To</div>
      <div>{invoice.client_name or ""}</div>
      <div class="muted">{invoice.client_email or ""}</div>
      <div class="muted" style="white-space:pre-wrap;">{invoice.client_address or ""}</div>
    </div>
  </div>

  <div class="box">
    <table>
      <thead>
        <tr><th>Description</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Unit</th><th style="text-align:right;">Amount</th></tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
    </table>

    <div class="totals">
      <div>
        <div class="row"><span>Subtotal</span><span>{_money(invoice.subtotal_cents, currency)}</span></div>
        <div class="row"><span>Tax</span><span>{_money(invoice.tax_cents, currency)}</span></div>
        <div class="row grand"><span>Total</span><span>{_money(invoice.total_cents, currency)}</span></div>
      </div>
    </div>

    <div class="muted" style="margin-top: 14px; white-space: pre-wrap;">{invoice.notes or ""}</div>
  </div>
</body>
</html>"""
