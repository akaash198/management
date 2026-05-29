"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  Loader2, ArrowRight, Eye, EyeOff,
  Kanban, BarChart3, MessageSquare, Shield, Sparkles, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});
type RegisterFormValues = z.infer<typeof registerSchema>;

const leftFeatures = [
  { icon: Kanban, label: "Kanban & sprint boards", color: "text-[#7CFFCB]", bg: "bg-[#7CFFCB]/10" },
  { icon: MessageSquare, label: "Real-time chat & voice calls", color: "text-[#5FE3B3]", bg: "bg-[#7CFFCB]/8" },
  { icon: BarChart3, label: "Analytics & velocity reports", color: "text-[#7CFFCB]", bg: "bg-[#7CFFCB]/7" },
  { icon: Shield, label: "Role-based access control", color: "text-[#5FE3B3]", bg: "bg-[#7CFFCB]/8" },
];

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const emailFromQuery = (searchParams.get("email") || "").trim();
    if (emailFromQuery) setValue("email", emailFromQuery);
  }, [searchParams, setValue]);

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
        const redirect = (searchParams.get("redirect") || "").trim();
        if (redirect) window.location.assign(redirect);
        else router.push("/onboarding");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      setError(toErrorMessage((data as { error?: unknown })?.error ?? data ?? err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A1628]">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0A1628]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute top-0 right-0 h-[500px] w-[500px] -translate-y-24 translate-x-24 rounded-full blur-[120px]" style={{ background: "rgba(124,255,203,0.10)" }} />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] translate-y-16 -translate-x-16 rounded-full blur-[100px]" style={{ background: "rgba(124,255,203,0.06)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0A1628] to-transparent" />

        <div className="relative select-none">
          <Image src="/logo.png" alt="cowrk" width={120} height={40} className="object-contain" style={{ height: 28, width: "auto" }} />
        </div>

        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7CFFCB]/20 bg-[#7CFFCB]/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7CFFCB]">
            <Sparkles size={10} className="text-[#7CFFCB]" />
            Free forever for small teams
          </div>
          <div>
            <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-white">
              Everything your<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7CFFCB] via-[#5FE3B3] to-[#7CFFCB]">
                team needs.
              </span>
            </h1>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/40 max-w-sm">
              Plan work, collaborate in real time, and keep projects moving — all in one beautiful workspace.
            </p>
          </div>

          <div className="grid gap-3">
            {leftFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center border border-white/[0.08]", f.bg)}>
                  <f.icon size={16} className={f.color} />
                </div>
                <p className="text-[13px] font-semibold text-white/70">{f.label}</p>
                <Check size={14} className="ml-auto text-white/18" />
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[12px] text-white/25">
          © {new Date().getFullYear()} CowrkFlow. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <Image src="/logo.png" alt="cowrk" width={120} height={40} className="object-contain" style={{ height: 28, width: "auto" }} />
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="text-center space-y-2">
              <h2 className="text-[22px] font-black text-white">Create your account</h2>
              <p className="text-[13px] text-white/35">Start collaborating in minutes.</p>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 text-[12.5px]">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={continueWithGoogle}
                className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] text-white/80 hover:bg-white/[0.06] transition-colors text-[13.5px] font-semibold"
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[11px] text-white/25">or</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Full name</Label>
                  <Input
                    id="full_name"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    {...register("full_name")}
                    className={cn(
                      "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-[#7CFFCB]/50 focus-visible:ring-[#7CFFCB]/20 focus-visible:bg-white/[0.07]",
                      errors.full_name && "border-red-500/40 focus-visible:ring-red-500/20"
                    )}
                  />
                  {errors.full_name && <p className="text-[11.5px] text-red-400">{errors.full_name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    {...register("email")}
                    className={cn(
                      "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] text-white placeholder:text-white/20 focus-visible:border-[#7CFFCB]/50 focus-visible:ring-[#7CFFCB]/20 focus-visible:bg-white/[0.07]",
                      errors.email && "border-red-500/40 focus-visible:ring-red-500/20"
                    )}
                  />
                  {errors.email && <p className="text-[11.5px] text-red-400">{errors.email.message}</p>}
                </div>

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
                          "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] pr-9 text-white placeholder:text-white/20 focus-visible:border-[#7CFFCB]/50 focus-visible:ring-[#7CFFCB]/20 focus-visible:bg-white/[0.07]",
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
                          "h-10 rounded-xl border-white/[0.1] bg-white/[0.05] pr-9 text-white placeholder:text-white/20 focus-visible:border-[#7CFFCB]/50 focus-visible:ring-[#7CFFCB]/20 focus-visible:bg-white/[0.07]",
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
                  className="mt-1 inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-[#0A1628] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#7CFFCB] to-[#5FE3B3] shadow-[0_0_24px_rgba(124,255,203,0.40)] hover:brightness-110 hover:-translate-y-0.5"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Creating account&hellip;</>
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

            <p className="mt-5 text-center text-[13px] text-white/30">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#7CFFCB] hover:text-[#5FE3B3] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

