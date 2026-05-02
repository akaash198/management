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
  { icon: Kanban,       label: "Kanban & sprint boards",       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  { icon: MessageSquare,label: "Real-time chat & voice calls", color: "text-violet-400",  bg: "bg-violet-500/10" },
  { icon: BarChart3,    label: "Analytics & velocity reports", color: "text-cyan-400",    bg: "bg-cyan-500/10"   },
  { icon: Shield,       label: "Role-based access control",    color: "text-emerald-400", bg: "bg-emerald-500/10"},
];

export default function LoginClient() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const setUser      = useAuthStore((s) => s.setUser);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
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
      const data  = (err as { response?: { data?: unknown } })?.response?.data;
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
    <div className="min-h-screen flex bg-[#06060e]">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between p-14 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#08081a]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />
        <div className="absolute -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.12] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-violet-600/[0.08] blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#06060e] to-transparent" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 select-none">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Kanban size={16} className="text-white" />
          </span>
          <span className="text-[17px] font-bold tracking-[-0.025em] text-white">FlowTeam</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.1] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-300">
            <Sparkles size={10} className="text-indigo-400" />
            Trusted by 5,000+ teams
          </div>
          <div>
            <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-white">
              Your team,<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
                in perfect sync.
              </span>
            </h1>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/40 max-w-sm">
              Projects, tasks, messages, and analytics — unified in one professional workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {leftFeatures.map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon size={13} className={color} />
                </div>
                <span className="text-[12px] font-medium leading-snug text-white/55">{label}</span>
              </div>
            ))}
          </div>

          {/* Avatars */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A","B","C","D"].map((l, i) => (
                <span
                  key={l}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#08081a] text-[10px] font-bold text-white"
                  style={{ background: ["#6366f1","#8b5cf6","#06b6d4","#10b981"][i] }}
                >
                  {l}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-white/30">
              Join <span className="text-white/60 font-semibold">5,000+</span> teams worldwide
            </p>
          </div>
        </div>

        <p className="relative text-[11px] text-white/20 tracking-wide">
          © 2026 FlowTeam Inc. · <a href="#" className="hover:text-white/40 transition-colors">Privacy</a> · <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-[#09090f]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/[0.05] blur-[100px]" />

        {/* Mobile logo */}
        <div className="lg:hidden relative flex items-center gap-2 mb-10 select-none">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Kanban size={14} className="text-white" />
          </span>
          <span className="text-[16px] font-bold tracking-[-0.025em] text-white">FlowTeam</span>
        </div>

        <div className="relative w-full max-w-[380px] space-y-6">
          {/* Heading */}
          <div>
            <h2 className="text-[24px] font-black tracking-[-0.03em] text-white">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[13px] text-white/35">
              Sign in to your workspace
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <button
              type="button"
              onClick={continueWithGoogle}
              className="mb-4 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/[0.07]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <form
              method="post"
              onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
              className="space-y-4"
              noValidate
            >
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2.5">
                  <AlertCircle size={14} className="shrink-0 text-red-400 mt-px" />
                  <p className="text-[12.5px] text-red-300 font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                  className={cn(
                    "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20 focus-visible:bg-white/[0.07]",
                    errors.email && "border-red-500/40 focus-visible:ring-red-500/20"
                  )}
                />
                {errors.email && (
                  <p className="text-[11.5px] text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-indigo-400/70 hover:text-indigo-300 transition-colors"
                  >
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
                      "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] pr-10 text-white placeholder:text-white/20 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20 focus-visible:bg-white/[0.07]",
                      errors.password && "border-red-500/40 focus-visible:ring-red-500/20"
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11.5px] text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* 2FA */}
              {otpRequired && (
                <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-white/70">Two‑factor authentication</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setUseBackup(false); setBackupCode(""); }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                          !useBackup ? "bg-indigo-500/20 text-indigo-300" : "text-white/35 hover:text-white/60"
                        )}
                      >
                        OTP code
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUseBackup(true); setOtpCode(""); }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                          useBackup ? "bg-indigo-500/20 text-indigo-300" : "text-white/35 hover:text-white/60"
                        )}
                      >
                        Backup code
                      </button>
                    </div>
                  </div>
                  {!useBackup ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="otp_code" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">6‑digit code</Label>
                      <Input
                        id="otp_code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        inputMode="numeric"
                        placeholder="123456"
                        className="h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                      <p className="text-[11px] text-white/25">From your authenticator app.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="backup_code" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Backup code</Label>
                      <Input
                        id="backup_code"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value)}
                        placeholder="ABCD-EF12"
                        className="h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
                      />
                      <p className="text-[11px] text-white/25">One‑time use code from 2FA setup.</p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 text-[14px] font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all hover:bg-indigo-400 hover:shadow-[0_0_36px_rgba(99,102,241,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <ArrowRight size={14} /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[13px] text-white/30">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
