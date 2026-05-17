"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  faqs,
  pricing,
  testimonials,
} from "./landingContent";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  GitBranch,
  Globe,
  Kanban,
  Lock,
  Menu,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Star,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

/* ─── Palette ────────────────────────────────────────────────────── */
const PURPLE = "#7C3AED";
const BLUE   = "#2563EB";
const CYAN   = "#06B6D4";
const MINT   = "#10B981";

export default function LandingPage() {
  const [isScrolled, setIsScrolled]           = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [billingCycle, setBillingCycle]       = useState<BillingCycle>("annual");
  const [openFaq, setOpenFaq]                 = useState<number | null>(null);
  const [ctaEmail, setCtaEmail]               = useState("");
  const [ctaSubmitted, setCtaSubmitted]       = useState(false);
  const [testimonialIdx, setTestimonialIdx]   = useState(0);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5500);
    return () => clearInterval(id);
  }, []);

  /* Scroll-triggered reveal */
  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      entries => { for (const e of entries) { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("is-visible"); io.unobserve(e.target); } } },
      { threshold: 0.1, rootMargin: "32px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const handleCta = (e: React.FormEvent) => { e.preventDefault(); if (ctaEmail.trim()) setCtaSubmitted(true); };

  const priceForCycle = (raw: string) => {
    if (billingCycle === "monthly" || !raw.startsWith("$")) return raw;
    const n = Number(raw.slice(1));
    return Number.isFinite(n) && n > 0 ? `$${Math.max(1, Math.round(n * 0.8))}` : raw;
  };

  const activeTestimonial = testimonials[testimonialIdx] ?? testimonials[0];

  /* ─── Nav links ───────────────────────────────────────────────── */
  const NAV = [
    { label: "Product", anchor: "features" },
    { label: "Solutions", anchor: "use-cases" },
    { label: "Pricing", anchor: "pricing" },
    { label: "Enterprise", anchor: "security" },
  ];

  /* ─── Core feature bento cards ──────────────────────────────── */
  const FEATURES: {
    id: string; icon: React.ElementType; label: string; headline: string;
    body: string; accent: string; span?: string; preview: React.ReactNode;
  }[] = [
    {
      id: "chat",
      icon: MessageSquare,
      label: "Real-Time Chat",
      headline: "Conversations that become decisions.",
      body: "Channels, threads, DMs, and reactions — with context that automatically links to tasks.",
      accent: PURPLE,
      span: "lg:col-span-2",
      preview: <BentoChat />,
    },
    {
      id: "boards",
      icon: Kanban,
      label: "Project Boards",
      headline: "Sprints, Kanban, or list — your call.",
      body: "Plan and track work in the view your team prefers, with real-time progress rollups.",
      accent: BLUE,
      preview: <BentoBoard />,
    },
    {
      id: "meetings",
      icon: Video,
      label: "Video Meetings",
      headline: "Meetings with built-in accountability.",
      body: "Agenda → recording → auto-attached to the project board. No notes lost in email.",
      accent: CYAN,
      preview: <BentoMeeting />,
    },
    {
      id: "analytics",
      icon: BarChart3,
      label: "Analytics",
      headline: "Know what's actually happening.",
      body: "Burndown charts, velocity trends, and team health metrics — built in, not bolted on.",
      accent: MINT,
      preview: <BentoAnalytics />,
    },
    {
      id: "ai",
      icon: Sparkles,
      label: "AI Assistant",
      headline: "Summarize, assign, automate.",
      body: "Let AI surface blockers, draft status updates, and suggest task owners — instantly.",
      accent: "#EC4899",
      preview: <BentoAI />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-white overflow-x-hidden selection:bg-violet-500/25">

      {/* ══════════════════════════ NAV ══════════════════════════════ */}
      <header className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-300",
        isScrolled
          ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06] py-3"
          : "py-5"
      )}>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8 lg:gap-12">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus-visible:outline-none">
              <WordMark />
            </button>
            <nav className="hidden lg:flex items-center gap-7">
              {NAV.map(n => (
                <button
                  key={n.label}
                  onClick={() => scrollTo(n.anchor)}
                  className="text-[14px] font-medium text-white/60 hover:text-white transition-colors"
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-[14px] font-medium text-white/60 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register">
              <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-[14px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-violet-500/25">
                Get started free
                <ArrowRight size={14} />
              </button>
            </Link>
            <button className="lg:hidden text-white/70 hover:text-white p-2" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-[#030712] flex flex-col p-6" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between mb-10">
            <WordMark />
            <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white p-2">
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map(n => (
              <button key={n.label} onClick={() => scrollTo(n.anchor)} className="w-full text-left py-4 px-3 text-xl font-semibold text-white/80 hover:text-white border-b border-white/5 transition-colors">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-3 pt-8">
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 rounded-xl bg-violet-600 text-center font-semibold text-white">Get started free</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 rounded-xl border border-white/10 text-center font-semibold text-white/80">Sign in</Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════ HERO ══════════════════════════════ */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[120%] h-[80%] opacity-40"
            style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${PURPLE}55 0%, ${BLUE}25 45%, transparent 75%)` }} />
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] opacity-20 rounded-full blur-[120px]"
            style={{ background: PURPLE }} />
          <div className="absolute top-[15%] -right-[5%] w-[40%] h-[40%] opacity-15 rounded-full blur-[120px]"
            style={{ background: BLUE }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Eyebrow */}
          <div data-reveal className="lp-reveal inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-[12px] font-semibold text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 lp-live-dot" />
            10M+ teams collaborate on FlowTeam every day
          </div>

          {/* Headline */}
          <h1 data-reveal className="lp-reveal text-[clamp(2.6rem,7vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight mb-6">
            The workspace that{" "}
            <span className="lp-gradient-text" style={{ backgroundImage: `linear-gradient(135deg, ${PURPLE}, ${BLUE}, ${CYAN})` }}>
              actually connects
            </span>
            {" "}your team
          </h1>

          <p data-reveal className="lp-reveal text-[18px] lg:text-[20px] text-white/55 leading-relaxed max-w-2xl mx-auto mb-10">
            Chat, plan, and meet in one place — so decisions don&apos;t get lost between Slack, Jira, and Zoom.
          </p>

          {/* CTA row */}
          <div data-reveal className="lp-reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/register">
              <button className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-[15px] text-white shadow-xl shadow-violet-500/30 transition-all hover:-translate-y-0.5">
                Start for free
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <button
              onClick={() => scrollTo("demo")}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] font-semibold text-[15px] text-white/80 transition-all"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <Play size={10} className="fill-white text-white ml-0.5" />
              </div>
              Watch 2-min demo
            </button>
          </div>

          <div data-reveal className="lp-reveal flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/35 font-medium">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Cancel anytime</span>
          </div>
        </div>

        {/* Hero product screenshot */}
        <div id="demo" data-reveal className="lp-reveal mt-16 lg:mt-20 relative mx-auto max-w-5xl">
          <div className="absolute -inset-px rounded-2xl opacity-40" style={{ background: `linear-gradient(135deg, ${PURPLE}55, ${BLUE}33, transparent)`, padding: "1px" }} />
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d1117] overflow-hidden shadow-[0_40px_120px_-16px_rgba(0,0,0,0.8)]">
            {/* App chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/40">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto text-[11px] text-white/30 font-mono">app.flowteam.io — #engineering</div>
            </div>
            <HeroAppUI />
          </div>

          {/* Floating notification cards */}
          <FloatingCard
            className="-top-6 -right-4 lg:-right-12"
            delay="0s"
            icon={<div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: PURPLE }}>SP</div>}
            title="Sprint 14 started"
            sub="12 tasks · 2 sprinters"
          />
          <FloatingCard
            className="-bottom-6 -left-4 lg:-left-12"
            delay="1.4s"
            icon={<div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Check size={14} className="text-emerald-400" /></div>}
            title="Task completed"
            sub="Mobile push notifications"
          />
          <FloatingCard
            className="top-[40%] -right-4 lg:-right-16 hidden lg:flex"
            delay="0.7s"
            icon={<div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center"><Video size={14} className="text-cyan-400" /></div>}
            title="Meeting in 5m"
            sub="Sprint review · 4 joined"
          />
        </div>
      </section>

      {/* ══════════════════ LOGO MARQUEE ══════════════════════════════ */}
      <section className="py-12 border-y border-white/[0.04] overflow-hidden">
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-8">
          Trusted by teams at the world&apos;s best companies
        </p>
        <div className="relative">
          <div className="flex gap-16 animate-[marquee_28s_linear_infinite] whitespace-nowrap" ref={marqueeRef}>
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span key={i} className="text-[15px] font-bold text-white/20 hover:text-white/40 transition-colors select-none shrink-0">
                {name}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030712] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030712] to-transparent pointer-events-none" />
        </div>
      </section>

      {/* ══════════════════ STATS STRIP ══════════════════════════════ */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} data-reveal className="lp-reveal text-center">
              <div className="text-[2.6rem] font-extrabold tracking-tight mb-1 lp-gradient-text" style={{ backgroundImage: `linear-gradient(135deg, #fff, rgba(255,255,255,0.55))` }}>
                {s.value}
              </div>
              <div className="text-[12px] font-medium text-white/40 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ BENTO FEATURE GRID ═══════════════════════ */}
      <section id="features" className="py-20 lg:py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-4">
              Everything in one place
            </div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold tracking-tight mb-4">
              All-in-one. Actually unified.
            </h2>
            <p className="text-[16px] lg:text-[18px] text-white/45 max-w-2xl mx-auto">
              Slack&apos;s speed, Jira&apos;s structure, Zoom&apos;s reliability — in one workspace your whole company can standardize on.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div
                key={f.id}
                data-reveal
                className={cn(
                  "lp-reveal group relative rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden flex flex-col transition-all duration-300 hover:border-white/[0.12] hover:shadow-2xl",
                  f.span
                )}
                style={{ "--accent": f.accent } as React.CSSProperties}
              >
                {/* Top accent bar */}
                <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }} />
                <div className="absolute top-0 left-0 right-0 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top left, ${f.accent}20, transparent 60%)` }} />

                <div className="relative z-10 p-6 lg:p-8 flex flex-col flex-1">
                  {/* Icon + label */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${f.accent}22` }}>
                      <f.icon size={17} style={{ color: f.accent }} />
                    </div>
                    <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: f.accent }}>{f.label}</span>
                  </div>
                  <h3 className="text-[18px] lg:text-[20px] font-bold mb-2 text-white leading-snug">{f.headline}</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed mb-6">{f.body}</p>

                  {/* Preview area */}
                  <div className="mt-auto rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
                    {f.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ WORKFLOW STEPS ════════════════════════════ */}
      <section className="py-20 lg:py-32 px-6 border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-widest text-violet-400 mb-4">How it works</div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-5">
                From idea to shipped, in one thread.
              </h2>
              <p className="text-[16px] text-white/45 leading-relaxed mb-10">
                Discuss in chat → turn messages into tasks → review in meetings → ship. Context is preserved at every step.
              </p>

              <div className="space-y-5">
                {WORKFLOW.map((step, i) => (
                  <div key={step.title} className="flex items-start gap-4 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[12px] font-bold text-white/40 group-hover:border-violet-500/40 group-hover:text-violet-300 transition-colors mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-white mb-0.5">{step.title}</div>
                      <div className="text-[13px] text-white/40 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden">
              <WorkflowPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ USE CASES ══════════════════════════════════ */}
      <section id="use-cases" className="py-20 lg:py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal text-center mb-16">
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold tracking-tight mb-4">
              Built for every team.
            </h2>
            <p className="text-[16px] text-white/45">Whether you&apos;re a startup of 5 or an enterprise of 5,000.</p>
          </div>

          <div data-reveal className="lp-reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES.map(uc => (
              <div key={uc.title} className="group rounded-2xl border border-white/[0.07] bg-[#0d1117] p-6 hover:border-white/[0.14] transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-colors" style={{ background: `${uc.accent}20` }}>
                  <uc.icon size={18} style={{ color: uc.accent }} />
                </div>
                <div className="text-[15px] font-semibold text-white mb-2">{uc.title}</div>
                <div className="text-[13px] text-white/40 leading-relaxed mb-4">{uc.desc}</div>
                <ul className="space-y-2">
                  {uc.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-white/50">
                      <Check size={11} className="text-emerald-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ INTEGRATIONS ══════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-widest text-cyan-400 mb-4">Integrations</div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-4">
                Works with the tools you already use.
              </h2>
              <p className="text-[15px] text-white/45 leading-relaxed mb-8">
                Connect GitHub, Figma, Google Workspace, Salesforce, and 1,000+ more. Or build your own integration with our REST API and webhooks.
              </p>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-[14px] font-semibold text-white/70 hover:text-white transition-all">
                Explore all integrations <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {INTEGRATIONS.map(int => (
                <div key={int.name} className="rounded-xl border border-white/[0.07] bg-[#0d1117] p-4 flex flex-col items-center text-center gap-2 hover:border-white/[0.14] transition-all group">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${int.color}20` }}>
                    <int.icon size={18} style={{ color: int.color }} />
                  </div>
                  <div className="text-[12px] font-semibold text-white/60 group-hover:text-white/90 transition-colors">{int.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════════════════ */}
      <section className="py-20 lg:py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight mb-3">
              Loved by teams that ship.
            </h2>
            <div className="flex items-center justify-center gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-[13px] text-white/40">4.8 / 5 across 2,400+ reviews</span>
            </div>
          </div>

          {/* Featured testimonial */}
          <div data-reveal className="lp-reveal relative rounded-2xl border border-white/[0.07] bg-[#0d1117] p-8 lg:p-12 mb-6 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${PURPLE}88, transparent)` }} />
            <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400 mb-4">{activeTestimonial.metric}</div>
            <p className="text-[18px] lg:text-[22px] font-medium leading-relaxed text-white/80 mb-8 max-w-3xl">
              &ldquo;{activeTestimonial.quote}&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-[13px]">
                {activeTestimonial.avatar}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-white">{activeTestimonial.name}</div>
                <div className="text-[12px] text-white/40">{activeTestimonial.role} · {activeTestimonial.company}</div>
              </div>
            </div>
            {/* Dots */}
            <div className="absolute bottom-6 right-8 flex items-center gap-1.5">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setTestimonialIdx(i)}
                  className={cn("rounded-full transition-all", i === testimonialIdx ? "w-5 h-1.5 bg-violet-500" : "w-1.5 h-1.5 bg-white/20")}
                />
              ))}
            </div>
          </div>

          {/* Mini proof points */}
          <div data-reveal className="lp-reveal grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROOF_POINTS.map(p => (
              <div key={p.label} className="rounded-xl border border-white/[0.06] bg-[#0d1117] p-5 text-center">
                <div className="text-[1.8rem] font-extrabold tracking-tight text-white mb-1">{p.value}</div>
                <div className="text-[11px] text-white/35 uppercase tracking-widest">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ SECURITY ══════════════════════════════════ */}
      <section id="security" className="py-20 lg:py-32 px-6 border-y border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-widest text-blue-400 mb-4">Security & Compliance</div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-5">
                Enterprise-grade trust, out of the box.
              </h2>
              <p className="text-[15px] text-white/45 leading-relaxed mb-8">
                SSO, audit logs, and data residency controls — without sacrificing the UX your teams will actually use.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {SECURITY_FEATS.map(f => (
                  <div key={f.title} className="rounded-xl border border-white/[0.07] bg-[#0d1117] p-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <f.icon size={14} className="text-blue-400" />
                      </div>
                      <div className="text-[13px] font-semibold text-white">{f.title}</div>
                    </div>
                    <div className="text-[12px] text-white/35 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {COMPLIANCE_BADGES.map(b => (
                <div key={b.name} className="rounded-2xl border border-white/[0.07] bg-[#0d1117] p-8 flex flex-col items-center text-center hover:border-blue-500/20 transition-all group">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <Shield size={24} className="text-blue-400" />
                  </div>
                  <div className="text-[14px] font-bold text-white">{b.name}</div>
                  <div className="text-[11px] text-white/35 mt-1">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ PRICING ═══════════════════════════════════ */}
      <section id="pricing" className="py-20 lg:py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold tracking-tight mb-4">Simple, transparent pricing.</h2>
            <p className="text-[16px] text-white/45 mb-8">Start free. Upgrade when you&apos;re ready. No surprises.</p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 p-1 rounded-xl border border-white/[0.08] bg-white/[0.03]">
              {(["monthly", "annual"] as BillingCycle[]).map(c => (
                <button
                  key={c}
                  onClick={() => setBillingCycle(c)}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize",
                    billingCycle === c ? "bg-white text-slate-900 shadow-sm" : "text-white/50 hover:text-white"
                  )}
                >
                  {c} {c === "annual" && <span className="ml-1 text-[10px] text-emerald-400 font-bold">save 20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div data-reveal className="lp-reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {pricing.map(tier => (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-7 transition-all duration-300",
                  tier.popular
                    ? "border-violet-500/40 bg-[#0d1117] shadow-[0_0_60px_-15px_rgba(124,58,237,0.4)] lg:scale-[1.03]"
                    : "border-white/[0.07] bg-[#0d1117] hover:border-white/[0.12]"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg bg-violet-600 text-[11px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </div>
                )}
                <div className="text-[16px] font-bold text-white mb-1">{tier.name}</div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[2.4rem] font-extrabold tracking-tight text-white">{priceForCycle(tier.price)}</span>
                  {tier.price !== "Custom" && (
                    <span className="text-[13px] text-white/35">
                      {billingCycle === "annual" && tier.price.startsWith("$") && tier.price !== "$0" ? "/mo billed yearly" : tier.period}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-white/35 mb-6 min-h-[2.5rem]">{tier.description}</p>

                <Link href="/register" className="mb-6">
                  <button className={cn(
                    "w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all",
                    tier.popular
                      ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                      : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white"
                  )}>
                    {tier.cta}
                  </button>
                </Link>

                <ul className="space-y-3">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/50">
                      <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FAQ ═══════════════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 border-t border-white/[0.04]">
        <div className="mx-auto max-w-3xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold tracking-tight mb-3">Frequently asked questions.</h2>
          </div>
          <div data-reveal className="lp-reveal space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className={cn("rounded-xl border transition-all", open ? "border-violet-500/25 bg-violet-500/[0.04]" : "border-white/[0.06] bg-[#0d1117]")}>
                  <button
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="text-[15px] font-semibold text-white/80">{f.q}</span>
                    <ChevronDown size={16} className={cn("text-white/30 shrink-0 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && <div className="px-6 pb-5 text-[14px] text-white/45 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ══════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #3b1060 0%, #1e3a8a 50%, #164e63 100%)` }} />
            <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse 60% 50% at 30% 50%, ${PURPLE}66, transparent 70%)` }} />
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

            <div className="relative z-10 px-8 py-16 lg:py-24 text-center max-w-3xl mx-auto">
              <div className="text-[12px] font-semibold uppercase tracking-widest text-violet-300 mb-4">Get started today</div>
              <h2 className="text-[clamp(2rem,5vw,3.8rem)] font-extrabold tracking-tight mb-5">
                Ready to transform how your team works?
              </h2>
              <p className="text-[16px] lg:text-[18px] text-white/65 mb-10">
                Start free in minutes, or schedule a personalized demo for your enterprise.
              </p>

              {ctaSubmitted ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-[18px] font-bold text-white">You&apos;re on the list!</p>
                  <p className="text-white/50 text-[14px]">We&apos;ll be in touch shortly.</p>
                  <Link href="/register"><button className="mt-2 px-8 py-3 rounded-xl bg-white text-slate-900 font-bold text-[15px] hover:bg-white/90 transition-all">Start free now</button></Link>
                </div>
              ) : (
                <form onSubmit={handleCta} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
                  <input
                    type="email" required value={ctaEmail} onChange={e => setCtaEmail(e.target.value)}
                    placeholder="Work email address"
                    className="flex-1 w-full px-5 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/35 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent backdrop-blur-sm"
                  />
                  <button type="submit" className="shrink-0 px-6 py-3.5 rounded-xl bg-white text-slate-900 font-bold text-[14px] hover:bg-white/90 transition-all shadow-xl whitespace-nowrap">
                    Start free
                  </button>
                </form>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[12px] text-white/40 font-medium">
                <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> 14-day trial</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Enterprise onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ════════════════════════════════════ */}
      <footer className="border-t border-white/[0.05] bg-[#030712] pt-16 pb-10 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <WordMark className="mb-5" />
              <p className="text-[13px] text-white/35 leading-relaxed max-w-[240px]">
                The all-in-one workspace for modern teams — chat, plan, and ship together.
              </p>
            </div>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <h5 className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-4">{col.title}</h5>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}><Link href="#" className="text-[13px] text-white/45 hover:text-white/80 transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.05]">
            <div className="text-[12px] text-white/25">© 2026 FlowTeam, Inc. All rights reserved.</div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-[12px] text-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                All systems operational
              </div>
              <button className="text-[12px] text-white/30 flex items-center gap-1.5 hover:text-white/60 transition-colors">
                <Globe size={13} /> EN
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function WordMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image src="/logo.png" alt="cowrk" width={130} height={44} className="object-contain" style={{ height: 28, width: "auto" }} />
    </div>
  );
}

function FloatingCard({ className, delay, icon, title, sub }: {
  className: string; delay: string; icon: React.ReactNode; title: string; sub: string;
}) {
  return (
    <div
      className={cn("absolute z-20 flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0d1117]/90 backdrop-blur-xl shadow-xl lp-float", className)}
      style={{ animationDelay: delay }}
    >
      {icon}
      <div>
        <div className="text-[12px] font-semibold text-white leading-none mb-0.5">{title}</div>
        <div className="text-[10px] text-white/40">{sub}</div>
      </div>
    </div>
  );
}

/* Hero app UI mock */
function HeroAppUI() {
  return (
    <div className="grid grid-cols-[180px_1fr] min-h-[340px] lg:min-h-[420px]">
      {/* Sidebar */}
      <div className="border-r border-white/[0.05] bg-black/20 p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Channels</div>
        {["# engineering", "# design", "# launches", "# general"].map((c, i) => (
          <div key={c} className={cn("px-2.5 py-2 rounded-lg text-[12px] mb-0.5 cursor-pointer",
            i === 0 ? "bg-violet-600/30 text-white font-semibold" : "text-white/40 hover:text-white/60")}>
            {c}
          </div>
        ))}
        <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Direct</div>
        {["Ava Park", "Noah Chen", "Sam Liu"].map((n, i) => (
          <div key={n} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.03] mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: i === 0 ? "#10B981" : "#64748b" }} />
            <span className="text-[12px] text-white/40">{n}</span>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-black/10">
          <div>
            <div className="text-[13px] font-semibold text-white"># engineering</div>
            <div className="text-[10px] text-white/30">24 members</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400">Live</div>
          </div>
        </div>
        <div className="flex-1 p-5 space-y-4 overflow-hidden">
          <HeroMsg avatar="AP" name="Ava" time="2:14 PM" text="Sprint 14 just kicked off — who owns the push notification task?" />
          <HeroMsg avatar="NC" name="Noah" time="2:15 PM" text="That's me! Already created the board card and linked the Figma mockup." accent />
          <div className="ml-9 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3">
            <div className="flex items-center gap-2 mb-1">
              <Kanban size={11} className="text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400">Task created from message</span>
            </div>
            <div className="text-[11px] text-white/60">Push notification redesign · Assigned to @noah · Sprint 14</div>
          </div>
          <HeroMsg avatar="SL" name="Sam" time="2:17 PM" text="Nice! I'll pair with you on this tomorrow. Let's sync after standup." />
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <span className="text-[12px] text-white/25 flex-1">Message #engineering…</span>
            <div className="flex items-center gap-2 text-white/20">
              <Zap size={12} />
              <Users size={12} />
              <Video size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMsg({ avatar, name, time, text, accent }: { avatar: string; name: string; time: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0",
        accent ? "bg-violet-600" : "bg-slate-600")}>
        {avatar}
      </div>
      <div>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[12px] font-semibold text-white">{name}</span>
          <span className="text-[10px] text-white/25">{time}</span>
        </div>
        <p className="text-[12px] text-white/55 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

/* Bento previews */
function BentoChat() {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-0" style={{ minHeight: 160 }}>
      <div className="border-r border-white/[0.05] p-3 text-[10px] space-y-1">
        {["# delivery", "# eng", "# design"].map((c, i) => (
          <div key={c} className={cn("px-2 py-1 rounded", i === 0 ? "bg-violet-600/30 text-white" : "text-white/30")}>{c}</div>
        ))}
      </div>
      <div className="p-4 space-y-2.5">
        <BentoChatBubble name="Ava" text="Decision: ship by Friday." />
        <BentoChatBubble name="Noah" text="Task created ✓" highlight />
        <div className="text-[10px] text-white/25 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Decision linked to board
        </div>
      </div>
    </div>
  );
}
function BentoChatBubble({ name, text, highlight }: { name: string; text: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg p-2.5 text-[11px]", highlight ? "border border-violet-500/25 bg-violet-500/10" : "border border-white/[0.06] bg-white/[0.02]")}>
      <span className="font-semibold text-white/70">{name}: </span>
      <span className="text-white/50">{text}</span>
    </div>
  );
}

function BentoBoard() {
  return (
    <div className="grid grid-cols-3 gap-2 p-4" style={{ minHeight: 140 }}>
      {[
        { col: "To do", tasks: ["API docs", "Dark mode"], color: "#2563EB" },
        { col: "Doing", tasks: ["Mobile UI"], color: "#7C3AED" },
        { col: "Done", tasks: ["Auth flow"], color: "#10B981" },
      ].map(col => (
        <div key={col.col} className="rounded-lg border border-white/[0.05] overflow-hidden">
          <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40 border-b border-white/[0.05]" style={{ borderTopColor: col.color, borderTopWidth: 2 }}>{col.col}</div>
          <div className="p-2 space-y-1.5">
            {col.tasks.map(t => (
              <div key={t} className="rounded bg-white/[0.04] px-2 py-1.5 text-[10px] text-white/50">{t}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BentoMeeting() {
  return (
    <div className="p-4" style={{ minHeight: 140 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-white/60">Sprint review · Live</div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 lp-live-dot" /> Recording
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["AP", "NC", "SL", "ER"].map((i, idx) => (
          <div key={i} className={cn("aspect-video rounded-lg flex items-center justify-center",
            idx === 0 ? "border border-cyan-500/40 bg-cyan-500/10" : "border border-white/[0.05] bg-white/[0.02]")}>
            <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white">{i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoAnalytics() {
  return (
    <div className="p-4" style={{ minHeight: 140 }}>
      <div className="text-[10px] text-white/30 mb-3">Velocity · Sprint 14</div>
      <div className="flex items-end gap-1.5 h-16">
        {[45, 62, 55, 70, 80, 72, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, ${MINT}88, ${MINT}22)` }} />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-white/30">
        <span>Week 1</span><span>Week 7</span>
      </div>
    </div>
  );
}

function BentoAI() {
  return (
    <div className="p-4" style={{ minHeight: 140 }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-pink-400" />
        <span className="text-[10px] font-semibold text-pink-400">AI summary</span>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] text-white/55 leading-relaxed rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
          3 tasks are overdue in Sprint 14. @noah is blocked on API docs — suggest pairing with @sam.
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2.5 py-1 rounded bg-pink-500/15 text-[10px] font-semibold text-pink-400 border border-pink-500/20">Assign</button>
          <button className="px-2.5 py-1 rounded bg-white/[0.04] text-[10px] font-semibold text-white/40 border border-white/[0.06]">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function WorkflowPreview() {
  return (
    <div className="p-6 space-y-3">
      {[
        { step: "Discuss", icon: MessageSquare, color: PURPLE, desc: "Ship onboarding by Friday?" },
        { step: "Plan", icon: Kanban, color: BLUE, desc: "Task created · Sprint 14 · @ava" },
        { step: "Meet", icon: Video, color: CYAN, desc: "Sprint review · Agenda attached" },
        { step: "Ship", icon: Zap, color: MINT, desc: "Deploy triggered · 0 blockers" },
      ].map((s, i) => (
        <div key={s.step} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}20` }}>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            {i < 3 && <div className="w-px flex-1 mt-1 min-h-[16px]" style={{ background: `linear-gradient(to bottom, ${s.color}40, transparent)` }} />}
          </div>
          <div className="pt-1 pb-3">
            <div className="text-[12px] font-bold text-white/70 mb-0.5">{s.step}</div>
            <div className="text-[12px] text-white/35">{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Static data ────────────────────────────────────────────────── */
const LOGOS = ["Shopify", "Stripe", "Notion", "Figma", "Vercel", "Linear", "Atlassian", "HubSpot", "Intercom", "Mixpanel", "Segment", "Twilio"];

const STATS = [
  { value: "10M+", label: "Active users" },
  { value: "150+", label: "Countries" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "4.8★", label: "Average rating" },
];

const WORKFLOW = [
  { title: "Discuss in channels", desc: "Threaded conversations that stay scoped to the right people and context." },
  { title: "Convert to tasks instantly", desc: "Click any message to create a task — owner, due date, and context attached automatically." },
  { title: "Review in meetings", desc: "Agenda-driven video calls with recordings that link back to the board." },
  { title: "Ship with confidence", desc: "Progress rolls up automatically — no weekly status update meetings required." },
];

const USE_CASES = [
  {
    title: "Software Teams",
    desc: "Connect code, tasks, and decisions — no context switching.",
    accent: PURPLE,
    icon: GitBranch,
    features: ["Sprint planning", "Deploy alerts in channels", "PR → task linking"],
  },
  {
    title: "Marketing Teams",
    desc: "From brief to publish without a single tool handoff.",
    accent: "#EC4899",
    icon: Zap,
    features: ["Editorial calendars", "Asset approval threads", "Campaign analytics"],
  },
  {
    title: "Remote Teams",
    desc: "Async by default, synchronous when it matters.",
    accent: CYAN,
    icon: Globe,
    features: ["Async video handoffs", "Time zone overlays", "Meeting recordings"],
  },
  {
    title: "Enterprise",
    desc: "Compliance, governance, and admin control at scale.",
    accent: BLUE,
    icon: Shield,
    features: ["SAML SSO + SCIM", "Data residency", "Audit logs"],
  },
];

const INTEGRATIONS = [
  { name: "GitHub", color: "#e2e8f0", icon: GitBranch },
  { name: "Figma", color: "#a259ff", icon: Sparkles },
  { name: "Google", color: "#4285F4", icon: Globe },
  { name: "Slack", color: "#E01E5A", icon: MessageSquare },
  { name: "Jira", color: "#0052CC", icon: Kanban },
  { name: "Salesforce", color: "#00A1E0", icon: BarChart3 },
  { name: "Okta", color: "#007DC1", icon: Lock },
  { name: "Webhooks", color: "#10B981", icon: Zap },
  { name: "Analytics", color: "#F59E0B", icon: Activity },
];

const PROOF_POINTS = [
  { value: "10M+", label: "Active users" },
  { value: "150+", label: "Countries" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.8★", label: "Rating" },
];

const SECURITY_FEATS = [
  { title: "SSO & SCIM", desc: "SAML 2.0 + automated provisioning via Okta, Azure AD", icon: Lock },
  { title: "Encryption", desc: "AES-256 at rest, TLS 1.3 in transit, end-to-end option", icon: Shield },
  { title: "Audit Logs", desc: "Full tamper-proof action history for compliance", icon: Activity },
  { title: "Data Residency", desc: "US, EU, and APAC data centers — your data, your region", icon: Globe },
];

const COMPLIANCE_BADGES = [
  { name: "SOC 2 Type II", sub: "Certified" },
  { name: "GDPR", sub: "Compliant" },
  { name: "HIPAA", sub: "Eligible" },
  { name: "ISO 27001", sub: "Certified" },
];

const FOOTER_COLS = [
  { title: "Product", links: ["Chat", "Projects", "Meetings", "Analytics", "AI Assistant"] },
  { title: "Solutions", links: ["Startups", "Remote teams", "Enterprise", "Agile", "Operations"] },
  { title: "Resources", links: ["Documentation", "Tutorials", "Community", "Status", "Support"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact", "Legal"] },
];
