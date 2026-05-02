"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Receipt, Save } from "lucide-react";
import api from "@/lib/api";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import type { ApiResponse } from "@/types";
import type { Invoice } from "@/types/billing";
import { useProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

function money(cents: number, currency: string) {
  const value = (cents ?? 0) / 100;
  return `${(currency || "USD").toUpperCase()} ${value.toFixed(2)}`;
}

export default function ProjectBillingPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);

  const teamId = project?.team;

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["billing-invoices", teamId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Invoice[]>>(`/billing/teams/${teamId}/invoices/`);
      return res.data.data ?? [];
    },
    enabled: !!teamId,
  });

  const projectInvoices = useMemo(() => invoices.filter((inv) => inv.project === id), [id, invoices]);

  const [creating, setCreating] = useState(false);
  type DraftLineItem = { description: string; quantity: number; unit_price_cents: number };
  type DraftInvoice = {
    invoice_number: string;
    client_name: string;
    client_email: string;
    client_address: string;
    currency: string;
    issued_at: string;
    due_at: string | null;
    notes: string;
    line_items: DraftLineItem[];
  };

  const [draft, setDraft] = useState<DraftInvoice>({
    invoice_number: "",
    client_name: "",
    client_email: "",
    client_address: "",
    currency: "USD",
    issued_at: new Date().toISOString().slice(0, 10),
    due_at: null,
    notes: "",
    line_items: [{ description: "Services", quantity: 1, unit_price_cents: 0 }],
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Missing team");
      const payload = {
        ...draft,
        project: id,
        line_items: (draft.line_items ?? []).map((li) => ({
          description: (li.description || "").trim(),
          quantity: Number(li.quantity ?? 1),
          unit_price_cents: Number(li.unit_price_cents ?? 0),
        })),
      };
      const res = await api.post<ApiResponse<Invoice>>(`/billing/teams/${teamId}/invoices/`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Invoice created");
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["billing-invoices", teamId] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to create invoice")),
  });

  const openPrint = (invoiceId: string) => {
    const url = `${getApiBaseUrl()}/api/billing/invoices/${invoiceId}/html/`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-background">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">Billing</h1>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">Create invoices for this project.</p>
        </div>
        <Button className="gap-2" onClick={() => setCreating((v) => !v)} disabled={!teamId}>
          <Plus className="h-4 w-4" />
          New invoice
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Draft invoice
            </CardTitle>
            <CardDescription>Amounts are stored in cents. Use Print to export as PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Invoice number (optional)"
                value={draft.invoice_number ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, invoice_number: e.target.value }))}
              />
              <Input
                placeholder="Currency (e.g. USD)"
                value={draft.currency ?? "USD"}
                onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value.toUpperCase() }))}
              />
              <Input
                type="date"
                value={(draft.issued_at as string) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, issued_at: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Client name"
                value={draft.client_name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, client_name: e.target.value }))}
              />
              <Input
                placeholder="Client email"
                value={draft.client_email ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, client_email: e.target.value }))}
              />
              <Input
                placeholder="Due date (optional)"
                type="date"
                value={(draft.due_at as string) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, due_at: e.target.value || null }))}
              />
            </div>

            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Client address (optional)"
              value={draft.client_address ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, client_address: e.target.value }))}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Line items</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({ ...d, line_items: [...(d.line_items ?? []), { description: "", quantity: 1, unit_price_cents: 0 }] }))
                  }
                >
                  Add item
                </Button>
              </div>

              <div className="space-y-2">
                {(draft.line_items ?? []).map((li, idx) => (
                  <div key={idx} className="grid gap-2 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <Input
                        placeholder="Description"
                        value={li.description ?? ""}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...(d.line_items ?? [])];
                            next[idx] = { ...next[idx], description: e.target.value };
                            return { ...d, line_items: next };
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.25}
                        placeholder="Qty"
                        value={String(li.quantity ?? 1)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...(d.line_items ?? [])];
                            next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                            return { ...d, line_items: next };
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Unit (cents)"
                        value={String(li.unit_price_cents ?? 0)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const next = [...(d.line_items ?? [])];
                            next[idx] = { ...next[idx], unit_price_cents: Number(e.target.value) };
                            return { ...d, line_items: next };
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {money(Number(li.unit_price_cents ?? 0) * Number(li.quantity ?? 1), draft.currency ?? "USD")}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          setDraft((d) => {
                            const next = [...(d.line_items ?? [])];
                            next.splice(idx, 1);
                            return { ...d, line_items: next.length ? next : [{ description: "", quantity: 1, unit_price_cents: 0 }] };
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <textarea
              className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Notes (optional)"
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button className="gap-2" onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
                <Save className={cn("h-4 w-4", createInvoice.isPending && "animate-spin")} />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>{projectInvoices.length} invoice(s) for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {projectInvoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            projectInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{inv.invoice_number || inv.id.slice(0, 8)}</p>
                    <Badge variant="secondary" className="text-[11px]">
                      {inv.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      Total: {money(inv.total_cents ?? 0, inv.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{inv.client_name || "Client"}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openPrint(inv.id)}>
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
