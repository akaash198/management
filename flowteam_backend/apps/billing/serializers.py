from __future__ import annotations

from rest_framework import serializers

from apps.billing.models import Invoice, InvoiceLineItem


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = (
            "id",
            "description",
            "quantity",
            "unit_price_cents",
            "amount_cents",
            "metadata",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "team",
            "project",
            "invoice_number",
            "status",
            "client_name",
            "client_email",
            "client_address",
            "currency",
            "issued_at",
            "due_at",
            "notes",
            "subtotal_cents",
            "tax_cents",
            "total_cents",
            "line_items",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "team",
            "created_by",
            "created_at",
            "updated_at",
            "subtotal_cents",
            "tax_cents",
            "total_cents",
        )

    def create(self, validated_data):
        items = validated_data.pop("line_items", [])
        invoice = super().create(validated_data)
        for item in items:
            InvoiceLineItem.objects.create(invoice=invoice, **item)
        return invoice

    def update(self, instance, validated_data):
        items = validated_data.pop("line_items", None)
        invoice = super().update(instance, validated_data)
        if items is not None:
            invoice.line_items.all().delete()
            for item in items:
                InvoiceLineItem.objects.create(invoice=invoice, **item)
        return invoice

