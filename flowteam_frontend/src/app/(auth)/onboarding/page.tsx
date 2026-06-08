"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera, Upload, X, Check, Users, ArrowRight, ArrowLeft,
  Building2, Globe, ChevronDown,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { detectAccountType } from "@/lib/accountType";

// ── Industry / size options (mirror backend choices) ──────────────────────────

const INDUSTRIES = [
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

const SIZES = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

const COMPANY_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
];

// ── Step label arrays ─────────────────────────────────────────────────────────

const INDIVIDUAL_STEPS = ["Your workspace", "Invite teammates"] as const;
const CORPORATE_STEPS = [
  "Account type",
  "Company profile",
  "Your workspace",
  "Domain setup",
  "Invite team",
] as const;

// ── Logo uploader (shared) ────────────────────────────────────────────────────

interface LogoUploaderProps {
  preview: string | null;
  initials: string;
  dragOver: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  label?: string;
}

function LogoUploader({
  preview, initials, dragOver,
  onFileChange, onDrop, onDragOver, onDragLeave, onClear,
  fileInputRef, label = "Logo",
}: LogoUploaderProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="relative group">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "h-24 w-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
            dragOver
              ? "border-primary bg-primary/10 scale-105"
              : preview
              ? "border-transparent"
              : "border-border hover:border-primary/60 hover:bg-muted/30 bg-muted/20"
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo preview" className="h-full w-full object-cover" />
          ) : initials ? (
            <div className="h-full w-full flex items-center justify-center bg-primary/10">
              <span className="text-3xl font-bold text-primary">{initials}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground px-2">
              <Upload className="h-5 w-5" />
              <span className="text-[11px] text-center leading-tight">Click or drag<br />to upload</span>
            </div>
          )}
        </div>
        {preview && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </div>
        )}
        {preview && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors z-10"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">PNG, JPG or GIF · Max 5 MB</p>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  );
}

// ── Select wrapper ────────────────────────────────────────────────────────────

function SelectField({ id, label, value, onChange, options }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 rounded-md border border-input bg-background px-3 pr-9 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Progress indicator ────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
              i < current
                ? "bg-primary border-primary text-primary-foreground"
                : i === current
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground bg-background"
            )}>
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-[11px] font-medium whitespace-nowrap",
              i === current ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "h-px w-12 mx-2 mb-5 transition-all",
              i < current ? "bg-primary" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/onboarding");
    }
  }, [isLoading, user, router]);

  // Detect account type from email (default individual until user is loaded)
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual");
  useEffect(() => {
    if (user?.email) {
      setAccountType(detectAccountType(user.email));
    }
  }, [user?.email]);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Shared state ──────────────────────────────────────────────────────────
  const teamFileRef = useRef<HTMLInputElement>(null);
  const companyFileRef = useRef<HTMLInputElement>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Team workspace (used by both paths)
  const [teamName, setTeamName] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const [teamDragOver, setTeamDragOver] = useState(false);

  // Company profile (corporate path only)
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [companyDragOver, setCompanyDragOver] = useState(false);
  const [companyNameError, setCompanyNameError] = useState("");

  // Domain setup (corporate path)
  const [domain, setDomain] = useState("");
  const [dnsRecord, setDnsRecord] = useState<{ token: string; host: string } | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainChecking, setDomainChecking] = useState(false);

  // Invite step (both paths)
  const [emails, setEmails] = useState<string[]>(["", "", ""]);
  const [inviteRoles, setInviteRoles] = useState<string[]>(["member", "member", "member"]);

  // ── File helpers ──────────────────────────────────────────────────────────

  const applyFile = (
    file: File,
    setFile: (f: File) => void,
    setPreview: (s: string) => void
  ) => {
    if (!file.type.startsWith("image/")) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleTeamFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) applyFile(f, setTeamLogoFile, setTeamLogoPreview);
  };
  const handleTeamDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setTeamDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) applyFile(f, setTeamLogoFile, setTeamLogoPreview);
  }, []);
  const clearTeamLogo = () => { setTeamLogoFile(null); setTeamLogoPreview(null); if (teamFileRef.current) teamFileRef.current.value = ""; };

  const handleCompanyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) applyFile(f, setCompanyLogoFile, setCompanyLogoPreview);
  };
  const handleCompanyDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setCompanyDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) applyFile(f, setCompanyLogoFile, setCompanyLogoPreview);
  }, []);
  const clearCompanyLogo = () => { setCompanyLogoFile(null); setCompanyLogoPreview(null); if (companyFileRef.current) companyFileRef.current.value = ""; };

  // ── Derived initials ──────────────────────────────────────────────────────

  const initials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  // ── Step actions ──────────────────────────────────────────────────────────

  // Corporate Step 1: create company
  const handleCreateCompany = async () => {
    if (!companyName.trim()) { setCompanyNameError("Company name is required."); return; }
    setCompanyNameError("");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", companyName.trim());
      if (industry) form.append("industry", industry);
      if (companySize) form.append("size", companySize);
      if (country) form.append("country", country);
      if (companyLogoFile) form.append("logo", companyLogoFile);

      const res = await api.post("/companies/create-for-onboarding/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setCompanyId(res.data.data.id);
        setStep(2);
      }
    } catch {
      setCompanyNameError("Failed to create company. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Both paths: create team workspace
  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/teams/", { name: teamName.trim() });
      if (!res.data.success) return;
      const id: string = res.data.data.id;
      setTeamId(id);

      if (teamLogoFile) {
        const form = new FormData();
        form.append("avatar", teamLogoFile);
        await api.patch(`/teams/${id}/`, form, { headers: { "Content-Type": "multipart/form-data" } });
      }

      // Link team to company when on corporate path
      if (accountType === "corporate" && companyId) {
        await api.patch(`/teams/${id}/`, { company: companyId });
      }

      setStep(accountType === "corporate" ? 3 : 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Corporate Step 3: request DNS record
  const handleRequestDnsRecord = async () => {
    if (!domain.trim() || !companyId) return;
    setLoading(true);
    try {
      const res = await api.post(`/companies/${companyId}/onboarding/`, {
        step: "email_domain",
        email_domain: domain.trim().toLowerCase(),
      });
      if (res.data.success) {
        const token: string = res.data.data.email_domain_verification_token || "";
        setDnsRecord({ token, host: `_cowrk-verify.${domain.trim().toLowerCase()}` });
      }
    } catch {
      // non-blocking; user can skip
    } finally {
      setLoading(false);
    }
  };

  // Corporate Step 3: poll verification
  const handleCheckVerification = async () => {
    if (!companyId) return;
    setDomainChecking(true);
    try {
      const res = await api.get(`/companies/${companyId}/`);
      if (res.data.success && res.data.data.email_domain_verified) {
        setDomainVerified(true);
      }
    } catch {
      // silently ignore
    } finally {
      setDomainChecking(false);
    }
  };

  // Corporate Step 4 / Individual Step 1: send invites
  const handleInvite = async () => {
    setLoading(true);
    try {
      const valid = emails.map((e, i) => ({ email: e.trim(), role: inviteRoles[i] }))
        .filter((x) => x.email !== "");

      if (accountType === "corporate" && companyId) {
        for (const { email, role } of valid) {
          await api.post(`/companies/${companyId}/onboarding/invites/`, { email, role });
        }
        // Mark onboarding complete
        await api.post(`/companies/${companyId}/onboarding/`, { step: "review" });
        router.push("/company-admin/dashboard");
        return;
      }

      // Individual path — team invites
      if (teamId) {
        for (const { email } of valid) {
          await api.post(`/teams/${teamId}/invite/`, { email, role: "member" });
        }
      }
    } catch {
      // proceed even if some invites fail
    } finally {
      setLoading(false);
      if (accountType === "individual") router.push("/dashboard");
    }
  };

  const setEmail = (idx: number, value: string) => {
    const next = [...emails]; next[idx] = value; setEmails(next);
  };
  const setInviteRole = (idx: number, value: string) => {
    const next = [...inviteRoles]; next[idx] = value; setInviteRoles(next);
  };
  const addEmail = () => {
    if (emails.length < 8) { setEmails([...emails, ""]); setInviteRoles([...inviteRoles, "member"]); }
  };
  const removeEmail = (idx: number) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== idx));
    setInviteRoles(inviteRoles.filter((_, i) => i !== idx));
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const STEPS = accountType === "corporate" ? CORPORATE_STEPS : INDIVIDUAL_STEPS;

  const cardHeader = (title: string, sub: string) => (
    <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );

  const miniCard = (name: string, logoPreview: string | null, logoInitials: string) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-11 w-11 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-primary/10 flex items-center justify-center">
            <span className="text-base font-bold text-primary">{logoInitials}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">Setting up</p>
        <p className="text-sm font-bold">{name}</p>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Wordmark */}
      <div className="mb-10 flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">C</div>
        <span className="text-xl font-bold tracking-tight">cowrk</span>
      </div>

      {/* Progress */}
      <StepIndicator steps={STEPS} current={step} />

      {/* Card */}
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden">

        {/* ════════════════════════════════════════════════════
            INDIVIDUAL PATH
            ════════════════════════════════════════════════ */}

        {accountType === "individual" && step === 0 && (
          <>
            {cardHeader("Set up your workspace", "Give your team a name and a logo so everyone knows they're in the right place.")}
            <div className="px-8 py-7 space-y-7">
              <LogoUploader
                preview={teamLogoPreview}
                initials={initials(teamName)}
                dragOver={teamDragOver}
                onFileChange={handleTeamFile}
                onDrop={handleTeamDrop}
                onDragOver={() => setTeamDragOver(true)}
                onDragLeave={() => setTeamDragOver(false)}
                onClear={clearTeamLogo}
                fileInputRef={teamFileRef}
                label="Workspace logo"
              />
              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-sm font-semibold">Workspace name</Label>
                <Input
                  id="teamName" placeholder="Acme Corp" value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  className="h-11 text-base" autoFocus
                />
                {teamName && (
                  <p className="text-xs text-muted-foreground">
                    URL slug: <span className="font-mono text-foreground">{teamName.toLowerCase().replace(/\s+/g, "-")}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="px-8 pb-8">
              <Button className="w-full h-11 text-base font-semibold gap-2" onClick={handleCreateTeam} disabled={!teamName.trim() || loading}>
                {loading ? "Creating workspace…" : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </>
        )}

        {accountType === "individual" && step === 1 && (
          <>
            <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
              {miniCard(teamName, teamLogoPreview, initials(teamName))}
              <h1 className="text-2xl font-bold tracking-tight">Invite your team</h1>
              <p className="mt-1 text-sm text-muted-foreground">Add teammates now — or skip and do it from Settings later.</p>
            </div>
            <div className="px-8 py-7 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Email addresses</Label>
              </div>
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input type="email" placeholder="teammate@example.com" value={email} onChange={(e) => setEmail(idx, e.target.value)} className="h-10" />
                  {emails.length > 1 && (
                    <button type="button" onClick={() => removeEmail(idx)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {emails.length < 8 && (
                <button type="button" onClick={addEmail} className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">+ Add another</button>
              )}
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Button variant="outline" className="h-11 gap-1.5" onClick={() => setStep(0)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button variant="outline" className="h-11 flex-1" onClick={() => router.push("/dashboard")} disabled={loading}>Skip for now</Button>
              <Button className="h-11 flex-1 font-semibold" onClick={handleInvite} disabled={loading}>
                {loading ? "Sending…" : "Finish →"}
              </Button>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            CORPORATE PATH
            ════════════════════════════════════════════════ */}

        {/* Corporate Step 0 — Account type confirm */}
        {accountType === "corporate" && step === 0 && (
          <>
            {cardHeader("How will you use CowrkFlow?", `We detected a corporate email — ${user?.email ?? ""}`)}
            <div className="px-8 py-7 space-y-4">
              {[
                {
                  type: "corporate" as const,
                  icon: Building2,
                  title: "Set up a company workspace",
                  desc: "Build a team with roles, departments, and company-wide projects.",
                },
                {
                  type: "individual" as const,
                  icon: Users,
                  title: "Set up a personal workspace",
                  desc: "Just you or a small group. No company structure needed.",
                },
              ].map(({ type, icon: Icon, title, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-4",
                    accountType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    accountType === type ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
                    accountType === type ? "border-primary bg-primary" : "border-border"
                  )}>
                    {accountType === type && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-8 pb-8">
              <Button className="w-full h-11 text-base font-semibold gap-2" onClick={() => setStep(1)}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Corporate Step 1 — Company profile */}
        {accountType === "corporate" && step === 1 && (
          <>
            {cardHeader("Tell us about your company", "This sets up your organization on CowrkFlow.")}
            <div className="px-8 py-7 space-y-6">
              <LogoUploader
                preview={companyLogoPreview}
                initials={initials(companyName)}
                dragOver={companyDragOver}
                onFileChange={handleCompanyFile}
                onDrop={handleCompanyDrop}
                onDragOver={() => setCompanyDragOver(true)}
                onDragLeave={() => setCompanyDragOver(false)}
                onClear={clearCompanyLogo}
                fileInputRef={companyFileRef}
                label="Company logo"
              />
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-semibold">Company name <span className="text-destructive">*</span></Label>
                <Input
                  id="companyName" placeholder="Acme Corp" value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setCompanyNameError(""); }}
                  className={cn("h-11 text-base", companyNameError && "border-destructive")}
                  autoFocus
                />
                {companyNameError && <p className="text-xs text-destructive">{companyNameError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField id="industry" label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES} />
                <SelectField id="size" label="Company size" value={companySize} onChange={setCompanySize} options={SIZES} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-semibold">Country</Label>
                <Input id="country" placeholder="United States" value={country} onChange={(e) => setCountry(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Button variant="outline" className="h-11 gap-1.5" onClick={() => setStep(0)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button className="h-11 flex-1 font-semibold gap-2" onClick={handleCreateCompany} disabled={!companyName.trim() || loading}>
                {loading ? "Creating…" : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </>
        )}

        {/* Corporate Step 2 — Workspace */}
        {accountType === "corporate" && step === 2 && (
          <>
            <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
              {miniCard(companyName, companyLogoPreview, initials(companyName))}
              <h1 className="text-2xl font-bold tracking-tight">Name your first workspace</h1>
              <p className="mt-1 text-sm text-muted-foreground">Give your team's workspace a name and logo.</p>
            </div>
            <div className="px-8 py-7 space-y-7">
              <LogoUploader
                preview={teamLogoPreview}
                initials={initials(teamName)}
                dragOver={teamDragOver}
                onFileChange={handleTeamFile}
                onDrop={handleTeamDrop}
                onDragOver={() => setTeamDragOver(true)}
                onDragLeave={() => setTeamDragOver(false)}
                onClear={clearTeamLogo}
                fileInputRef={teamFileRef}
                label="Workspace logo"
              />
              <div className="space-y-2">
                <Label htmlFor="teamName2" className="text-sm font-semibold">Workspace name</Label>
                <Input
                  id="teamName2" placeholder="Engineering · Marketing · Design…"
                  value={teamName} onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  className="h-11 text-base" autoFocus
                />
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Button variant="outline" className="h-11 gap-1.5" onClick={() => setStep(1)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button className="h-11 flex-1 font-semibold gap-2" onClick={handleCreateTeam} disabled={!teamName.trim() || loading}>
                {loading ? "Creating…" : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </>
        )}

        {/* Corporate Step 3 — Domain setup */}
        {accountType === "corporate" && step === 3 && (
          <>
            {cardHeader("Claim your company domain", "Colleagues who sign up with the same domain will auto-join your company.")}
            <div className="px-8 py-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="domain" className="text-sm font-semibold">Company domain</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="domain" placeholder="acme.com" value={domain}
                      onChange={(e) => { setDomain(e.target.value); setDnsRecord(null); setDomainVerified(false); }}
                      className="h-11 pl-9"
                    />
                  </div>
                  <Button variant="outline" className="h-11 whitespace-nowrap" onClick={handleRequestDnsRecord} disabled={!domain.trim() || loading}>
                    {loading ? "…" : "Get DNS record"}
                  </Button>
                </div>
              </div>

              {dnsRecord && !domainVerified && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add this DNS TXT record</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span className="text-muted-foreground w-12">Type</span><span className="font-mono">TXT</span></div>
                    <div className="flex gap-2"><span className="text-muted-foreground w-12">Host</span><span className="font-mono text-xs break-all">{dnsRecord.host}</span></div>
                    <div className="flex gap-2"><span className="text-muted-foreground w-12">Value</span><span className="font-mono text-xs break-all">flowteam-verification={dnsRecord.token}</span></div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleCheckVerification} disabled={domainChecking}>
                    {domainChecking ? "Checking…" : "Check verification"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">DNS propagation can take up to 24 hours.</p>
                </div>
              )}

              {domainVerified && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <p className="text-sm font-medium text-primary">{domain} verified successfully!</p>
                </div>
              )}
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Button variant="outline" className="h-11 gap-1.5" onClick={() => setStep(2)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button variant="outline" className="h-11 flex-1" onClick={() => setStep(4)}>Skip for now</Button>
              <Button className="h-11 flex-1 font-semibold gap-2" onClick={() => setStep(4)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Corporate Step 4 — Invite leadership */}
        {accountType === "corporate" && step === 4 && (
          <>
            <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
              {miniCard(companyName, companyLogoPreview, initials(companyName))}
              <h1 className="text-2xl font-bold tracking-tight">Invite your leadership team</h1>
              <p className="mt-1 text-sm text-muted-foreground">Add admins and managers now — or skip and do it from Settings later.</p>
            </div>
            <div className="px-8 py-7 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Team members</Label>
              </div>
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="email" placeholder="colleague@company.com" value={email}
                    onChange={(e) => setEmail(idx, e.target.value)} className="h-10 flex-1"
                  />
                  <div className="relative">
                    <select
                      value={inviteRoles[idx]}
                      onChange={(e) => setInviteRole(idx, e.target.value)}
                      className="h-10 rounded-md border border-input bg-background pl-3 pr-7 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {COMPANY_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {emails.length > 1 && (
                    <button type="button" onClick={() => removeEmail(idx)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {emails.length < 8 && (
                <button type="button" onClick={addEmail} className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">+ Add another</button>
              )}
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Button variant="outline" className="h-11 gap-1.5" onClick={() => setStep(3)} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <Button variant="outline" className="h-11 flex-1" onClick={() => router.push("/company-admin/dashboard")} disabled={loading}>
                Skip for now
              </Button>
              <Button className="h-11 flex-1 font-semibold" onClick={handleInvite} disabled={loading}>
                {loading ? "Finishing…" : "Finish →"}
              </Button>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        By continuing you agree to CowrkFlow's{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>
        {" "}and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
}
