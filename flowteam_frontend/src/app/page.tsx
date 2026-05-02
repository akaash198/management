"use client";

import Link from "next/link";
import { useState } from "react";
import { aiFeatures, comparisons, faqs, meetingHighlights, pricing, rbacRoles, securityHighlights, testimonials } from "./landingContent";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GitBranch,
  Globe,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  Play,
  Quote,
  Shield,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────
   LANDING PAGE
   ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#06060e] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0a0a16]/90 px-5 py-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] mx-4 lg:mx-auto">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "AI", href: "#ai" },
              { label: "Meetings", href: "#meetings" },
              { label: "Security", href: "#security" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-white/45 transition-all hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3.5 py-2 text-[13px] font-medium text-white/50 transition-all hover:bg-white/[0.06] hover:text-white md:block"
            >
              Sign in
            </Link>
            <Link href="/register">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-500 px-4 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:bg-indigo-400 hover:shadow-[0_0_32px_rgba(99,102,241,0.7)]">
                Get started free
                <ArrowRight size={12} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">

        {/* Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Primary glow */}
          <div className="absolute left-1/2 top-[-10%] h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-indigo-600/[0.15] blur-[140px]" />
          {/* Secondary accents */}
          <div className="absolute left-[15%] top-[30%] h-[500px] w-[500px] rounded-full bg-violet-700/[0.1] blur-[120px]" />
          <div className="absolute right-[15%] top-[25%] h-[400px] w-[400px] rounded-full bg-cyan-600/[0.08] blur-[100px]" />
          {/* Noise / grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Radial vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,transparent_0%,#06060e_70%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Eyebrow badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/[0.12] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300 shadow-[0_0_24px_rgba(99,102,241,0.15)]">
            <Sparkles size={10} className="text-indigo-400" />
            The Modern Team OS
            <span className="ml-1 rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
              v2.0
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-[clamp(3rem,7.5vw,5.5rem)] font-black leading-[1.02] tracking-[-0.04em]">
            <span className="text-white">Ship faster.</span>
            <br />
            <span
              className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent"
              style={{ WebkitTextStroke: "0px" }}
            >
              Stay aligned.
            </span>
          </h1>

          {/* Sub */}
          <p className="mx-auto mb-10 max-w-lg text-[1.05rem] leading-[1.7] text-white/45">
            FlowTeam unifies Kanban, real-time chat, sprint planning, and team analytics
            — so your team can move fast without breaking things.
          </p>

          {/* CTAs */}
          <div className="mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <button className="group inline-flex h-13 items-center gap-2.5 rounded-2xl bg-indigo-500 px-8 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:scale-[1.03] hover:bg-indigo-400 hover:shadow-[0_0_56px_rgba(99,102,241,0.7)]">
                Start for free
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/login">
              <button className="inline-flex h-13 items-center gap-2.5 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-8 text-[15px] font-semibold text-white/65 backdrop-blur-sm transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white">
                <Play size={13} className="fill-current" />
                Watch demo
              </button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <p className="text-[12px] text-white/25">No credit card required</p>
            <span className="hidden text-white/15 sm:block">·</span>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1.5 text-[12px] text-white/30">4.9 from 2,000+ reviews</span>
            </div>
          </div>
        </div>

        {/* Hero mockup */}
        <div className="relative z-10 mt-20 w-full max-w-5xl px-4">
          {/* Floating badge above */}
          <div className="absolute -top-5 left-1/2 z-20 -translate-x-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-[#06060e] px-4 py-1.5 text-[11px] font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live · 3 teammates online
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0d0d1c] shadow-[0_60px_120px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Window chrome */}
            <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <div className="ml-4 flex h-5 w-52 items-center justify-center rounded-md bg-white/[0.05] text-[10px] text-white/20">
                app.flowteam.io/projects/alpha
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[9px] text-white/30">
                  <Bell size={9} /> Notifications
                </div>
                <div className="h-5 w-5 rounded-full bg-indigo-500/40 ring-1 ring-indigo-400/40 text-[8px] flex items-center justify-center text-white/60 font-bold">A</div>
                <div className="h-5 w-5 rounded-full bg-violet-500/40 ring-1 ring-violet-400/40 text-[8px] flex items-center justify-center text-white/60 font-bold">J</div>
                <div className="h-5 w-5 rounded-full bg-cyan-500/40 ring-1 ring-cyan-400/40 text-[8px] flex items-center justify-center text-white/60 font-bold">S</div>
              </div>
            </div>

            {/* App body */}
            <div className="flex h-[420px]">

              {/* Left sidebar */}
              <div className="flex w-44 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015] px-3 py-4">
                {/* Team name */}
                <div className="mb-4 flex items-center gap-2 px-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] font-black text-white">F</div>
                  <span className="text-[11px] font-bold text-white/70">FlowTeam</span>
                </div>
                {/* Nav groups */}
                <div className="space-y-0.5 text-[10px]">
                  {[
                    { icon: LayoutDashboard, label: "Dashboard", active: false },
                    { icon: Kanban,          label: "Projects",  active: true  },
                    { icon: MessageSquare,   label: "Messages",  active: false },
                    { icon: Video,           label: "Meetings",  active: false },
                    { icon: BarChart3,       label: "Analytics", active: false },
                    { icon: Shield,          label: "Security",  active: false },
                  ].map(({ icon: I, label, active }) => (
                    <div key={label} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 font-medium transition-colors ${active ? "bg-indigo-500/15 text-indigo-300" : "text-white/35 hover:text-white/55"}`}>
                      <I size={11} className={active ? "text-indigo-400" : ""} />
                      {label}
                    </div>
                  ))}
                </div>
                {/* Sprint chip */}
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/20">Active Sprint</p>
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.08] px-2.5 py-2">
                    <p className="text-[10px] font-semibold text-indigo-300">Sprint 4</p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full w-[62%] rounded-full bg-indigo-500" />
                    </div>
                    <p className="mt-1 text-[9px] text-white/25">62% · 5 days left</p>
                  </div>
                </div>
                {/* AI briefing chip */}
                <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/[0.07] px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={9} className="text-violet-400" />
                    <p className="text-[10px] font-semibold text-violet-300">AI Briefing</p>
                    <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                  </div>
                  <p className="mt-1 text-[9px] leading-[1.4] text-white/30">3 tasks due today · 1 blocker</p>
                </div>
              </div>

              {/* Main Kanban area */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.01] px-4 py-2.5">
                  <span className="text-[11px] font-bold text-white/60">Alpha · Sprint 4</span>
                  <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[9px] font-bold text-indigo-300">In Progress</span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[9px] text-white/35">
                      <GitBranch size={9} /> main ↑2 PRs
                    </div>
                    <div className="h-6 w-px bg-white/[0.07]" />
                    <div className="flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[9px] text-white/35">
                      <Timer size={9} /> 14h logged
                    </div>
                  </div>
                </div>
                {/* Kanban columns */}
                <div className="flex flex-1 gap-2.5 overflow-x-auto p-3.5">
                  {mockColumns.map((col) => (
                    <MockColumn key={col.title} {...col} />
                  ))}
                </div>
              </div>

              {/* Right chat panel */}
              <div className="flex w-52 shrink-0 flex-col border-l border-white/[0.06] bg-white/[0.015]">
                {/* Chat header */}
                <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
                  <MessageSquare size={10} className="text-cyan-400" />
                  <span className="text-[10px] font-semibold text-white/55">#alpha-dev</span>
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                {/* Messages */}
                <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
                  {[
                    { avatar: "A", color: "bg-indigo-500/50", name: "Alex",  msg: "Auth PR is up, tagging for review 👀",       time: "9:02" },
                    { avatar: "J", color: "bg-violet-500/50", name: "Jamie", msg: "On it. Also blocked on the API rate limit spec", time: "9:05" },
                    { avatar: "S", color: "bg-cyan-500/50",   name: "Sara",  msg: "Spec is in #backend-docs, linking it now",    time: "9:06" },
                    { avatar: "A", color: "bg-indigo-500/50", name: "Alex",  msg: "Sprint 4 retro — who's running it?",          time: "9:11" },
                    { avatar: "J", color: "bg-violet-500/50", name: "Jamie", msg: "AI can draft it 🤖 one sec",                  time: "9:12" },
                  ].map((m, i) => (
                    <div key={i} className="flex gap-1.5">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${m.color}`}>{m.avatar}</div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[9px] font-semibold text-white/60">{m.name}</span>
                          <span className="text-[8px] text-white/20">{m.time}</span>
                        </div>
                        <p className="text-[9px] leading-[1.5] text-white/38">{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* AI catch-me-up */}
                <div className="border-t border-white/[0.06] bg-violet-500/[0.05] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={8} className="text-violet-400" />
                    <span className="text-[9px] font-semibold text-violet-300">AI Catch-me-up</span>
                  </div>
                  <p className="text-[8px] leading-[1.5] text-white/30">Auth PR open · API blocked · retro drafted by AI</p>
                </div>
                {/* Input */}
                <div className="border-t border-white/[0.06] px-3 py-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5">
                    <span className="flex-1 text-[9px] text-white/20">Message #alpha-dev…</span>
                    <Zap size={9} className="text-white/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow beneath mockup */}
          <div className="absolute -bottom-20 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>
      </section>

      {/* ── Social proof bar ────────────────────── */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/[0.08] to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6">
          <p className="mb-10 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/20">
            Trusted by high-velocity teams worldwide
          </p>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────── */}
      <section id="features" className="py-32 px-6 scroll-mt-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-400">
              Everything in one place
            </div>
            <h2 className="mb-4 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.035em] text-white">
              Built for teams that move fast
            </h2>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-white/35">
              Every tool your team needs, perfectly integrated — no more tab switching or context loss.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} featured={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features ─────────────────────────── */}
      <section id="ai" className="py-32 px-6 scroll-mt-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.10] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300 shadow-[0_0_24px_rgba(139,92,246,0.15)]">
              <Sparkles size={10} className="text-violet-400" />
              Powered by Claude AI
            </div>
            <h2 className="mb-4 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.035em] text-white">
              Your team's AI co-pilot
            </h2>
            <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-white/38">
              12 AI features that eliminate the busywork — briefings, summaries, prioritisation, and automation — all included in the AI plan.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {aiFeatures.map((f) => (
              <AiFeatureCard key={f.title} {...f} />
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link href="/register">
              <button className="group inline-flex h-12 items-center gap-2.5 rounded-2xl bg-violet-500 px-8 text-[14px] font-semibold text-white shadow-[0_0_36px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:scale-[1.03] hover:bg-violet-400 hover:shadow-[0_0_52px_rgba(139,92,246,0.6)]">
                Start AI free trial
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <p className="text-[12px] text-white/25">14-day trial · No card required · Cancel any time</p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              4.9 from 2,000+ reviews
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              Teams love FlowTeam
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Competitor comparison ────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              See the difference
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              FlowTeam vs the alternatives
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/38">
              One workspace that replaces Jira, Slack, and Notion — without the integrations tax.
            </p>
          </div>
          <ComparisonTable />
        </div>
      </section>

      {/* ── Workflow steps ──────────────────────── */}
      <section id="how" className="py-28 px-6 scroll-mt-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              How it works
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              Up and running in minutes
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles section ───────────────────────── */}
      <section id="roles" className="py-28 px-6 scroll-mt-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-400">
              For every role
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              One tool, every perspective
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {roles.map((r) => (
              <RoleCard key={r.title} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Meetings & calendar â”€â”€ */}
      <section id="meetings" className="py-28 px-6 scroll-mt-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Meetings, without the chaos
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              Instant calls + scheduled meetings
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/38">
              Start a meeting in one click, schedule ahead, keep attendees in sync, and link conversations to the work.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {meetingHighlights.map((item) => (
              <DetailCard key={item.title} {...item} />
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <button className="group inline-flex h-11 items-center gap-2 rounded-2xl bg-cyan-500 px-6 text-[13px] font-semibold text-white shadow-[0_0_28px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_42px_rgba(6,182,212,0.45)]">
                Try meetings
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/calendar">
              <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 text-[13px] font-semibold text-white/55 transition-all hover:border-white/20 hover:text-white">
                View calendar
                <CalendarDays size={14} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ Security & RBAC â”€â”€ */}
      <section id="security" className="py-28 px-6 scroll-mt-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-300">
              Security by default
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              Company-style roles & access control
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-[15px] leading-relaxed text-white/38">
              Clear authority boundaries for CEO/Admin/Manager/Employee, project-level permissions, and audit trails for accountability.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {securityHighlights.map((item) => (
              <DetailCard key={item.title} {...item} />
            ))}
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {rbacRoles.map((r) => (
              <RbacRoleCard key={r.role} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* â”€â”€ FAQ â”€â”€ */}
      <section id="faq" className="py-28 px-6 scroll-mt-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Answers
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
              Frequently asked questions
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((f) => (
              <FaqCard key={f.q} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────── */}
      <section className="px-6 py-28">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/[0.09] p-1">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-indigo-500/25 via-violet-500/10 to-cyan-500/15 opacity-60" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0d0d1c] px-10 py-14 text-center">
            {/* Inner glows */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-500/8 blur-2xl" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
                <Zap size={10} className="fill-indigo-400 text-indigo-400" />
                Free to start · No card needed
              </div>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.035em] text-white">
                Ready to reach peak flow?
              </h2>
              <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-white/40">
                Join teams that deliver faster, communicate clearly, and never lose track of what matters.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <button className="group inline-flex h-13 items-center gap-2.5 rounded-2xl bg-indigo-500 px-8 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:scale-[1.03] hover:bg-indigo-400 hover:shadow-[0_0_56px_rgba(99,102,241,0.7)]">
                    Create your workspace
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="inline-flex h-13 items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-8 text-[15px] font-semibold text-white/55 transition-all hover:border-white/20 hover:text-white">
                    Sign in instead
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">
          <Logo />
          <p className="text-[12px] text-white/20">© 2026 FlowTeam Inc. All rights reserved.</p>
          <div className="flex gap-6 text-[12px] text-white/25">
            {["Privacy", "Terms", "Status", "Contact"].map((item) => (
              <a key={item} href="#" className="transition-colors hover:text-white/60">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
   ───────────────────────────────────────────── */

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
        <Kanban size={15} className="text-white" />
      </div>
      <span className="text-[15px] font-bold tracking-[-0.025em] text-white">FlowTeam</span>
    </div>
  );
}

function StatCard({ value, label, icon: Icon, trend }: { value: string; label: string; icon?: React.ElementType; trend?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-center transition-all hover:border-white/[0.12] hover:bg-white/[0.05]">
      <p className="text-[2.2rem] font-black tracking-[-0.04em] text-white">{value}</p>
      {trend && (
        <div className="mx-auto mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <TrendingUp size={9} />
          {trend}
        </div>
      )}
      <p className="mt-1.5 text-[12px] text-white/30">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  glow,
  featured,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  glow: string;
  featured?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:scale-[1.01] ${
      featured
        ? "border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04] md:col-span-2 lg:col-span-1"
        : "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.13] hover:bg-white/[0.05]"
    }`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(350px circle at 30% 0%, ${glow} 0%, transparent 70%)`,
        }}
      />
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${color} ring-1 ring-white/[0.08]`}>
        <Icon size={19} />
      </div>
      <h3 className="mb-2 text-[15px] font-semibold text-white">{title}</h3>
      <p className="text-[13px] leading-[1.65] text-white/38">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-indigo-400/0 transition-all group-hover:text-indigo-400">
        Learn more <ChevronRight size={11} />
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
}: {
  step: { number: string; title: string; description: string; icon: React.ElementType };
  index: number;
}) {
  const Icon = step.icon;
  const colors = [
    "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-300",
    "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-300",
    "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-300",
    "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300",
  ];
  const [gradFrom, gradTo, borderColor, textColor] = colors[index].split(" ");

  return (
    <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 transition-all hover:border-white/[0.12] hover:bg-white/[0.05]">
      <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br ${colors[index]}`}>
        <Icon size={20} />
      </div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/20">
        Step {step.number}
      </div>
      <h3 className="mb-2 text-[15px] font-bold text-white">{step.title}</h3>
      <p className="text-[13px] leading-[1.65] text-white/38">{step.description}</p>
    </div>
  );
}

function RoleCard({
  emoji,
  title,
  subtitle,
  perks,
  accent,
  gradientClass,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  perks: string[];
  accent: string;
  gradientClass: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-all hover:border-white/[0.14] hover:bg-white/[0.05]`}>
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${gradientClass}`} />
      <div className="relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-2xl">
            {emoji}
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">{title}</p>
            <p className="text-[12px] text-white/30">{subtitle}</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-[13px] text-white/45">
              <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${accent}`} />
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function accentToStyle(accent: string) {
  switch (accent) {
    case "cyan":
      return { pill: "border-cyan-500/20 bg-cyan-500/[0.10] text-cyan-300", glow: "rgba(6,182,212,0.12)" };
    case "rose":
      return { pill: "border-rose-500/20 bg-rose-500/[0.10] text-rose-300", glow: "rgba(244,63,94,0.12)" };
    case "emerald":
      return { pill: "border-emerald-500/20 bg-emerald-500/[0.10] text-emerald-300", glow: "rgba(16,185,129,0.12)" };
    case "amber":
      return { pill: "border-amber-500/20 bg-amber-500/[0.10] text-amber-300", glow: "rgba(245,158,11,0.12)" };
    case "violet":
      return { pill: "border-violet-500/20 bg-violet-500/[0.10] text-violet-300", glow: "rgba(139,92,246,0.12)" };
    default:
      return { pill: "border-indigo-500/20 bg-indigo-500/[0.10] text-indigo-300", glow: "rgba(99,102,241,0.12)" };
  }
}

function DetailCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  bullets,
  accent = "indigo",
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  accent?: string;
}) {
  const style = accentToStyle(accent);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-all hover:border-white/[0.14] hover:bg-white/[0.05]">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at 25% 0%, ${style.glow} 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${style.pill}`}>
            <Icon size={12} />
            {eyebrow}
          </div>
        </div>
        <h3 className="text-[16px] font-bold text-white">{title}</h3>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/40">{description}</p>
        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] text-white/45">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-white/55" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RbacRoleCard({
  role,
  subtitle,
  bullets,
  accent = "indigo",
}: {
  role: string;
  subtitle: string;
  bullets: readonly string[];
  accent?: string;
}) {
  const style = accentToStyle(accent);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${style.pill}`}>
            {role}
          </div>
          <p className="mt-2 text-[13px] text-white/40">{subtitle}</p>
        </div>
        <div className="h-10 w-10 rounded-2xl border border-white/[0.10] bg-white/[0.04] flex items-center justify-center">
          <Shield size={16} className="text-white/65" />
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="text-[13px] text-white/45 flex items-start gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/35" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-28 px-6 scroll-mt-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
            Start free, scale later
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.035em] text-white">
            Simple plans for real teams
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/38">
            Pick a plan that fits your team. Upgrade when you need more members, projects, or AI.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5">
            <button
              onClick={() => setYearly(false)}
              className={[
                "rounded-xl px-5 py-2 text-[13px] font-semibold transition-all",
                !yearly
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-white/35 hover:text-white/60",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-all",
                yearly
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-white/35 hover:text-white/60",
              ].join(" ")}
            >
              Yearly
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {pricing.map((tier) => (
            <PricingCard key={tier.name} {...tier} yearly={yearly} />
          ))}
        </div>

        {/* Fine print */}
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-[12px] text-white/25">
            All plans include Google OAuth sign-in, 2FA, audit log access, and browser push notifications.
            Yearly plans billed annually. Cancel any time.
          </p>
          <div className="flex items-center gap-6 text-[12px] text-white/20">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400/60" /> No credit card for Free</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400/60" /> Cancel any time</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400/60" /> Data export on all plans</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  monthlyPrice,
  yearlyPrice,
  priceSuffix,
  subtitle,
  limit,
  bullets,
  highlight,
  badge,
  accentColor,
  cta,
  yearly,
}: {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  priceSuffix: string;
  subtitle: string;
  limit: string;
  bullets: readonly string[];
  highlight?: boolean;
  badge?: string;
  accentColor?: "violet";
  cta: { label: string; href: string };
  yearly: boolean;
}) {
  const isViolet = accentColor === "violet";
  const displayPrice = yearly ? yearlyPrice : monthlyPrice;

  const cardClass = [
    "relative flex flex-col overflow-hidden rounded-2xl border p-7 transition-all",
    isViolet
      ? "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.10] to-indigo-500/[0.05]"
      : highlight
      ? "border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.10] to-violet-500/[0.05]"
      : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.13] hover:bg-white/[0.05]",
  ].join(" ");

  const badgePillClass = isViolet
    ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
    : "border-indigo-400/25 bg-indigo-400/10 text-indigo-200";

  const ctaBtnClass = isViolet
    ? "bg-violet-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-violet-400"
    : highlight
    ? "bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-indigo-400"
    : "border border-white/[0.10] bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white";

  const checkClass = isViolet
    ? "text-violet-400"
    : highlight
    ? "text-indigo-400"
    : "text-emerald-400";

  return (
    <div className={cardClass}>
      {/* Glow */}
      {(highlight || isViolet) && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: isViolet
              ? "radial-gradient(500px circle at 50% -30%, rgba(139,92,246,0.15) 0%, transparent 70%)"
              : "radial-gradient(500px circle at 50% -30%, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Badge */}
      {badge && (
        <div className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${badgePillClass}`}>
          {badge}
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Plan name + subtitle */}
        <div>
          <h3 className="text-[17px] font-black tracking-[-0.02em] text-white">{name}</h3>
          <p className="mt-1 text-[12px] text-white/35">{subtitle}</p>
        </div>

        {/* Price */}
        <div className="mt-6 flex items-end gap-2">
          <div className="text-[38px] font-black leading-none tracking-[-0.04em] text-white">
            {displayPrice}
          </div>
          {displayPrice !== "€0" && (
            <div className="pb-1 text-[12px] leading-snug text-white/30">
              {yearly ? "/mo, billed yearly" : `/${priceSuffix}`}
            </div>
          )}
        </div>
        {displayPrice === "€0" && (
          <p className="mt-1 text-[12px] text-white/30">forever free</p>
        )}
        {yearly && displayPrice !== "€0" && (
          <p className="mt-1 text-[11px] text-emerald-400/70">
            You save {name === "Pro" ? "€72" : "€168"}/yr vs monthly
          </p>
        )}

        {/* Limit pill */}
        <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/40">
          <Users size={10} />
          {limit}
        </div>

        {/* Feature list */}
        <ul className="mt-6 flex-1 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] text-white/50">
              <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${checkClass}`} />
              {b}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-7">
          <Link href={cta.href}>
            <button className={`group inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[13px] font-semibold transition-all ${ctaBtnClass}`}>
              {cta.label}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-all hover:border-white/[0.14] hover:bg-white/[0.05]">
      <p className="text-[14px] font-bold text-white">{q}</p>
      <p className="mt-2 text-[13px] leading-[1.65] text-white/40">{a}</p>
    </div>
  );
}

function AiFeatureCard({
  icon: Icon,
  title,
  description,
  stat,
  statLabel,
  accent = "indigo",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  accent?: string;
}) {
  const style = accentToStyle(accent);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-all hover:border-white/[0.14] hover:bg-white/[0.05]">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(380px circle at 25% 0%, ${style.glow} 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${style.pill} ring-1 ring-white/[0.06]`}>
          <Icon size={18} />
        </div>
        <h3 className="mb-2 text-[15px] font-bold text-white">{title}</h3>
        <p className="text-[13px] leading-[1.65] text-white/40">{description}</p>
        <div className="mt-5 flex items-end gap-1.5 border-t border-white/[0.06] pt-5">
          <span className="text-[22px] font-black leading-none tracking-[-0.03em] text-white">{stat}</span>
          <span className="pb-0.5 text-[11px] text-white/35">{statLabel}</span>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
  company,
  avatar,
  avatarColor,
}: {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  avatarColor: string;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-all hover:border-white/[0.14] hover:bg-white/[0.05]">
      <Quote size={28} className="mb-4 shrink-0 text-white/10" />
      <p className="flex-1 text-[14px] leading-[1.75] text-white/55">{quote}</p>
      <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor}`}>
          {avatar}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{name}</p>
          <p className="text-[11px] text-white/35">{role} · {company}</p>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable() {
  const cols = [
    { key: "flowteam", label: "FlowTeam", highlight: true },
    { key: "jira",     label: "Jira",     highlight: false },
    { key: "notion",   label: "Notion",   highlight: false },
    { key: "asana",    label: "Asana",    highlight: false },
  ] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
      {/* Header */}
      <div className="grid grid-cols-5 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="col-span-2 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
          Feature
        </div>
        {cols.map((col) => (
          <div
            key={col.key}
            className={`px-4 py-4 text-center text-[12px] font-bold ${
              col.highlight ? "text-indigo-300" : "text-white/35"
            }`}
          >
            {col.highlight && (
              <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
            )}
            {col.label}
          </div>
        ))}
      </div>
      {/* Rows */}
      {comparisons.map((row, i) => (
        <div
          key={row.feature}
          className={`grid grid-cols-5 border-b border-white/[0.05] transition-colors hover:bg-white/[0.02] ${
            i % 2 === 0 ? "" : "bg-white/[0.015]"
          }`}
        >
          <div className="col-span-2 px-6 py-3.5 text-[13px] text-white/55">{row.feature}</div>
          {cols.map((col) => {
            const val = row[col.key as keyof typeof row] as boolean;
            return (
              <div key={col.key} className="flex items-center justify-center px-4 py-3.5">
                {val ? (
                  <CheckCircle2
                    size={16}
                    className={col.highlight ? "text-indigo-400" : "text-white/30"}
                  />
                ) : (
                  <X size={14} className="text-white/15" />
                )}
              </div>
            );
          })}
        </div>
      ))}
      {/* Footer CTA */}
      <div className="flex items-center justify-between bg-white/[0.02] px-6 py-4">
        <p className="text-[12px] text-white/25">
          All features included on the Free plan — no gatekeeping.
        </p>
        <Link href="/register">
          <button className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-indigo-500 px-4 text-[12px] font-semibold text-white transition-all hover:bg-indigo-400">
            Try free
            <ArrowRight size={11} />
          </button>
        </Link>
      </div>
    </div>
  );
}

function MockColumn({
  title,
  color,
  tasks,
}: {
  title: string;
  color: string;
  tasks: { label: string; priority: string; tag: string }[];
}) {
  return (
    <div className="w-44 shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
        <p className="text-[10px] font-semibold text-white/50">{title}</p>
        <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-white/20">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => (
          <div
            key={task.label}
            className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-2 transition-colors hover:border-white/[0.1] hover:bg-white/[0.06]"
          >
            <p className="text-[10px] font-medium leading-snug text-white/70">{task.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${priorityClasses[task.priority as keyof typeof priorityClasses]}`}
              >
                {task.priority}
              </span>
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[8px] text-white/30">
                {task.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */

const priorityClasses = {
  urgent: "bg-red-500/15 text-red-300",
  high:   "bg-amber-500/15 text-amber-300",
  normal: "bg-indigo-500/15 text-indigo-300",
  low:    "bg-emerald-500/15 text-emerald-300",
};

const mockColumns = [
  {
    title: "Backlog",
    color: "bg-white/20",
    tasks: [
      { label: "Research competitors", priority: "low",    tag: "Research" },
      { label: "API rate-limit design", priority: "normal", tag: "Backend" },
    ],
  },
  {
    title: "In Progress",
    color: "bg-indigo-400",
    tasks: [
      { label: "Fix login redirect bug", priority: "urgent", tag: "Auth" },
      { label: "Sprint 3 planning",      priority: "high",   tag: "PM" },
    ],
  },
  {
    title: "Review",
    color: "bg-amber-400",
    tasks: [
      { label: "Dashboard redesign",  priority: "high",   tag: "Design" },
      { label: "Write unit tests",    priority: "normal", tag: "QA" },
    ],
  },
  {
    title: "Done ✓",
    color: "bg-emerald-400",
    tasks: [
      { label: "User auth flow",      priority: "normal", tag: "Auth" },
      { label: "Deploy staging env",  priority: "low",    tag: "DevOps" },
    ],
  },
];

const stats = [
  { value: "10k+",  label: "Active users",       trend: "+24% this month" },
  { value: "98%",   label: "Uptime SLA",          trend: "30-day average" },
  { value: "4.9★",  label: "User rating",         trend: "2,000+ reviews" },
  { value: "<100ms", label: "Avg response time",  trend: "p95 latency" },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    description:
      "Personal command center with priority radar, delivery velocity, and saved workspace lenses.",
    color: "bg-indigo-500/15 text-indigo-300",
    glow: "rgba(99,102,241,0.1)",
  },
  {
    icon: Kanban,
    title: "Kanban Boards",
    description:
      "Drag-and-drop Kanban with custom columns, sub-tasks, task links, and real-time sync.",
    color: "bg-violet-500/15 text-violet-300",
    glow: "rgba(139,92,246,0.1)",
  },
  {
    icon: MessageSquare,
    title: "Real-time Messaging",
    description:
      "Channels, threads, reactions, voice calls, file sharing, and @mentions — all in one place.",
    color: "bg-cyan-500/15 text-cyan-300",
    glow: "rgba(6,182,212,0.1)",
  },
  {
    icon: Video,
    title: "Meetings & Calendar",
    description:
      "Create instant meetings or schedule ahead with attendees, join links, and a calendar view for your team.",
    color: "bg-sky-500/15 text-sky-300",
    glow: "rgba(14,165,233,0.1)",
  },
  {
    icon: GitBranch,
    title: "Sprint Planning",
    description:
      "Sprints, milestones, roadmaps, workload analysis, and backlog management built in.",
    color: "bg-emerald-500/15 text-emerald-300",
    glow: "rgba(16,185,129,0.1)",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Delivery velocity, burn-down charts, member performance, and exportable reports.",
    color: "bg-amber-500/15 text-amber-300",
    glow: "rgba(245,158,11,0.1)",
  },
  {
    icon: Shield,
    title: "Roles & Audit",
    description:
      "Fine-grained permissions per project, time-limited roles, and a tamper-proof audit log.",
    color: "bg-rose-500/15 text-rose-300",
    glow: "rgba(244,63,94,0.1)",
  },
  {
    icon: Timer,
    title: "Time Tracking",
    description:
      "Built-in timer and manual log per task. See estimated vs actual hours at a glance.",
    color: "bg-sky-500/15 text-sky-300",
    glow: "rgba(14,165,233,0.1)",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "In-app and email notifications with digest mode, per-channel muting, and keyword alerts.",
    color: "bg-fuchsia-500/15 text-fuchsia-300",
    glow: "rgba(217,70,239,0.1)",
  },
  {
    icon: Globe,
    title: "Client Portal",
    description:
      "Share selected columns and documents with external clients — no account required.",
    color: "bg-teal-500/15 text-teal-300",
    glow: "rgba(20,184,166,0.1)",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your workspace",
    description:
      "Register, name your team, and invite your colleagues in under two minutes.",
    icon: Users,
  },
  {
    number: "02",
    title: "Set up your first project",
    description:
      "Pick a template or start from scratch. Add columns that match your workflow.",
    icon: Kanban,
  },
  {
    number: "03",
    title: "Assign and track work",
    description:
      "Create tasks, set priorities and due dates, log time, and move cards across the board.",
    icon: ClipboardList,
  },
  {
    number: "04",
    title: "Ship with confidence",
    description:
      "Use sprints, milestones, and velocity metrics to deliver on time — every sprint.",
    icon: Zap,
  },
];

const roles = [
  {
    emoji: "🏢",
    title: "Executives & CEOs",
    subtitle: "See the full picture",
    accent: "text-indigo-400",
    gradientClass: "bg-gradient-to-br from-indigo-500/[0.07] to-transparent",
    perks: [
      "Cross-team delivery velocity",
      "Approval workflows & sign-offs",
      "Audit log for compliance",
      "Super-admin platform control",
    ],
  },
  {
    emoji: "🎯",
    title: "Project Managers",
    subtitle: "Plan and deliver",
    accent: "text-violet-400",
    gradientClass: "bg-gradient-to-br from-violet-500/[0.07] to-transparent",
    perks: [
      "Sprint planning & roadmaps",
      "Workload balancing",
      "Milestone tracking",
      "Recurring task automation",
    ],
  },
  {
    emoji: "👩‍💻",
    title: "Developers & Teams",
    subtitle: "Focus on the work",
    accent: "text-cyan-400",
    gradientClass: "bg-gradient-to-br from-cyan-500/[0.07] to-transparent",
    perks: [
      "Kanban board with subtasks",
      "Time tracking per task",
      "Real-time team chat",
      "Issue navigator with bulk actions",
    ],
  },
];
