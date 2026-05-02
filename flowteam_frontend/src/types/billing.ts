export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Invoice {
  id: string;
  team: string;
  project: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  client_name: string;
  client_email: string;
  client_address: string;
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  notes: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

