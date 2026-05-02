from __future__ import annotations

import uuid
from django.db import models


class TeamBilling(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField("teams.Team", on_delete=models.CASCADE, related_name="billing")

    provider = models.CharField(max_length=20, default="stripe")
    customer_id = models.CharField(max_length=120, blank=True, default="")
    subscription_id = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=40, blank=True, default="")

    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.team_id} ({self.provider})"


class Invoice(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_SENT = "sent"
    STATUS_PAID = "paid"
    STATUS_VOID = "void"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_SENT, "Sent"),
        (STATUS_PAID, "Paid"),
        (STATUS_VOID, "Void"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="invoices")
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")

    invoice_number = models.CharField(max_length=40, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    client_name = models.CharField(max_length=200, blank=True, default="")
    client_email = models.EmailField(blank=True, default="")
    client_address = models.TextField(blank=True, default="")

    currency = models.CharField(max_length=10, default="USD")
    issued_at = models.DateField(null=True, blank=True)
    due_at = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True, default="")

    subtotal_cents = models.PositiveIntegerField(default=0)
    tax_cents = models.PositiveIntegerField(default=0)
    total_cents = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="created_invoices")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "status", "created_at"], name="inv_team_status_created_idx"),
        ]

    def __str__(self) -> str:
        return self.invoice_number or str(self.id)


class InvoiceLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="line_items")
    description = models.CharField(max_length=400)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price_cents = models.PositiveIntegerField(default=0)
    amount_cents = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
