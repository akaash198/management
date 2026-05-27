"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse, Team, TeamMember } from "@/types";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Crown,
  Layers,
  Users,
  Globe,
  MoreHorizontal,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Pause,
  AlertTriangle,
  ChevronRight,
  Pencil,
  Trash2,
  Settings2,
  Shield,
  ExternalLink,
} from "lucide-react";
import CompanyOnboardingWizard, {
  type AdminCompany,
  OnboardingStatusBadge,
} from "./CompanyOnboardingWizard";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminCompanyDetail = AdminCompany & {
  teams: Team[];
  settings_json: Record<string, unknown>;
  pending_invites_count: number;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
};

type DrillView = "companies" | "company_detail" | "team_members";

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function CompanyManagementPanel({ isSuperuser }: { isSuperuser: boolean }) {
  const queryClient = useQueryClient();

  // Drill-down state
  const [drillView, setDrillView] = useState<DrillView>("companies");
  const [activeCompany, setActiveCompany] = useState<AdminCompany | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  // Search + filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminCompany["onboarding_status"] | "all">("all");

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardCompany, setWizardCompany] = useState<AdminCompany | null>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<AdminCompany | null>(null);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCompany, setSettingsCompany] = useState<AdminCompanyDetail | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: companies, isLoading } = useQuery<AdminCompany[]>({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminCompany[]>>("/companies/");
      return res.data.data ?? [];
    },
    enabled: isSuperuser,
  });

  const { data: companyDetail, isLoading: isDetailLoading } = useQuery<AdminCompanyDetail>({
    queryKey: ["super-admin-company-detail", activeCompany?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminCompanyDetail>>(`/companies/${activeCompany!.id}/`);
      return res.data.data;
    },
    enabled: isSuperuser && !!activeCompany && drillView !== "companies",
  });

  const { data: teamMembers, isLoading: isMembersLoading } = useQuery<TeamMember[]>({
    queryKey: ["super-admin-team-members", activeTeam?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamMember[]>>(`/teams/${activeTeam!.id}/members/`);
      return res.data.data ?? [];
    },
    enabled: !!activeTeam && drillView === "team_members",
  });

  const { data: companySettings } = useQuery<Record<string, unknown>>({
    queryKey: ["super-admin-company-settings", settingsCompany?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, unknown>>>(`/companies/${settingsCompany!.id}/settings/`);
      return res.data.data ?? {};
    },
    enabled: settingsOpen && !!settingsCompany,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/companies/${id}/`); },
    onSuccess: () => {
      toast.success("Company deleted");
      setDeleteOpen(false);
      setDeletingCompany(null);
      if (drillView !== "companies") { setDrillView("companies"); setActiveCompany(null); }
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to delete company")),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdminCompany["onboarding_status"] }) => {
      const res = await api.patch<ApiResponse<AdminCompany>>(`/companies/${id}/`, { onboarding_status: status });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Status updated to ${data.onboarding_status}`);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-company-detail", data.id] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to update status")),
  });


  // ── Computed ──────────────────────────────────────────────────────────────

  const filtered = (companies ?? []).filter((c) => {
    if (statusFilter !== "all" && c.onboarding_status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ceo?.email ?? "").toLowerCase().includes(q) ||
      (c.email_domain ?? "").toLowerCase().includes(q)
    );
  });

  const statusCounts = {
    all: (companies ?? []).length,
    active: (companies ?? []).filter((c) => c.onboarding_status === "active").length,
    in_progress: (companies ?? []).filter((c) => c.onboarding_status === "in_progress").length,
    pending: (companies ?? []).filter((c) => c.onboarding_status === "pending").length,
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const openCompanyDetail = (c: AdminCompany) => {
    setActiveCompany(c);
    setDrillView("company_detail");
  };

  const openTeamMembers = (t: Team) => {
    setActiveTeam(t);
    setDrillView("team_members");
  };

  const openWizard = (c: AdminCompany | null) => {
    setWizardCompany(c);
    setWizardOpen(true);
  };

  const openSettings = (c: AdminCompanyDetail) => {
    setSettingsCompany(c);
    setSettingsOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Company Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {statusCounts.all} companies · {statusCounts.active} active · {statusCounts.in_progress} onboarding
          </p>
        </div>
        <Button onClick={() => openWizard(null)} className="gap-2">
          <Plus size={14} />
          Onboard Company
        </Button>
      </div>

      {/* Status filter strip */}
      <div className="flex gap-2 flex-wrap">
        <StatusChip label="All" count={statusCounts.all} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} color="default" />
        <StatusChip label="Active" count={statusCounts.active} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} color="success" />
        <StatusChip label="Onboarding" count={statusCounts.in_progress} active={statusFilter === "in_progress"} onClick={() => setStatusFilter("in_progress")} color="info" />
        <StatusChip label="Pending" count={statusCounts.pending} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} color="muted" />
      </div>

      {/* Drill-down breadcrumb */}
      {drillView !== "companies" && (
        <div className="flex items-center gap-1.5 text-sm bg-muted/40 border border-border rounded-xl px-3 py-2">
          <button
            onClick={() => { setDrillView("companies"); setActiveCompany(null); setActiveTeam(null); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Building2 size={12} />
            Companies
          </button>
          {activeCompany && (
            <>
              <ChevronRight size={13} className="text-muted-foreground/50" />
              <button
                onClick={() => { setDrillView("company_detail"); setActiveTeam(null); }}
                className={`flex items-center gap-1.5 transition-colors ${drillView === "company_detail" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <OnboardingStatusBadge status={activeCompany.onboarding_status} />
                {activeCompany.name}
              </button>
            </>
          )}
          {drillView === "team_members" && activeTeam && (
            <>
              <ChevronRight size={13} className="text-muted-foreground/50" />
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers size={12} className="text-blue-500" />
                {activeTeam.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── View: Companies List ── */}
      {drillView === "companies" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies…" className="pl-8" />
          </div>

          {isLoading && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 rounded-2xl bg-muted">
                  <Building2 size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {search || statusFilter !== "all"
                    ? "No companies match your filters."
                    : "No companies yet."}
                </p>
                {(search || statusFilter !== "all") ? (
                  <Button size="sm" variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openWizard(null)}>
                    Onboard your first company
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                onDrilldown={() => openCompanyDetail(c)}
                onEdit={() => openWizard(c)}
                onDelete={() => { setDeletingCompany(c); setDeleteOpen(true); }}
                onStatusChange={(status) => updateStatus.mutate({ id: c.id, status })}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── View: Company Detail ── */}
      {drillView === "company_detail" && activeCompany && (
        <CompanyDetailView
          company={activeCompany}
          detail={companyDetail ?? null}
          isLoading={isDetailLoading}
          onOpenTeamMembers={openTeamMembers}
          onEdit={() => openWizard(activeCompany)}
          onOpenSettings={() => companyDetail && openSettings(companyDetail)}
          onStatusChange={(status) => updateStatus.mutate({ id: activeCompany.id, status })}
        />
      )}

      {/* ── View: Team Members ── */}
      {drillView === "team_members" && activeTeam && (
        <TeamMembersView
          team={activeTeam}
          members={teamMembers ?? []}
          isLoading={isMembersLoading}
        />
      )}

      {/* ── Onboarding Wizard ── */}
      <CompanyOnboardingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        company={wizardCompany}
        onComplete={(c) => {
          queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
          if (activeCompany?.id === c.id) {
            queryClient.invalidateQueries({ queryKey: ["super-admin-company-detail", c.id] });
          }
        }}
      />

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" />
              Delete {deletingCompany?.name}?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes the company record. Teams will be unlinked but not deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteCompany.isPending}
              onClick={() => deletingCompany && deleteCompany.mutate(deletingCompany.id)}
            >
              {deleteCompany.isPending ? "Deleting…" : "Delete Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Settings Dialog ── */}
      {settingsCompany && (
        <CompanySettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          company={settingsCompany}
          currentSettings={companySettings ?? {}}
          onSave={(settings) => {
            api.patch(`/companies/${settingsCompany.id}/settings/`, settings)
              .then(() => {
                toast.success("Settings saved");
                queryClient.invalidateQueries({ queryKey: ["super-admin-company-settings", settingsCompany.id] });
              })
              .catch((err) => toast.error(toErrorMessage(err, "Failed to save settings")));
          }}
        />
      )}
    </div>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AdminCompany["onboarding_status"], {
  border: string; icon: string; iconBg: string; dot: string;
}> = {
  active:      { border: "border-t-2 border-t-emerald-500", icon: "text-emerald-600", iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900", dot: "bg-emerald-500" },
  in_progress: { border: "border-t-2 border-t-violet-500",  icon: "text-violet-600",  iconBg: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900",   dot: "bg-violet-500" },
  pending:     { border: "border-t-2 border-t-slate-400",   icon: "text-slate-500",   iconBg: "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700",         dot: "bg-slate-400" },
  suspended:   { border: "border-t-2 border-t-rose-500",    icon: "text-rose-600",    iconBg: "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900",             dot: "bg-rose-500" },
};

function CompanyCard({
  company, onDrilldown, onEdit, onDelete, onStatusChange,
}: {
  company: AdminCompany;
  onDrilldown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: AdminCompany["onboarding_status"]) => void;
}) {
  const cfg = STATUS_CONFIG[company.onboarding_status] ?? STATUS_CONFIG.pending;
  return (
    <div className={`flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all ${cfg.border}`}>
      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <Building2 size={18} className={cfg.icon} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{company.name}</p>
              <p className="text-[11px] text-muted-foreground/70 font-mono">/{company.slug}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDrilldown} className="gap-2">
                <ChevronRight size={14} /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Pencil size={14} /> Edit / Onboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {company.onboarding_status !== "active" && (
                <DropdownMenuItem onClick={() => onStatusChange("active")} className="gap-2 text-emerald-600 focus:text-emerald-600">
                  <CheckCircle2 size={14} /> Mark Active
                </DropdownMenuItem>
              )}
              {company.onboarding_status !== "suspended" && (
                <DropdownMenuItem onClick={() => onStatusChange("suspended")} className="gap-2 text-rose-600 focus:text-rose-600">
                  <Pause size={14} /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 size={14} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badge + domain */}
        <div className="flex items-center gap-2 flex-wrap">
          <OnboardingStatusBadge status={company.onboarding_status} />
          {company.email_domain && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
              <Globe size={9} />
              {company.email_domain}
              {company.email_domain_verified && <Shield size={9} className="text-emerald-500" />}
            </div>
          )}
        </div>

        {/* CEO row — neutral, no amber tint */}
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 border border-border px-3 py-2.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${company.ceo ? "bg-violet-100 dark:bg-violet-900/40" : "bg-muted"}`}>
            <Crown size={11} className={company.ceo ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground/40"} />
          </div>
          {company.ceo ? (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{company.ceo.full_name || company.ceo.email}</p>
              {company.ceo.full_name && <p className="text-[10px] text-muted-foreground truncate">{company.ceo.email}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No CEO assigned</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Layers size={11} className="text-muted-foreground/60" />{company.team_count} teams</span>
          <span className="w-px h-3 bg-border" />
          <span className="flex items-center gap-1.5"><Users size={11} className="text-muted-foreground/60" />{company.member_count} members</span>
          {company.pending_invites_count > 0 && (
            <>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><Clock size={11} />{company.pending_invites_count} pending</span>
            </>
          )}
        </div>
      </div>

      {/* Drilldown CTA */}
      <button
        onClick={onDrilldown}
        className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/10 hover:bg-muted/40 transition-colors text-xs font-medium text-muted-foreground hover:text-foreground group"
      >
        <span className="flex items-center gap-1.5">
          <Layers size={11} />
          View teams & members
        </span>
        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

// ─── Company Detail View ───────────────────────────────────────────────────────

function CompanyDetailView({
  company, detail, isLoading,
  onOpenTeamMembers, onEdit, onOpenSettings, onStatusChange,
}: {
  company: AdminCompany;
  detail: AdminCompanyDetail | null;
  isLoading: boolean;
  onOpenTeamMembers: (t: Team) => void;
  onEdit: () => void;
  onOpenSettings: () => void;
  onStatusChange: (s: AdminCompany["onboarding_status"]) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left: Company info */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <Building2 size={20} className="text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">{company.name}</CardTitle>
                <p className="text-xs text-muted-foreground">/{company.slug}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Edit / continue onboarding">
                <Pencil size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onOpenSettings} title="Company settings">
                <Settings2 size={14} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <OnboardingStatusBadge status={company.onboarding_status} />

          {/* CEO */}
          <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Crown size={10} className="text-violet-500" /> CEO
            </p>
            {company.ceo ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
                  {(company.ceo.full_name || company.ceo.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{company.ceo.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{company.ceo.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not assigned</p>
            )}
          </div>

          {/* Details grid */}
          <div className="space-y-2">
            {company.website && (
              <DetailRow label="Website">
                {company.website === "[RESTRICTED]" ? (
                  <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <Shield size={11} className="text-violet-500" /> Restricted to Super Admin
                  </span>
                ) : (
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    {company.website} <ExternalLink size={10} />
                  </a>
                )}
              </DetailRow>
            )}
            {company.industry && <DetailRow label="Industry"><span className="text-xs capitalize">{company.industry.replace("_", " ")}</span></DetailRow>}
            {company.size && <DetailRow label="Size"><span className="text-xs">{company.size} employees</span></DetailRow>}
            {company.country && <DetailRow label="Country"><span className="text-xs">{company.country}</span></DetailRow>}
            <DetailRow label="Created">
              <span className="text-xs text-muted-foreground">{new Date(company.created_at).toLocaleDateString()}</span>
            </DetailRow>
          </div>

          {/* Domain */}
          {company.email_domain && (
            <div className="rounded-xl border border-border px-3 py-2.5 space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <Globe size={10} /> Email Domain
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono">@{company.email_domain}</p>
                {company.email_domain_verified ? (
                  <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0">Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600">Unverified</Badge>
                )}
              </div>
            </div>
          )}

          {/* Status actions */}
          <div className="pt-1 space-y-2">
            {company.onboarding_status !== "active" && (
              <Button size="sm" variant="outline" className="w-full gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30" onClick={() => onStatusChange("active")}>
                <CheckCircle2 size={13} /> Mark Active
              </Button>
            )}
            {company.onboarding_status !== "suspended" && (
              <Button size="sm" variant="outline" className="w-full gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-400 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/20" onClick={() => onStatusChange("suspended")}>
                <Pause size={13} /> Suspend
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Teams */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Layers size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              Teams
            </CardTitle>
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 font-bold">
              {detail?.teams?.length ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : !detail || detail.teams.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <div className="p-3 rounded-xl bg-muted/60">
                <Layers size={24} className="text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">No teams yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Teams are created by the company Admin via the company dashboard.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.teams.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                  onClick={() => onOpenTeamMembers(t)}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                    <Layers size={15} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.member_count ?? 0} members · <span className="capitalize">{t.plan ?? "free"}</span></p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">View members</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-muted-foreground/40 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Team Members View ────────────────────────────────────────────────────────

function TeamMembersView({ team, members, isLoading }: {
  team: Team;
  members: TeamMember[];
  isLoading: boolean;
}) {
  const ROLE_COLORS: Record<string, string> = {
    ceo: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    member: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users size={14} className="text-primary" />
            </div>
            {team.name}
            <span className="text-muted-foreground font-normal">— Members</span>
          </CardTitle>
          <Badge className="bg-primary/10 text-primary border-0 font-bold">{members.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <div className="p-3 rounded-xl bg-muted/60">
              <Users size={24} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer}`}>
                  {(m.user.full_name || m.user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.user.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer}`}>
                    {m.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Company Settings Dialog ──────────────────────────────────────────────────

function CompanySettingsDialog({
  open, onOpenChange, company, currentSettings, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: AdminCompanyDetail;
  currentSettings: Record<string, unknown>;
  onSave: (settings: Record<string, unknown>) => void;
}) {
  const [aiEnabled, setAiEnabled] = useState(Boolean(currentSettings?.ai_enabled));
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    currentSettings?.notifications_enabled !== false
  );
  const [auditRetentionDays, setAuditRetentionDays] = useState(
    String(currentSettings?.audit_retention_days ?? 365)
  );
  const [maxMembers, setMaxMembers] = useState(
    String(currentSettings?.max_members ?? "")
  );
  const [allowedPlans, setAllowedPlans] = useState<string>(
    String(currentSettings?.allowed_plan ?? "free")
  );

  useEffect(() => {
    setAiEnabled(Boolean(currentSettings?.ai_enabled));
    setNotificationsEnabled(currentSettings?.notifications_enabled !== false);
    setAuditRetentionDays(String(currentSettings?.audit_retention_days ?? 365));
    setMaxMembers(String(currentSettings?.max_members ?? ""));
    setAllowedPlans(String(currentSettings?.allowed_plan ?? "free"));
  }, [currentSettings]);

  const handleSave = () => {
    onSave({
      ai_enabled: aiEnabled,
      notifications_enabled: notificationsEnabled,
      audit_retention_days: parseInt(auditRetentionDays) || 365,
      max_members: maxMembers ? parseInt(maxMembers) : null,
      allowed_plan: allowedPlans,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 size={16} />
            {company.name} — Settings
          </DialogTitle>
          <DialogDescription>Configure platform behavior for this company.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SettingRow
            label="AI Features"
            description="Enable AI-powered task suggestions and daily briefings"
            control={<Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />}
          />
          <SettingRow
            label="Notifications"
            description="Enable in-app and email notifications"
            control={<Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default Team Plan</label>
            <p className="text-xs text-muted-foreground">New teams created under this company use this plan.</p>
            <select
              value={allowedPlans}
              onChange={(e) => setAllowedPlans(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="ai">AI</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Members <span className="text-muted-foreground font-normal text-xs">(leave blank for unlimited)</span></label>
            <Input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="e.g. 500"
              min="1"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Audit Log Retention (days)</label>
            <Input
              type="number"
              value={auditRetentionDays}
              onChange={(e) => setAuditRetentionDays(e.target.value)}
              placeholder="365"
              min="30"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function StatusChip({
  label, count, active, onClick, color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick?: () => void;
  color: "default" | "success" | "info" | "muted";
}) {
  const baseClass = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border cursor-pointer select-none";
  const colorMap = {
    default: active
      ? "bg-foreground text-background border-foreground shadow-sm"
      : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
    success: active
      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
      : "bg-background text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400",
    info: active
      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
      : "bg-background text-muted-foreground border-border hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-400",
    muted: active
      ? "bg-slate-600 text-white border-slate-600 shadow-sm"
      : "bg-background text-muted-foreground border-border hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-400",
  };
  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${colorMap[color]}`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
    </button>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function SettingRow({
  label, description, control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}
