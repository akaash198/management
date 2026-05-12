"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  Loader2, ArrowRight, AlertCircle, Eye, EyeOff,
  Kanban, BarChart3, MessageSquare, Shield, Sparkles, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

const registerSchema = z.object({
  full_name:        z.string().min(2, "Name must be at least 2 characters"),
  email:            z.string().email("Enter a valid email address"),
  password:         z.string().min(8, "Password must be at least 8 characters"),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords don't match",
  path:    ["password_confirm"],
});
type RegisterFormValues = z.infer<typeof registerSchema>;

const leftFeatures = [
  { icon: Kanban,       label: "Kanban & sprint boards",        color: "text-[#82B4AA]",  bg: "bg-[#82B4AA]/10" },
  { icon: MessageSquare,label: "Real-time chat & voice calls",  color: "text-[#9ECAC2]",  bg: "bg-[#82B4AA]/8"  },
  { icon: BarChart3,    label: "Analytics & velocity reports",  color: "text-[#B0D4CE]",  bg: "bg-[#82B4AA]/7"  },
  { icon: Shield,       label: "Role-based access control",     color: "text-[#82B4AA]",  bg: "bg-[#82B4AA]/8"  },
];

export default function RegisterPage() {
  const router  = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const continueWithGoogle = () => {
    window.location.href = `${getApiBaseUrl()}/auth/oauth/google/redirect/`;
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/register/", values);
      if (res.data.success) {
        const { user, access, refresh } = res.data.data;
        setTokens(access, refresh);
        setUser(user);
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      setError(toErrorMessage((data as { error?: unknown })?.error ?? data ?? err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#060d0a]">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#070f0b]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />
        <div className="absolute top-0 right-0 h-[500px] w-[500px] -translate-y-24 translate-x-24 rounded-full blur-[120px]" style={{ background: "rgba(130,180,170,0.12)" }} />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] translate-y-16 -translate-x-16 rounded-full blur-[100px]" style={{ background: "rgba(130,180,170,0.08)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060d0a] to-transparent" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 select-none">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_0_20px_rgba(130,180,170,0.4)] bg-primary text-primary-foreground font-black text-[15px] tracking-tighter">
            CW
          </span>
          <span className="text-[17px] font-bold tracking-[-0.025em] text-white">Cowrk</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(130,180,170,0.20)", background: "rgba(130,180,170,0.10)", color: "#82B4AA" }}>
            <Sparkles size={10} style={{ color: "#82B4AA" }} />
            Free forever for small teams
          </div>
          <div>
            <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-white">
              Everything your<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #82B4AA, #B0D4CE, #9EC8C2)" }}>
                team needs.
              </span>
            </h1>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/40 max-w-sm">
              Start for free. No credit card required. Your workspace is ready in seconds.
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

          {/* Trust bullets */}
          <ul className="space-y-2">
            {["No credit card required", "Free plan forever for small teams", "Upgrade anytime, cancel anytime"].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px] text-white/40">
                <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(130,180,170,0.15)" }}>
                  <Check size={9} style={{ color: "#82B4AA" }} strokeWidth={3} />
                </div>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/20 tracking-wide">
          © 2026 Cowrk Inc. · <a href="#" className="hover:text-white/40 transition-colors">Privacy</a> · <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-[#07100c]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" style={{ background: "rgba(130,180,170,0.05)" }} />

        {/* Mobile logo */}
        <div className="lg:hidden relative flex items-center gap-2 mb-10 select-none">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-[13px] tracking-tighter">
            CW
          </span>
          <span className="text-[16px] font-bold tracking-[-0.025em] text-white">Cowrk</span>
        </div>

        <div className="relative w-full max-w-[420px] space-y-6">
          {/* Heading */}
          <div>
            <h2 className="text-[24px] font-black tracking-[-0.03em] text-white">
              Create your account
            </h2>
            <p className="mt-1.5 text-[13px] text-white/35">
              Free forever. Upgrade when your team grows.
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
              onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e); }}
              className="space-y-4"
              noValidate
            >
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2.5">
                  <AlertCircle size={14} className="shrink-0 text-red-400 mt-px" />
                  <p className="text-[12.5px] text-red-300 font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
                  Full name
                </Label>
                <Input
                  id="full_name"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  {...register("full_name")}
                  className={cn(
                    "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-[#82B4AA]/50 focus-visible:ring-[#82B4AA]/20 focus-visible:bg-white/[0.07]",
                    errors.full_name && "border-red-500/40 focus-visible:ring-red-500/20"
                  )}
                />
                {errors.full_name && (
                  <p className="text-[11.5px] text-red-400">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                  className={cn(
                    "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-[#82B4AA]/50 focus-visible:ring-[#82B4AA]/20 focus-visible:bg-white/[0.07]",
                    errors.email && "border-red-500/40 focus-visible:ring-red-500/20"
                  )}
                />
                {errors.email && (
                  <p className="text-[11.5px] text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      placeholder="Min 8 chars"
                      autoComplete="new-password"
                      {...register("password")}
                      className={cn(
                        "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] pr-9 text-white placeholder:text-white/20 focus-visible:border-[#82B4AA]/50 focus-visible:ring-[#82B4AA]/20 focus-visible:bg-white/[0.07]",
                        errors.password && "border-red-500/40 focus-visible:ring-red-500/20"
                      )}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    >
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password_confirm" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Confirm</Label>
                  <div className="relative">
                    <Input
                      id="password_confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat"
                      autoComplete="new-password"
                      {...register("password_confirm")}
                      className={cn(
                        "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] pr-9 text-white placeholder:text-white/20 focus-visible:border-[#82B4AA]/50 focus-visible:ring-[#82B4AA]/20 focus-visible:bg-white/[0.07]",
                        errors.password_confirm && "border-red-500/40 focus-visible:ring-red-500/20"
                      )}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>
              {(errors.password || errors.password_confirm) && (
                <p className="text-[11.5px] text-red-400 -mt-2">
                  {errors.password?.message || errors.password_confirm?.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#82B4AA", boxShadow: "0 0 24px rgba(130,180,170,0.40), inset 0 1px 0 rgba(255,255,255,0.12)" }}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                ) : (
                  <>Create free account <ArrowRight size={14} /></>
                )}
              </button>

              <p className="text-center text-[11px] text-white/20 leading-relaxed">
                By continuing you agree to our{" "}
                <a href="#" className="underline underline-offset-2 text-white/35 hover:text-white/55 transition-colors">Terms</a>
                {" & "}
                <a href="#" className="underline underline-offset-2 text-white/35 hover:text-white/55 transition-colors">Privacy Policy</a>.
              </p>
            </form>
          </div>

          <p className="text-center text-[13px] text-white/30">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors" style={{ color: "#82B4AA" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

