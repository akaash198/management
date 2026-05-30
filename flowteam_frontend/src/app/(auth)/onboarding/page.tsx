"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Check, Users, ArrowRight, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = ["Your workspace", "Invite teammates"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 1 fields
  const [teamName, setTeamName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 fields
  const [emails, setEmails] = useState<string[]>(["", "", ""]);

  // ── Logo helpers ────────────────────────────────────────────────────────────

  const applyFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }, []);

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Step 1: create team + upload logo ────────────────────────────────────

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/teams/", { name: teamName.trim() });
      if (!res.data.success) return;
      const id: string = res.data.data.id;
      setTeamId(id);

      if (logoFile) {
        const formData = new FormData();
        formData.append("avatar", logoFile);
        await api.patch(`/teams/${id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setStep(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: invite teammates ──────────────────────────────────────────────

  const handleInvite = async () => {
    setLoading(true);
    try {
      const valid = emails.filter((e) => e.trim() !== "");
      if (teamId) {
        for (const email of valid) {
          await api.post(`/teams/${teamId}/invite/`, { email, role: "member" });
        }
      }
    } catch {
      // proceed even if some invites fail
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
  };

  const setEmail = (idx: number, value: string) => {
    const next = [...emails];
    next[idx] = value;
    setEmails(next);
  };

  const addEmail = () => {
    if (emails.length < 8) setEmails([...emails, ""]);
  };

  const removeEmail = (idx: number) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== idx));
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const initials = teamName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo wordmark */}
      <div className="mb-10 flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          C
        </div>
        <span className="text-xl font-bold tracking-tight">cowrk</span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  i < step
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === step
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground bg-background"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  i === step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-16 mx-2 mb-5 transition-all",
                  i < step ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">

        {/* ── Step 1 ── */}
        {step === 0 && (
          <>
            <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
              <h1 className="text-2xl font-bold tracking-tight">Set up your workspace</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Give your team a name and a logo so everyone knows they're in the right place.
              </p>
            </div>

            <div className="px-8 py-7 space-y-7">
              {/* Logo upload — Slack-style centred uploader */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace logo
                </p>

                <div className="relative group">
                  {/* Drop zone / preview */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "h-28 w-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                      dragOver
                        ? "border-primary bg-primary/10 scale-105"
                        : logoPreview
                        ? "border-transparent"
                        : "border-border hover:border-primary/60 hover:bg-muted/30 bg-muted/20"
                    )}
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : initials ? (
                      /* Initials placeholder */
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <span className="text-4xl font-bold text-primary">{initials}</span>
                      </div>
                    ) : (
                      /* Empty state */
                      <div className="flex flex-col items-center gap-2 text-muted-foreground px-2">
                        <Upload className="h-6 w-6" />
                        <span className="text-[11px] text-center leading-tight">
                          Click or drag<br />to upload
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Camera overlay on hover (when preview exists) */}
                  {logoPreview && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}

                  {/* Remove button */}
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearLogo(); }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors z-10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG or GIF · Max 5 MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Team name */}
              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-sm font-semibold">
                  Workspace name
                </Label>
                <Input
                  id="teamName"
                  placeholder="Acme Corp"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  className="h-11 text-base"
                  autoFocus
                />
                {teamName && (
                  <p className="text-xs text-muted-foreground">
                    URL slug:{" "}
                    <span className="font-mono text-foreground">
                      {teamName.toLowerCase().replace(/\s+/g, "-")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="px-8 pb-8">
              <Button
                className="w-full h-11 text-base font-semibold gap-2"
                onClick={handleCreateTeam}
                disabled={!teamName.trim() || loading}
              >
                {loading ? "Creating workspace…" : "Continue"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 1 && (
          <>
            <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20">
              {/* Mini workspace card — like Slack's "you're setting up X" */}
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt={teamName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Setting up</p>
                  <p className="text-base font-bold">{teamName}</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight">Invite your team</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Add teammates now — or skip and do it from Settings later.
              </p>
            </div>

            <div className="px-8 py-7 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Email addresses</Label>
              </div>

              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => setEmail(idx, e.target.value)}
                    className="h-10"
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {emails.length < 8 && (
                <button
                  type="button"
                  onClick={addEmail}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  + Add another
                </button>
              )}
            </div>

            <div className="px-8 pb-8 flex gap-3">
              <Button
                variant="outline"
                className="h-11 gap-1.5"
                onClick={() => setStep(0)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => router.push("/dashboard")}
                disabled={loading}
              >
                Skip for now
              </Button>
              <Button
                className="h-11 flex-1 font-semibold"
                onClick={handleInvite}
                disabled={loading}
              >
                {loading ? "Sending…" : "Finish →"}
              </Button>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        By continuing you agree to Cowrk's{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>
        {" "}and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
}
