from django.urls import path

from .views import (
    InvoiceDetailView,
    InvoiceHtmlView,
    StripeWebhookView,
    TeamCheckoutView,
    TeamInvoiceListCreateView,
)

urlpatterns = [
    path("teams/<uuid:team_id>/checkout/", TeamCheckoutView.as_view(), name="billing_checkout"),
    path("teams/<uuid:team_id>/invoices/", TeamInvoiceListCreateView.as_view(), name="billing_team_invoices"),
    path("invoices/<uuid:invoice_id>/", InvoiceDetailView.as_view(), name="billing_invoice_detail"),
    path("invoices/<uuid:invoice_id>/html/", InvoiceHtmlView.as_view(), name="billing_invoice_html"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe_webhook"),
]
