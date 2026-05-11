"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  Loader2, ArrowRight, AlertCircle, Eye, EyeOff,
  Kanban, BarChart3, MessageSquare, Shield, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const leftFeatures = [
  { icon: Kanban,        label: "Kanban & sprint boards",       color: "text-[#82B4AA]",  bg: "bg-[#82B4AA]/10" },
  { icon: MessageSquare, label: "Real-time chat & voice calls", color: "text-[#9ECAC2]",  bg: "bg-[#82B4AA]/8"  },
  { icon: BarChart3,     label: "Analytics & velocity reports", color: "text-[#B0D4CE]",  bg: "bg-[#82B4AA]/7"  },
  { icon: Shield,        label: "Role-based access control",    color: "text-[#82B4AA]",  bg: "bg-[#82B4AA]/8"  },
];

export default function LoginClient() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const setUser      = useAuthStore((s) => s.setUser);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode]     = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const continueWithGoogle = () => {
    window.location.href = `${getApiBaseUrl()}/auth/oauth/google/redirect/`;
  };

  useEffect(() => {
    const emailFromQuery = (searchParams.get("email") || "").trim();
    const hasPwInQuery   = !!searchParams.get("password");
    const redirect       = searchParams.get("redirect");
    if (emailFromQuery) setValue("email", emailFromQuery);
    if (hasPwInQuery) setError("For security, enter your password in the form only.");
    if (emailFromQuery || hasPwInQuery) {
      const next = new URLSearchParams();
      if (redirect) next.set("redirect", redirect);
      router.replace(next.toString() ? `${pathname}?${next}` : pathname);
    }
  }, [pathname, router, searchParams, setValue]);

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, string> = { ...values };
      if (otpRequired) {
        if (useBackup) payload.backup_code = backupCode.trim();
        else payload.otp_code = otpCode.trim().replace(/\s+/g, "");
      }
      const res = await api.post("/auth/login/", payload);
      if (res.data.success) {
        const { user, access, refresh } = res.data.data;
        setTokens(access, refresh);
        setUser(user);
        router.push(searchParams.get("redirect") || "/dashboard");
      }
    } catch (err: unknown) {
      const data   = (err as { response?: { data?: unknown } })?.response?.data;
      const apiErr = (data as { error?: { code?: string; message?: string } | string })?.error;
      if (typeof apiErr === "object" && apiErr?.code === "otp_required") {
        setOtpRequired(true);
        setError(apiErr?.message || "Two‑factor authentication required.");
      } else {
        setError(toErrorMessage(apiErr ?? data ?? err, "Invalid email or password"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#060d0a]">

      {/* ══════════════════════════════════════
          LEFT PANEL — brand hero
          ══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between p-14 relative overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 bg-[#070f0b]" />
        <div className="absolute inset-0 opacity-[0.022]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute -top-24 -left-24 h-[560px] w-[560px] rounded-full blur-[130px]" style={{ background: "rgba(130,180,170,0.10)" }} />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full blur-[110px]" style={{ background: "rgba(130,180,170,0.07)" }} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060d0a] to-transparent" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 select-none">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_0_24px_rgba(130,180,170,0.35)]" style={{ background: "linear-gradient(135deg, #82B4AA, #6A9E94)" }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-white">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
              <rect x="8" y="1.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
              <rect x="1.5" y="8" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
              <rect x="8" y="8" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.35" />
            </svg>
          </span>
          <span className="text-[17px] font-bold tracking-[-0.03em] text-white">flowteam</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(130,180,170,0.20)", background: "rgba(130,180,170,0.08)", color: "#82B4AA" }}>
            <Sparkles size={10} />
            Trusted by 5,000+ teams
          </div>
          <div>
            <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-white">
              Your team,<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #82B4AA, #B0D4CE, #9EC8C2)" }}>
                in perfect sync.
              </span>
            </h1>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/38 max-w-sm">
              Projects, tasks, messages, and analytics — unified in one professional workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {leftFeatures.map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon size={13} className={color} />
                </div>
                <span className="text-[12px] font-medium leading-snug text-white/50">{label}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A","B","C","D"].map((l, i) => (
                <span key={l}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#070f0b] text-[10px] font-bold text-white"
                  style={{ background: ["#82B4AA","#6A9E94","#9ECAC2","#B0D4CE"][i] }}
                >
                  {l}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-white/28">
              Join <span className="text-white/55 font-semibold">5,000+</span> teams worldwide
            </p>
          </div>
        </div>

        <p className="relative text-[11px] text-white/18 tracking-wide">
          © 2026 FlowTeam Inc.
          {" · "}<a href="#" className="hover:text-white/38 transition-colors">Privacy</a>
          {" · "}<a href="#" className="hover:text-white/38 transition-colors">Terms</a>
        </p>
      </div>

      {/* ══════════════════════════════════════
          RIGHT PANEL — login form
          ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-[#07100c]" />
        <div className="absolute inset-0 opacity-[0.014]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />
        <div className="absolute left-1/2 top-1/3 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]" style={{ background: "rgba(130,180,170,0.04)" }} />

        {/* Mobile logo */}
        <div className="lg:hidden relative flex items-center gap-2 mb-10 select-none">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #82B4AA, #6A9E94)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
              <rect x="8" y="1.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
              <rect x="1.5" y="8" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
              <rect x="8" y="8" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.35" />
            </svg>
          </span>
          <span className="text-[16px] font-bold tracking-[-0.03em] text-white">flowteam</span>
        </div>

        <div className="relative w-full max-w-[380px] space-y-6">
          <div>
            <h2 className="text-[26px] font-black tracking-[-0.035em] text-white">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[13.5px] text-white/32 font-medium">
              Sign in to your workspace
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">

            {/* Google OAuth */}
            <button
              type="button"
              onClick={continueWithGoogle}
              className="mb-5 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white/90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.07]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#07100c] px-3 text-[11px] font-medium text-white/22 uppercase tracking-wider">or</span>
              </div>
            </div>

            <form
              method="post"
              onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
              className="space-y-4"
              noValidate
            >
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                  <AlertCircle size={14} className="shrink-0 text-red-400 mt-px" />
                  <p className="text-[12.5px] text-red-300 font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/30">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                  className={cn(
                    "h-10 rounded-xl border-white/[0.09] bg-white/[0.04] text-white placeholder:text-white/18 focus-visible:border-[#82B4AA]/45 focus-visible:ring-[#82B4AA]/15 focus-visible:bg-white/[0.06]",
                    errors.email && "border-red-500/35"
                  )}
                />
                {errors.email && <p className="text-[11.5px] text-red-400">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/30">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-[11px] font-semibold transition-colors" style={{ color: "rgba(130,180,170,0.65)" }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn(
                      "h-10 rounded-xl border-white/[0.09] bg-white/[0.04] pr-10 text-white placeholder:text-white/18 focus-visible:border-[#82B4AA]/45 focus-visible:ring-[#82B4AA]/15",
                      errors.password && "border-red-500/35"
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/22 hover:text-white/55 transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="text-[11.5px] text-red-400">{errors.password.message}</p>}
              </div>

              {/* 2FA */}
              {otpRequired && (
                <div className="space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-white/65">Two‑factor authentication</p>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setUseBackup(false); setBackupCode(""); }}
                        className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                          !useBackup ? "bg-[rgba(130,180,170,0.15)] text-[#82B4AA]" : "text-white/32 hover:text-white/55")}>
                        OTP code
                      </button>
                      <button type="button" onClick={() => { setUseBackup(true); setOtpCode(""); }}
                        className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                          useBackup ? "bg-[rgba(130,180,170,0.15)] text-[#82B4AA]" : "text-white/32 hover:text-white/55")}>
                        Backup code
                      </button>
                    </div>
                  </div>
                  {!useBackup ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="otp_code" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">6‑digit code</Label>
                      <Input id="otp_code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                        inputMode="numeric" placeholder="123456"
                        className="h-10 rounded-xl border-white/[0.09] bg-white/[0.04] text-white placeholder:text-white/18 focus-visible:border-[#82B4AA]/45 focus-visible:ring-[#82B4AA]/15" />
                      <p className="text-[11px] text-white/22">From your authenticator app.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="backup_code" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">Backup code</Label>
                      <Input id="backup_code" value={backupCode} onChange={(e) => setBackupCode(e.target.value)}
                        placeholder="ABCD-EF12"
                        className="h-10 rounded-xl border-white/[0.09] bg-white/[0.04] text-white placeholder:text-white/18 focus-visible:border-[#82B4AA]/45 focus-visible:ring-[#82B4AA]/15" />
                      <p className="text-[11px] text-white/22">One‑time use code from 2FA setup.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-45 disabled:cursor-not-allowed"
              style={{ background: "#82B4AA", boxShadow: "0 0 28px rgba(130,180,170,0.35), inset 0 1px 0 rgba(255,255,255,0.10)" }}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <ArrowRight size={14} /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[13px] text-white/28">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold transition-colors" style={{ color: "#82B4AA" }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
