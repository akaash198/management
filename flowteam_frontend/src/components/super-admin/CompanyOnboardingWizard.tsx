"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ApiResponse, Team } from "@/types";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Crown,
  Layers,
  Globe,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Mail,
  Shield,
  Info,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
};

export type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  website: string;
  industry: string;
  size: string;
  country: string;
  logo_url: string | null;
  email_domain: string;
  email_domain_verified: boolean;
  onboarding_status: "pending" | "in_progress" | "active" | "suspended";
  onboarding_completed_at: string | null;
  notes: string;
  ceo: { id: string; email: string; full_name: string } | null;
  team_count: number;
  member_count: number;
  pending_invites_count: number;
  created_at: string;
  updated_at: string;
};

type WizardStep = "company_details" | "ceo_assignment" | "teams_setup" | "email_domain" | "review";

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: "company_details", label: "Company Details", icon: <Building2 size={16} /> },
  { key: "ceo_assignment", label: "CEO Assignment", icon: <Crown size={16} /> },
  { key: "teams_setup", label: "Teams Setup", icon: <Layers size={16} /> },
  { key: "email_domain", label: "Email Domain", icon: <Globe size={16} /> },
  { key: "review", label: "Review & Launch", icon: <CheckCircle2 size={16} /> },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select industry" },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "media", label: "Media & Entertainment" },
  { value: "consulting", label: "Consulting" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface CompanyOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: AdminCompany | null;
  onComplete: (company: AdminCompany) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyOnboardingWizard({
  open,
  onOpenChange,
  company,
  onComplete,
}: CompanyOnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>("company_details");
  const [savedCompany, setSavedCompany] = useState<AdminCompany | null>(company);

  // Step 1 — Company Details
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2 — CEO Assignment
  const [ceoSearch, setCeoSearch] = useState("");
  const [selectedCeoId, setSelectedCeoId] = useState<string | null>(null);
  const [selectedCeoEmail, setSelectedCeoEmail] = useState("");
  const [inviteCeoEmail, setInviteCeoEmail] = useState("");
  const [ceoMode, setCeoMode] = useState<"select" | "invite">("select");

  // Step 3 — Teams Setup
  const [newTeamName, setNewTeamName] = useState("");
  const [teamNamesToCreate, setTeamNamesToCreate] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Step 4 — Email Domain
  const [emailDomain, setEmailDomain] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [verificationInstructions, setVerificationInstructions] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [enableEmailDomain, setEnableEmailDomain] = useState(false);

  // Shared
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Reset wizard when opening for a new company
  useEffect(() => {
    if (open) {
      setSavedCompany(company);
      if (company) {
        setName(company.name || "");
        setWebsite(company.website || "");
        setIndustry(company.industry || "");
        setSize(company.size || "");
        setCountry(company.country || "");
        setNotes(company.notes || "");
        setSelectedCeoId(company.ceo?.id || null);
        setSelectedCeoEmail(company.ceo?.email || "");
        setCeoSearch(company.ceo?.email || "");
        setEmailDomain(company.email_domain || "");
        setDomainVerified(company.email_domain_verified || false);
        setEnableEmailDomain(!!company.email_domain);
        // Determine resume step
        const statusStepMap: Record<string, WizardStep> = {
          pending: "company_details",
          in_progress: "ceo_assignment",
          active: "review",
        };
        setCurrentStep(statusStepMap[company.onboarding_status] ?? "company_details");
      } else {
        resetAll();
      }
    }
  }, [open, company]);

  const resetAll = () => {
    setCurrentStep("company_details");
    setName(""); setWebsite(""); setIndustry(""); setSize(""); setCountry(""); setNotes("");
    setCeoSearch(""); setSelectedCeoId(null); setSelectedCeoEmail(""); setInviteCeoEmail("");
    setCeoMode("select");
    setTeamNamesToCreate([]); setSelectedTeamIds([]); setNewTeamName("");
    setEmailDomain(""); setDomainVerified(false); setVerificationInstructions("");
    setVerificationToken(""); setEnableEmailDomain(false);
    setSavedCompany(null);
  };

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: usersSearchResults } = useQuery<AdminUser[]>({
    queryKey: ["super-admin-users-search-wizard", ceoSearch],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>("/super-admin/users/", {
        params: ceoSearch.trim() ? { q: ceoSearch.trim() } : {},
      });
      return res.data.data ?? [];
    },
    enabled: ceoMode === "select" && ceoSearch.trim().length > 1,
    staleTime: 10_000,
  });

  const { data: allTeams } = useQuery<Team[]>({
    queryKey: ["super-admin-all-teams"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Team[]>>("/teams/");
      return res.data.data ?? [];
    },
  });

  const unassignedTeams = (allTeams ?? []).filter(
    (t) => !t.company_id || (savedCompany && t.company_id === savedCompany.id)
  );

  // ── Mutations ────────────────────────────────────────────────────────────

  // Used only when editing an already-created company (resuming onboarding).
  const submitStep = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const cid = savedCompany!.id;
      const res = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setSavedCompany(data);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-company-detail", data.id] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to save step")),
  });

  // Single mutation that runs on "Launch Company" — creates + fully onboards in one go.
  const launchCompany = useMutation({
    mutationFn: async () => {
      let company = savedCompany;

      // 1. Create the company record if this is a new onboarding.
      if (!company) {
        const res = await api.post<ApiResponse<AdminCompany>>("/companies/", { name: name.trim() });
        company = res.data.data;
      }
      const cid = company.id;

      // 2. Submit each step sequentially.
      const detailsRes = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, {
        step: "company_details",
        name: name.trim(), website, industry, size, country, notes,
      });
      company = detailsRes.data.data;

      const ceoPayload: Record<string, unknown> = { step: "ceo_assignment" };
      if (ceoMode === "select" && selectedCeoId) ceoPayload.ceo_id = selectedCeoId;
      if (ceoMode === "invite" && inviteCeoEmail.trim()) ceoPayload.invite_ceo_email = inviteCeoEmail.trim();
      const ceoRes = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, ceoPayload);
      company = ceoRes.data.data;

      const teamsRes = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, {
        step: "teams_setup",
        team_names: teamNamesToCreate,
        team_ids: selectedTeamIds,
      });
      company = teamsRes.data.data;

      const domainRes = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, {
        step: "email_domain",
        email_domain: enableEmailDomain ? emailDomain.trim() : "",
      });
      company = domainRes.data.data;

      // 3. Final review step — marks status as "active".
      const reviewRes = await api.post<ApiResponse<AdminCompany>>(`/companies/${cid}/onboarding/`, { step: "review" });
      return reviewRes.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-company-detail", data.id] });
      toast.success(`${data.name} is now active!`);
      onComplete(data);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to create company")),
  });

  const verifyDomain = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{
        email_domain: string;
        email_domain_verified: boolean;
        verification_token?: string;
        instructions?: string;
      }>>(`/companies/${savedCompany!.id}/verify-domain/`, { confirmed: false });
      return res.data.data;
    },
    onSuccess: (data) => {
      setVerificationToken(data.verification_token || "");
      setVerificationInstructions(data.instructions || "");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to get domain instructions")),
  });

  const confirmDomain = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ email_domain_verified: boolean }>>(`/companies/${savedCompany!.id}/verify-domain/`, { confirmed: true });
      return res.data.data;
    },
    onSuccess: (data) => {
      setDomainVerified(data.email_domain_verified);
      if (data.email_domain_verified) toast.success("Domain verified successfully");
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Domain verification failed")),
  });

  // ── Step Handlers ─────────────────────────────────────────────────────────

  const handleNext = async () => {
    // Steps 1–4: pure client-side navigation — just validate and advance.
    if (currentStep === "company_details") {
      if (!name.trim()) { toast.error("Company name is required"); return; }
      // If resuming an existing company, persist step 1 immediately.
      if (savedCompany) {
        try {
          await submitStep.mutateAsync({ step: "company_details", name: name.trim(), website, industry, size, country, notes });
        } catch { return; }
      }
    } else if (currentStep === "review") {
      // Final step: create + onboard everything in one shot.
      if (savedCompany) {
        // Resuming — submit remaining steps then finalize.
        try {
          const ceoPayload: Record<string, unknown> = { step: "ceo_assignment" };
          if (ceoMode === "select" && selectedCeoId) ceoPayload.ceo_id = selectedCeoId;
          if (ceoMode === "invite" && inviteCeoEmail.trim()) ceoPayload.invite_ceo_email = inviteCeoEmail.trim();
          await submitStep.mutateAsync(ceoPayload);
          await submitStep.mutateAsync({ step: "teams_setup", team_names: teamNamesToCreate, team_ids: selectedTeamIds });
          await submitStep.mutateAsync({ step: "email_domain", email_domain: enableEmailDomain ? emailDomain.trim() : "" });
          await submitStep.mutateAsync({ step: "review" });
          toast.success(`${savedCompany.name} is now active!`);
          onComplete(savedCompany);
          onOpenChange(false);
        } catch { /* handled by mutation */ }
        return;
      }
      // New company: launch everything atomically.
      launchCompany.mutate();
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].key);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1].key);
  };

  const isLoading = submitStep.isPending || launchCompany.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-background to-muted/30">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {savedCompany ? `Onboarding: ${savedCompany.name}` : "New Company Onboarding"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Step {currentStepIndex + 1} of {STEPS.length} — {STEPS[currentStepIndex].label}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => i <= currentStepIndex && setCurrentStep(s.key)}
                  disabled={i > currentStepIndex}
                  className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-1.5 px-1 transition-colors text-[10px] font-medium
                    ${s.key === currentStep
                      ? "bg-primary/10 text-primary"
                      : i < currentStepIndex
                        ? "text-muted-foreground hover:bg-muted/60 cursor-pointer"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                >
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full border text-[10px]
                    ${s.key === currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : i < currentStepIndex
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-border"
                    }`}>
                    {i < currentStepIndex ? <Check size={10} /> : i + 1}
                  </span>
                  <span className="hidden sm:block truncate w-full text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-5 min-h-[340px] max-h-[480px] overflow-y-auto">
          {currentStep === "company_details" && (
            <StepCompanyDetails
              name={name} setName={setName}
              website={website} setWebsite={setWebsite}
              industry={industry} setIndustry={setIndustry}
              size={size} setSize={setSize}
              country={country} setCountry={setCountry}
              notes={notes} setNotes={setNotes}
            />
          )}
          {currentStep === "ceo_assignment" && (
            <StepCEOAssignment
              ceoMode={ceoMode} setCeoMode={setCeoMode}
              ceoSearch={ceoSearch} setCeoSearch={setCeoSearch}
              selectedCeoId={selectedCeoId} setSelectedCeoId={setSelectedCeoId}
              selectedCeoEmail={selectedCeoEmail} setSelectedCeoEmail={setSelectedCeoEmail}
              inviteCeoEmail={inviteCeoEmail} setInviteCeoEmail={setInviteCeoEmail}
              searchResults={usersSearchResults ?? []}
              currentCeo={savedCompany?.ceo ?? null}
            />
          )}
          {currentStep === "teams_setup" && (
            <StepTeamsSetup
              newTeamName={newTeamName} setNewTeamName={setNewTeamName}
              teamNamesToCreate={teamNamesToCreate} setTeamNamesToCreate={setTeamNamesToCreate}
              selectedTeamIds={selectedTeamIds} setSelectedTeamIds={setSelectedTeamIds}
              availableTeams={unassignedTeams}
              existingTeams={savedCompany?.team_count ? [] : []}
            />
          )}
          {currentStep === "email_domain" && (
            <StepEmailDomain
              enableEmailDomain={enableEmailDomain} setEnableEmailDomain={setEnableEmailDomain}
              emailDomain={emailDomain} setEmailDomain={setEmailDomain}
              domainVerified={domainVerified}
              verificationToken={verificationToken}
              verificationInstructions={verificationInstructions}
              onGetInstructions={() => verifyDomain.mutate()}
              onConfirmVerification={() => confirmDomain.mutate()}
              isLoadingInstructions={verifyDomain.isPending}
              isConfirming={confirmDomain.isPending}
              companyId={savedCompany?.id}
            />
          )}
          {currentStep === "review" && (
            <StepReview
              name={name}
              website={website}
              industry={industry}
              size={size}
              country={country}
              company={savedCompany}
              teamNamesToCreate={teamNamesToCreate}
              selectedTeamIds={selectedTeamIds}
              allTeams={allTeams ?? []}
              ceoMode={ceoMode}
              selectedCeoEmail={selectedCeoEmail}
              inviteCeoEmail={inviteCeoEmail}
              enableEmailDomain={enableEmailDomain}
              emailDomain={emailDomain}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isLoading}
            className="gap-2"
          >
            <ChevronLeft size={14} />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {savedCompany && currentStep !== "review" && (
              <OnboardingStatusBadge status={savedCompany.onboarding_status} />
            )}
            <Button
              onClick={handleNext}
              disabled={isLoading || (currentStep === "company_details" && !name.trim())}
              className="gap-2 min-w-[130px]"
            >
              {isLoading ? (
                <><Loader2 size={14} className="animate-spin" /> {currentStep === "review" ? "Launching…" : "Saving…"}</>
              ) : currentStep === "review" ? (
                <><CheckCircle2 size={14} /> Launch Company</>
              ) : (
                <>Continue <ChevronRight size={14} /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Company Details ─────────────────────────────────────────────────

function StepCompanyDetails({
  name, setName, website, setWebsite,
  industry, setIndustry, size, setSize,
  country, setCountry, notes, setNotes,
}: {
  name: string; setName: (v: string) => void;
  website: string; setWebsite: (v: string) => void;
  industry: string; setIndustry: (v: string) => void;
  size: string; setSize: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Building2 size={18} className="text-primary" />}
        title="Company Details"
        description="Basic information about the company being onboarded."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="co-name">Company name <span className="text-destructive">*</span></Label>
          <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corporation" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="co-website">Website</Label>
          <Input id="co-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" type="url" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="co-country">Country</Label>
          <Input id="co-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="co-industry">Industry</Label>
          <select
            id="co-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="co-size">Company size</Label>
          <select
            id="co-size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="co-notes">Internal notes <span className="text-xs text-muted-foreground">(super-admin only)</span></Label>
          <Textarea id="co-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this company…" rows={2} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: CEO Assignment ───────────────────────────────────────────────────

function StepCEOAssignment({
  ceoMode, setCeoMode,
  ceoSearch, setCeoSearch,
  selectedCeoId, setSelectedCeoId,
  selectedCeoEmail, setSelectedCeoEmail,
  inviteCeoEmail, setInviteCeoEmail,
  searchResults,
  currentCeo,
}: {
  ceoMode: "select" | "invite";
  setCeoMode: (v: "select" | "invite") => void;
  ceoSearch: string; setCeoSearch: (v: string) => void;
  selectedCeoId: string | null; setSelectedCeoId: (v: string | null) => void;
  selectedCeoEmail: string; setSelectedCeoEmail: (v: string) => void;
  inviteCeoEmail: string; setInviteCeoEmail: (v: string) => void;
  searchResults: AdminUser[];
  currentCeo: { id: string; email: string; full_name: string } | null;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Crown size={18} className="text-amber-500" />}
        title="CEO Assignment"
        description="The CEO has full admin access to all teams within this company."
      />

      {currentCeo && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <Crown size={14} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium">{currentCeo.full_name || currentCeo.email}</p>
            <p className="text-xs text-muted-foreground">{currentCeo.email} · Current CEO</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">Active</Badge>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setCeoMode("select")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${ceoMode === "select" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-muted-foreground"}`}
        >
          Select existing user
        </button>
        <button
          onClick={() => setCeoMode("invite")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${ceoMode === "invite" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-muted-foreground"}`}
        >
          Invite new user
        </button>
      </div>

      {ceoMode === "select" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Search users</Label>
            <div className="relative">
              <Input
                value={ceoSearch}
                onChange={(e) => { setCeoSearch(e.target.value); setSelectedCeoId(null); setSelectedCeoEmail(""); }}
                placeholder="Search by name or email…"
                autoComplete="off"
              />
              {ceoSearch.trim().length > 1 && !selectedCeoId && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="max-h-48 overflow-auto">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">No users found.</div>
                    ) : searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedCeoId(u.id);
                          setSelectedCeoEmail(u.email);
                          setCeoSearch(u.email);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {u.is_staff && <Badge variant="outline" className="ml-auto text-[10px] shrink-0">Staff</Badge>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {selectedCeoId && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-3 py-2">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">Selected: <span className="font-medium">{selectedCeoEmail}</span></p>
                <button onClick={() => { setSelectedCeoId(null); setSelectedCeoEmail(""); setCeoSearch(""); }} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>CEO email address</Label>
            <Input
              type="email"
              value={inviteCeoEmail}
              onChange={(e) => setInviteCeoEmail(e.target.value)}
              placeholder="ceo@company.com"
            />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              An invitation email will be sent when you proceed. The user must register with this email address.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Teams Setup ─────────────────────────────────────────────────────

function StepTeamsSetup({
  newTeamName, setNewTeamName,
  teamNamesToCreate, setTeamNamesToCreate,
  selectedTeamIds, setSelectedTeamIds,
  availableTeams,
}: {
  newTeamName: string; setNewTeamName: (v: string) => void;
  teamNamesToCreate: string[]; setTeamNamesToCreate: (v: string[]) => void;
  selectedTeamIds: string[]; setSelectedTeamIds: (v: string[]) => void;
  availableTeams: Team[];
  existingTeams: Team[];
}) {
  const addTeamName = () => {
    const t = newTeamName.trim();
    if (t && !teamNamesToCreate.includes(t)) {
      setTeamNamesToCreate([...teamNamesToCreate, t]);
      setNewTeamName("");
    }
  };

  const toggleTeamId = (id: string) => {
    setSelectedTeamIds(
      selectedTeamIds.includes(id)
        ? selectedTeamIds.filter((x) => x !== id)
        : [...selectedTeamIds, id]
    );
  };

  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Layers size={18} className="text-blue-500" />}
        title="Teams Setup"
        description="Create new teams or assign existing unlinked teams to this company."
      />

      {/* Create new teams */}
      <div className="space-y-3">
        <Label>Create new teams</Label>
        <div className="flex gap-2">
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeamName())}
            placeholder="Engineering, Marketing, Sales…"
          />
          <Button type="button" size="sm" variant="outline" onClick={addTeamName} disabled={!newTeamName.trim()}>
            <Plus size={14} />
          </Button>
        </div>
        {teamNamesToCreate.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {teamNamesToCreate.map((t) => (
              <div key={t} className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-3 py-1 text-sm">
                <Layers size={12} className="text-blue-500" />
                <span className="text-blue-700 dark:text-blue-400">{t}</span>
                <button onClick={() => setTeamNamesToCreate(teamNamesToCreate.filter((x) => x !== t))}>
                  <X size={12} className="text-blue-400 hover:text-blue-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Assign existing teams */}
      <div className="space-y-3">
        <Label>Assign existing teams</Label>
        {availableTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No unassigned teams available.</p>
        ) : (
          <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
            {availableTeams.map((t) => {
              const checked = selectedTeamIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTeamId(t.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    checked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-border"}`}>
                    {checked && <Check size={10} className="text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.member_count} members · {t.plan ?? "free"}</p>
                  </div>
                  {t.company_id && <Badge variant="outline" className="text-[10px] shrink-0">Already linked</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(teamNamesToCreate.length > 0 || selectedTeamIds.length > 0) && (
        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{teamNamesToCreate.length}</span> team(s) to create ·{" "}
          <span className="font-medium text-foreground">{selectedTeamIds.length}</span> existing team(s) to assign
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Email Domain ────────────────────────────────────────────────────

function StepEmailDomain({
  enableEmailDomain, setEnableEmailDomain,
  emailDomain, setEmailDomain,
  domainVerified,
  verificationToken,
  verificationInstructions,
  onGetInstructions,
  onConfirmVerification,
  isLoadingInstructions,
  isConfirming,
  companyId,
}: {
  enableEmailDomain: boolean; setEnableEmailDomain: (v: boolean) => void;
  emailDomain: string; setEmailDomain: (v: string) => void;
  domainVerified: boolean;
  verificationToken: string;
  verificationInstructions: string;
  onGetInstructions: () => void;
  onConfirmVerification: () => void;
  isLoadingInstructions: boolean;
  isConfirming: boolean;
  companyId?: string;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Globe size={18} className="text-green-500" />}
        title="Email Domain Configuration"
        description="Allow users with a specific email domain to automatically join this company's teams."
      />

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Enable email domain restriction</p>
          <p className="text-xs text-muted-foreground">Users matching this domain can auto-join</p>
        </div>
        <Switch checked={enableEmailDomain} onCheckedChange={setEnableEmailDomain} />
      </div>

      {enableEmailDomain && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company email domain</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value.replace(/^@/, "").toLowerCase())}
                  placeholder="acme.com"
                  className="pl-7"
                />
              </div>
              {domainVerified ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-3 text-sm text-green-700 dark:text-green-400 shrink-0">
                  <CheckCircle2 size={14} />
                  Verified
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGetInstructions}
                  disabled={!emailDomain.trim() || isLoadingInstructions || !companyId}
                >
                  {isLoadingInstructions ? <Loader2 size={14} className="animate-spin" /> : "Get DNS instructions"}
                </Button>
              )}
            </div>
          </div>

          {!domainVerified && verificationInstructions && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">DNS Verification Required</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-500">{verificationInstructions}</p>
                <div className="rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-2 font-mono text-xs break-all select-all">
                  flowteam-verification={verificationToken}
                </div>
              </div>
              <Button
                size="sm"
                onClick={onConfirmVerification}
                disabled={isConfirming}
                className="w-full gap-2"
              >
                {isConfirming ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                {isConfirming ? "Verifying…" : "I've added the DNS record — verify now"}
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
              <p>Users registering with a <strong>@{emailDomain || "your-domain.com"}</strong> email will be flagged for auto-approval into this company's teams.</p>
              <p>Domain verification uses a DNS TXT record to prove ownership.</p>
            </div>
          </div>
        </div>
      )}

      {!enableEmailDomain && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border px-3 py-2.5">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">You can configure this later from the company settings. Skip this step for now.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review & Launch ─────────────────────────────────────────────────

function StepReview({
  name, website, industry, size, country,
  company, teamNamesToCreate, selectedTeamIds, allTeams,
  ceoMode, selectedCeoEmail, inviteCeoEmail, enableEmailDomain, emailDomain,
}: {
  name: string; website: string; industry: string; size: string; country: string;
  company: AdminCompany | null;
  teamNamesToCreate: string[];
  selectedTeamIds: string[];
  allTeams: Team[];
  ceoMode: "select" | "invite";
  selectedCeoEmail: string;
  inviteCeoEmail: string;
  enableEmailDomain: boolean;
  emailDomain: string;
}) {
  const assignedTeams = allTeams.filter((t) => selectedTeamIds.includes(t.id));
  const displayName = name || company?.name || "—";
  const displayWebsite = website || company?.website || "";
  const displayIndustry = industry || company?.industry || "";
  const displaySize = size || company?.size || "";
  const displayCountry = country || company?.country || "";

  const INDUSTRY_LABELS: Record<string, string> = {
    technology: "Technology", finance: "Finance", healthcare: "Healthcare",
    education: "Education", retail: "Retail", manufacturing: "Manufacturing",
    media: "Media & Entertainment", consulting: "Consulting",
    real_estate: "Real Estate", other: "Other",
  };

  return (
    <div className="space-y-4">
      <StepHeader
        icon={<CheckCircle2 size={18} className="text-green-500" />}
        title="Review & Launch"
        description="Confirm all details before activating this company."
      />

      <div className="space-y-2.5">
        {/* Company info */}
        <ReviewSection title="Company" icon={<Building2 size={13} />}>
          <ReviewRow label="Name" value={displayName} />
          {displayWebsite && <ReviewRow label="Website" value={displayWebsite} />}
          {displayIndustry && <ReviewRow label="Industry" value={INDUSTRY_LABELS[displayIndustry] ?? displayIndustry} />}
          {displaySize && <ReviewRow label="Size" value={displaySize} />}
          {displayCountry && <ReviewRow label="Country" value={displayCountry} />}
        </ReviewSection>

        {/* CEO */}
        <ReviewSection title="CEO" icon={<Crown size={13} className="text-amber-500" />}>
          {company?.ceo ? (
            <>
              <ReviewRow label="Name" value={company.ceo.full_name || "—"} />
              <ReviewRow label="Email" value={company.ceo.email} />
              <ReviewRow label="Status" value="Active" highlight="success" />
            </>
          ) : ceoMode === "select" && selectedCeoEmail ? (
            <ReviewRow label="Selected user" value={selectedCeoEmail} highlight="success" />
          ) : ceoMode === "invite" && inviteCeoEmail ? (
            <ReviewRow label="Invite will be sent to" value={inviteCeoEmail} highlight="warning" />
          ) : (
            <p className="text-xs text-muted-foreground italic">No CEO assigned — you can add one later.</p>
          )}
        </ReviewSection>

        {/* Teams */}
        <ReviewSection title="Teams" icon={<Layers size={13} className="text-blue-500" />}>
          {teamNamesToCreate.length === 0 && selectedTeamIds.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No teams configured — Admin can create them after launch.</p>
          ) : (
            <>
              {teamNamesToCreate.map((n) => (
                <ReviewRow key={n} label="Will create" value={n} />
              ))}
              {assignedTeams.map((t) => (
                <ReviewRow key={t.id} label="Will assign" value={t.name} />
              ))}
            </>
          )}
        </ReviewSection>

        {/* Domain */}
        <ReviewSection title="Email Domain" icon={<Globe size={13} className="text-green-500" />}>
          {enableEmailDomain && emailDomain ? (
            <>
              <ReviewRow label="Domain" value={`@${emailDomain}`} />
              <ReviewRow
                label="Verification"
                value={company?.email_domain_verified ? "Verified ✓" : "Pending DNS setup"}
                highlight={company?.email_domain_verified ? "success" : "warning"}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Not configured — can be set up later.</p>
          )}
        </ReviewSection>
      </div>

      <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-4 py-3 flex items-start gap-2">
        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
        <p className="text-xs text-green-700 dark:text-green-400">
          Clicking <strong>Launch Company</strong> will create the company and set its status to <strong>Active</strong>. CEO invite and teams will be set up automatically.
        </p>
      </div>
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function StepHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ReviewSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="px-3 py-2 space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: "success" | "warning" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs font-medium truncate text-right ${
        highlight === "success" ? "text-green-600 dark:text-green-400"
        : highlight === "warning" ? "text-amber-600 dark:text-amber-400"
        : ""
      }`}>{value}</span>
    </div>
  );
}

export function OnboardingStatusBadge({ status }: { status: AdminCompany["onboarding_status"] }) {
  const map: Record<AdminCompany["onboarding_status"], { badge: string; dot: string }> = {
    pending:     { badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",     dot: "bg-amber-400" },
    in_progress: { badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",           dot: "bg-blue-500 animate-pulse" },
    active:      { badge: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",     dot: "bg-green-500" },
    suspended:   { badge: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",                 dot: "bg-red-500" },
  };
  const labels = { pending: "Pending", in_progress: "In Progress", active: "Active", suspended: "Suspended" };
  const { badge, dot } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {labels[status] ?? status}
    </span>
  );
}
