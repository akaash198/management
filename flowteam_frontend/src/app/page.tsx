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
  Plus,
  Search,
  Settings,
  HelpCircle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

/* ─── Monday.com Brand Colors ───────────────────────────────────── */
const MONDAY_INDIGO = "#6161FF";
const MONDAY_BLUE   = "#0086F0";
const MONDAY_GREEN  = "#00C875";
const MONDAY_ORANGE = "#FDAB3D";
const MONDAY_RED    = "#E2445C";
const MONDAY_PURPLE = "#A25DDC";
const MONDAY_PINK   = "#FF158A";
const MONDAY_CYAN   = "#00CFF4";
const MONDAY_YELLOW = "#FFCB00";

type BoardRow = {
  id: string;
  name: string;
  owner: { name: string; avatar: string; bg: string };
  status: "Working on it" | "Done" | "Stuck" | "Not Started";
  priority: "High" | "Medium" | "Low";
  timeline: string;
  taskRef: string;
};

export default function LandingPage() {
  const [isScrolled, setIsScrolled]           = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [billingCycle, setBillingCycle]       = useState<BillingCycle>("annual");
  const [openFaq, setOpenFaq]                 = useState<number | null>(null);
  const [ctaEmail, setCtaEmail]               = useState("");
  const [ctaSubmitted, setCtaSubmitted]       = useState(false);
  const [testimonialIdx, setTestimonialIdx]   = useState(0);
  const [selectedUseCase, setSelectedUseCase] = useState<"software" | "marketing" | "remote" | "enterprise">("software");
  const [searchQuery, setSearchQuery] = useState("");
  
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

  /* ─── Monday.com Board Mock Data & Interaction ────────────────── */
  const defaultBoards: Record<string, { title: string; groupName: string; color: string; rows: BoardRow[] }> = {
    software: {
      title: "🚀 Sprint 14 Backlog",
      groupName: "Active Development",
      color: MONDAY_ORANGE,
      rows: [
        { id: "s1", name: "API Authentication Service", owner: { name: "Ava Park", avatar: "AP", bg: "bg-[#0086F0]" }, status: "Working on it", priority: "High", timeline: "May 12 - 18", taskRef: "@ava" },
        { id: "s2", name: "Dark Mode Design Polish", owner: { name: "Noah Chen", avatar: "NC", bg: "bg-[#7C3AED]" }, status: "Done", priority: "Medium", timeline: "May 10 - 14", taskRef: "@noah" },
        { id: "s3", name: "HD Meeting Recording Transcripts", owner: { name: "Sam Liu", avatar: "SL", bg: "bg-[#00C875]" }, status: "Stuck", priority: "High", timeline: "May 15 - 22", taskRef: "@sam" },
        { id: "s4", name: "Mobile Push Notification Redesign", owner: { name: "Elena Rodriguez", avatar: "ER", bg: "bg-[#E2445C]" }, status: "Not Started", priority: "Low", timeline: "May 20 - 25", taskRef: "@elena" },
      ]
    },
    marketing: {
      title: "📅 Campaign Calendar",
      groupName: "Active Campaigns",
      color: MONDAY_PINK,
      rows: [
        { id: "m1", name: "Q2 Product Launch Brief", owner: { name: "Sam Liu", avatar: "SL", bg: "bg-[#00C875]" }, status: "Done", priority: "High", timeline: "May 1 - 8", taskRef: "@sam" },
        { id: "m2", name: "Social Media Video Series", owner: { name: "Noah Chen", avatar: "NC", bg: "bg-[#7C3AED]" }, status: "Working on it", priority: "Medium", timeline: "May 5 - 15", taskRef: "@noah" },
        { id: "m3", name: "Creative Assets Approval", owner: { name: "Elena Rodriguez", avatar: "ER", bg: "bg-[#E2445C]" }, status: "Stuck", priority: "High", timeline: "May 12 - 18", taskRef: "@elena" },
        { id: "m4", name: "Campaign Retrospectives", owner: { name: "Ava Park", avatar: "AP", bg: "bg-[#0086F0]" }, status: "Not Started", priority: "Low", timeline: "May 22 - 28", taskRef: "@ava" },
      ]
    },
    remote: {
      title: "🌐 Async Team Coordination",
      groupName: "This Week's Focus",
      color: MONDAY_CYAN,
      rows: [
        { id: "r1", name: "Weekly Async Check-in", owner: { name: "Ava Park", avatar: "AP", bg: "bg-[#0086F0]" }, status: "Working on it", priority: "Medium", timeline: "May 10 - 15", taskRef: "@ava" },
        { id: "r2", name: "Time Zone Overlay Setup", owner: { name: "Sam Liu", avatar: "SL", bg: "bg-[#00C875]" }, status: "Done", priority: "High", timeline: "May 8 - 12", taskRef: "@sam" },
        { id: "r3", name: "Meeting Transcription Service", owner: { name: "Noah Chen", avatar: "NC", bg: "bg-[#7C3AED]" }, status: "Done", priority: "Medium", timeline: "May 12 - 16", taskRef: "@noah" },
        { id: "r4", name: "Async Video Handoff Protocol", owner: { name: "Elena Rodriguez", avatar: "ER", bg: "bg-[#E2445C]" }, status: "Not Started", priority: "Low", timeline: "May 18 - 24", taskRef: "@elena" },
      ]
    },
    enterprise: {
      title: "🛡️ Security & Compliance Roadmap",
      groupName: "Q2 Compliance Audits",
      color: MONDAY_BLUE,
      rows: [
        { id: "e1", name: "SAML SSO Integration Setup", owner: { name: "Elena Rodriguez", avatar: "ER", bg: "bg-[#E2445C]" }, status: "Working on it", priority: "High", timeline: "May 1 - 15", taskRef: "@elena" },
        { id: "e2", name: "SOC 2 Type II Certification", owner: { name: "Ava Park", avatar: "AP", bg: "bg-[#0086F0]" }, status: "Done", priority: "High", timeline: "Apr 1 - May 1", taskRef: "@ava" },
        { id: "e3", name: "Data Residency Provisioning", owner: { name: "Sam Liu", avatar: "SL", bg: "bg-[#00C875]" }, status: "Working on it", priority: "Medium", timeline: "May 10 - 25", taskRef: "@sam" },
        { id: "e4", name: "Custom Data Retention Policies", owner: { name: "Noah Chen", avatar: "NC", bg: "bg-[#7C3AED]" }, status: "Not Started", priority: "Medium", timeline: "May 25 - Jun 10", taskRef: "@noah" },
      ]
    }
  };

  const [boardRows, setBoardRows] = useState<BoardRow[]>(defaultBoards.software.rows);

  // Sync board state when category is changed
  useEffect(() => {
    setBoardRows(defaultBoards[selectedUseCase].rows);
    setSearchQuery("");
  }, [selectedUseCase]);

  const handleAddItem = () => {
    const defaultOwner = {
      software: { name: "Ava Park", avatar: "AP", bg: "bg-[#0086F0]" },
      marketing: { name: "Noah Chen", avatar: "NC", bg: "bg-[#7C3AED]" },
      remote: { name: "Sam Liu", avatar: "SL", bg: "bg-[#00C875]" },
      enterprise: { name: "Elena Rodriguez", avatar: "ER", bg: "bg-[#E2445C]" }
    }[selectedUseCase];

    const defaultNames = {
      software: "New Authentication Service Mock",
      marketing: "New Ad Campaign Launch",
      remote: "Team Alignment Sync Handoff",
      enterprise: "New Compliance Certificate"
    }[selectedUseCase];

    const newRow: BoardRow = {
      id: `new_${Date.now()}`,
      name: defaultNames,
      owner: defaultOwner,
      status: "Not Started",
      priority: "Medium",
      timeline: "May 25 - 30",
      taskRef: "@new"
    };
    setBoardRows(rows => [...rows, newRow]);
  };

  const cycleStatus = (id: string) => {
    setBoardRows(rows => rows.map(r => {
      if (r.id !== id) return r;
      const statusCycle: Record<string, "Working on it" | "Done" | "Stuck" | "Not Started"> = {
        "Not Started": "Working on it",
        "Working on it": "Done",
        "Done": "Stuck",
        "Stuck": "Not Started"
      };
      return { ...r, status: statusCycle[r.status] };
    }));
  };

  const cyclePriority = (id: string) => {
    setBoardRows(rows => rows.map(r => {
      if (r.id !== id) return r;
      const priorityCycle: Record<string, "High" | "Medium" | "Low"> = {
        "Low": "Medium",
        "Medium": "High",
        "High": "Low"
      };
      return { ...r, priority: priorityCycle[r.priority] };
    }));
  };

  const activeBoard = defaultBoards[selectedUseCase];
  const filteredRows = boardRows.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));

  /* ─── Bento features ────────────────────────────────────────── */
  const FEATURES: {
    id: string; icon: React.ElementType; label: string; headline: string;
    body: string; accent: string; gradient: string; span?: string; preview: React.ReactNode;
  }[] = [
    {
      id: "chat",
      icon: MessageSquare,
      label: "Real-Time Chat",
      headline: "Conversations that become decisions.",
      body: "Channels, threads, DMs, and reactions — with context that automatically links to tasks.",
      accent: MONDAY_PURPLE,
      gradient: "from-[#A25DDC]/5 via-white to-white",
      span: "lg:col-span-2",
      preview: <BentoChat />,
    },
    {
      id: "boards",
      icon: Kanban,
      label: "Project Boards",
      headline: "Sprints, Kanban, or list — your call.",
      body: "Plan and track work in the view your team prefers, with real-time progress rollups.",
      accent: MONDAY_BLUE,
      gradient: "from-[#0086F0]/5 via-white to-white",
      preview: <BentoBoard />,
    },
    {
      id: "meetings",
      icon: Video,
      label: "Video Meetings",
      headline: "Meetings with built-in accountability.",
      body: "Agenda → recording → auto-attached to the project board. No notes lost in email.",
      accent: MONDAY_CYAN,
      gradient: "from-[#00CFF4]/5 via-white to-white",
      preview: <BentoMeeting />,
    },
    {
      id: "analytics",
      icon: BarChart3,
      label: "Analytics",
      headline: "Know what's actually happening.",
      body: "Burndown charts, velocity trends, and team health metrics — built in, not bolted on.",
      accent: MONDAY_GREEN,
      gradient: "from-[#00C875]/5 via-white to-white",
      preview: <BentoAnalytics />,
    },
    {
      id: "ai",
      icon: Sparkles,
      label: "AI Assistant",
      headline: "Summarize, assign, automate.",
      body: "Let AI surface blockers, draft status updates, and suggest task owners — instantly.",
      accent: MONDAY_PINK,
      gradient: "from-[#FF158A]/5 via-white to-white",
      preview: <BentoAI />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800 overflow-x-hidden font-monday selection:bg-[#6161FF]/10 selection:text-[#6161FF] light">

      {/* ══════════════════════════ NAV ══════════════════════════════ */}
      <header className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
          : "bg-white py-5"
      )}>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8 lg:gap-12">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus-visible:outline-none">
              <WordMark className="brightness-0" />
            </button>
            <nav className="hidden lg:flex items-center gap-7">
              {NAV.map(n => (
                <button
                  key={n.label}
                  onClick={() => scrollTo(n.anchor)}
                  className="text-[15px] font-medium text-slate-500 hover:text-[#6161FF] transition-colors"
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register">
              <button className="hidden sm:flex items-center gap-1.5 px-6 py-2.5 rounded-full monday-btn-primary text-[15px] font-medium text-white shadow-md">
                Get started free
                <ArrowRight size={15} />
              </button>
            </Link>
            <button className="lg:hidden text-slate-600 hover:text-slate-800 p-2" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col p-6" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between mb-10">
            <WordMark className="brightness-0" />
            <button onClick={() => setMobileMenuOpen(false)} className="text-slate-600 hover:text-slate-800 p-2">
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map(n => (
              <button key={n.label} onClick={() => scrollTo(n.anchor)} className="w-full text-left py-4 px-3 text-lg font-medium text-slate-700 hover:text-[#6161FF] border-b border-slate-100 transition-colors">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-3 pt-8">
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full py-3.5 rounded-full bg-[#6161FF] text-center font-medium text-white shadow-md">Get started free</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3.5 rounded-full border border-slate-200 text-center font-medium text-slate-700 hover:bg-slate-50">Sign in</Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════ HERO ══════════════════════════════ */}
      <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24 px-6 overflow-hidden bg-white">
        {/* Soft layout background mesh */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] opacity-10 blur-[120px] rounded-full"
            style={{ background: `radial-gradient(circle, ${MONDAY_INDIGO} 0%, ${MONDAY_CYAN} 100%)` }} />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] opacity-[0.06] blur-[100px] rounded-full"
            style={{ background: `radial-gradient(circle, ${MONDAY_PINK} 0%, ${MONDAY_YELLOW} 100%)` }} />
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Eyebrow */}
          <div data-reveal className="lp-reveal inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#00C875] lp-live-dot" />
            10M+ teams collaborate on Cowrk every day
          </div>

          {/* Headline */}
          <h1 data-reveal className="lp-reveal text-[clamp(2.5rem,6.5vw,5rem)] font-extrabold leading-[1.1] tracking-tight text-slate-900 mb-6 font-monday max-w-4xl mx-auto">
            The workspace that{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6161FF] via-[#A25DDC] to-[#00CFF4]">
              actually connects
            </span>
            {" "}your team
          </h1>

          <p data-reveal className="lp-reveal text-[18px] lg:text-[21px] text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Chat, plan, and meet in one place — so decisions don&apos;t get lost between Slack, Jira, and Zoom.
          </p>

          {/* CTA row */}
          <div data-reveal className="lp-reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/register">
              <button className="group flex items-center gap-2 px-8 py-4 rounded-full bg-[#6161FF] hover:bg-[#4b4bff] font-semibold text-[16px] text-white shadow-lg shadow-[#6161FF]/30 transition-all hover:-translate-y-0.5">
                Start for free
                <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <button
              onClick={() => scrollTo("demo")}
              className="flex items-center gap-2 px-8 py-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-[16px] text-slate-700 shadow-sm transition-all"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                <Play size={10} className="fill-slate-600 text-slate-600 ml-0.5" />
              </div>
              Watch 2-min demo
            </button>
          </div>

          <div data-reveal className="lp-reveal flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[#00C875]" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[#00C875]" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[#00C875]" /> Cancel anytime</span>
          </div>

          {/* Monday.com Style Selector Box */}
          <div data-reveal className="lp-reveal mt-16 max-w-4xl mx-auto">
            <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider mb-6">What would you like to manage with Cowrk?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "software", label: "Software Teams", color: MONDAY_ORANGE, bg: "hover:bg-[#FDAB3D]/5", border: "hover:border-[#FDAB3D]", icon: GitBranch },
                { key: "marketing", label: "Marketing Teams", color: MONDAY_PINK, bg: "hover:bg-[#FF158A]/5", border: "hover:border-[#FF158A]", icon: Zap },
                { key: "remote", label: "Remote Teams", color: MONDAY_CYAN, bg: "hover:bg-[#00CFF4]/5", border: "hover:border-[#00CFF4]", icon: Globe },
                { key: "enterprise", label: "Enterprise", color: MONDAY_BLUE, bg: "hover:bg-[#0086F0]/5", border: "hover:border-[#0086F0]", icon: Shield },
              ].map(opt => {
                const active = selectedUseCase === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedUseCase(opt.key as any)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-center group",
                      active
                        ? "bg-white border-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.06)] scale-[1.03]"
                        : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                    )}
                    style={{ borderTopWidth: active ? 4 : 1, borderTopColor: active ? opt.color : "" }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                      style={{ backgroundColor: active ? `${opt.color}15` : "#F6F6F9" }}>
                      <opt.icon size={18} style={{ color: active ? opt.color : "#64748B" }} />
                    </div>
                    <span className={cn("text-[14px] font-semibold transition-colors", active ? "text-slate-900" : "text-slate-600 group-hover:text-slate-800")}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hero Product Monday-style board screenshot */}
        <div id="demo" data-reveal className="lp-reveal mt-12 relative mx-auto max-w-5xl">
          {/* Floating Left Avatar Illustration */}
          <div className="absolute -left-24 top-[10%] z-20 hidden xl:flex flex-col items-center gap-2.5 w-28 lp-float select-none hover:scale-110 hover:-rotate-3 transition-all duration-300 ease-out cursor-pointer group/avatar">
            <div className="relative w-24 h-24 rounded-full border-2 border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden p-1 group-hover/avatar:border-[#FDAB3D]/40 transition-all duration-300">
              <Image src="/left_avatar.png" alt="Cowrk Build User" width={96} height={96} className="object-cover rounded-full" />
            </div>
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 px-3.5 py-1.5 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.06)] text-[12px] font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap group-hover/avatar:scale-105 group-hover/avatar:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all duration-300 border-b-2 border-b-[#FDAB3D]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FDAB3D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FDAB3D]"></span>
              </span>
              Cowrk Build 🚀
            </div>
          </div>

          {/* Floating Right Avatar Illustration */}
          <div className="absolute -right-24 top-[30%] z-20 hidden xl:flex flex-col items-center gap-2.5 w-28 lp-float-slow select-none hover:scale-110 hover:rotate-3 transition-all duration-300 ease-out cursor-pointer group/avatar">
            <div className="relative w-24 h-24 rounded-full border-2 border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden p-1 group-hover/avatar:border-[#00CFF4]/40 transition-all duration-300">
              <Image src="/right_avatar.png" alt="Cowrk Collab User" width={96} height={96} className="object-cover rounded-full" />
            </div>
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 px-3.5 py-1.5 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.06)] text-[12px] font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap group-hover/avatar:scale-105 group-hover/avatar:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all duration-300 border-b-2 border-b-[#00CFF4]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00CFF4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00CFF4]"></span>
              </span>
              Cowrk Share 🌐
            </div>
          </div>

          <div className="absolute -inset-px rounded-2xl opacity-10 bg-slate-300 blur-sm pointer-events-none" />
          <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            {/* Monday Board Header chrome */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="text-[12px] font-medium text-slate-400 font-mono select-none">workspace / board</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-slate-500 cursor-pointer hover:bg-slate-200">
                  <Settings size={13} />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-slate-500 cursor-pointer hover:bg-slate-200">
                  <HelpCircle size={13} />
                </div>
              </div>
            </div>

            {/* Interactive Mock Monday Board */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: activeBoard.color }} />
                    {activeBoard.title}
                  </h2>
                  <p className="text-[13px] text-slate-400 mt-1 select-none">Redesign the workspace inside Cowrk. Click status to cycle states.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search board..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-[#6161FF] focus:bg-white bg-slate-50 w-44 hover:border-slate-300 transition-all shadow-inner" 
                    />
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  </div>
                  <button 
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6161FF] text-white text-[12px] font-semibold shadow-sm hover:bg-[#4E4ED6] hover:shadow-[0_4px_12px_rgba(97,97,255,0.25)] active:scale-98 transition-all"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="overflow-x-auto border border-slate-150 rounded-lg bg-white">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 font-medium text-slate-550 select-none">
                      <th className="py-2.5 px-4 w-[40%]">{activeBoard.groupName}</th>
                      <th className="py-2.5 px-3 text-center w-[12%]">Owner</th>
                      <th className="py-2.5 px-3 text-center w-[16%]">Status</th>
                      <th className="py-2.5 px-3 text-center w-[14%]">Priority</th>
                      <th className="py-2.5 px-3 text-center w-[18%]">Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[13px] text-slate-400 italic bg-slate-50/20 select-none">
                          No tasks matching &quot;{searchQuery}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/70 border-b border-slate-100 last:border-0 text-slate-700 transition-all duration-200 hover:scale-[1.005] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] group/row">
                          {/* Task Title */}
                          <td className="py-3 px-4 font-semibold text-slate-850 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-sm transition-transform group-hover/row:scale-y-125" style={{ backgroundColor: activeBoard.color }} />
                            {row.name}
                          </td>
                          {/* Owner */}
                          <td className="py-3 px-3">
                            <div className="flex justify-center">
                              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-sm select-none ring-2 ring-white/60 hover:scale-115 hover:ring-slate-200 transition-all duration-200 cursor-pointer", row.owner.bg)} title={row.owner.name}>
                                {row.owner.avatar}
                              </div>
                            </div>
                          </td>
                          {/* Status badge */}
                          <td className="py-2 px-3">
                            <div
                              onClick={() => cycleStatus(row.id)}
                              className={cn(
                                "status-pill py-1.5 px-2 rounded text-center text-white text-[11px] font-bold shadow-sm select-none transition-all duration-150 active:scale-95 cursor-pointer hover:brightness-105",
                                row.status === "Done" && "bg-gradient-to-r from-[#00C875] to-[#00E085]",
                                row.status === "Working on it" && "bg-gradient-to-r from-[#FDAB3D] to-[#FFBC65]",
                                row.status === "Stuck" && "bg-gradient-to-r from-[#E2445C] to-[#F3556D]",
                                row.status === "Not Started" && "bg-gradient-to-r from-[#C4C4C4] to-[#D4D4D4]"
                              )}
                            >
                              {row.status}
                            </div>
                          </td>
                          {/* Priority badge */}
                          <td className="py-2 px-3">
                            <div
                              onClick={() => cyclePriority(row.id)}
                              className={cn(
                                "status-pill py-1.5 px-2 rounded text-center text-white text-[11px] font-bold shadow-sm select-none transition-all duration-150 active:scale-95 cursor-pointer hover:brightness-105",
                                row.priority === "High" && "bg-gradient-to-r from-[#E2445C] to-[#F3556D]",
                                row.priority === "Medium" && "bg-gradient-to-r from-[#0086F0] to-[#209BFF]",
                                row.priority === "Low" && "bg-gradient-to-r from-[#55C3FC] to-[#80D4FF]"
                              )}
                            >
                              {row.priority}
                            </div>
                          </td>
                          {/* Timeline */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 justify-center text-[11px] text-slate-655 font-semibold select-none bg-slate-100/80 hover:bg-slate-200/50 hover:text-slate-750 transition-all duration-200 py-1 px-2.5 rounded-full border border-slate-200/40">
                              <Calendar size={11} className="text-slate-400" />
                              {row.timeline}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chat preview connected below the board */}
            <div className="border-t border-slate-150 bg-slate-50 p-6 flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-[220px] shrink-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Linked Channel</div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#6161FF]/10 text-[#6161FF] font-semibold text-[13px]">
                  <MessageSquare size={14} />
                  <span># {selectedUseCase === "software" ? "engineering" : selectedUseCase === "marketing" ? "campaigns" : selectedUseCase === "remote" ? "remote-updates" : "enterprise-security"}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3.5 border-l border-slate-200 pl-4 md:pl-6">
                {selectedUseCase === "software" && (
                  <>
                    <HeroMsg avatar="AP" name="Ava" time="2:14 PM" text="Sprint 14 just kicked off — who owns the push notification task?" bg="bg-[#0086F0]" />
                    <HeroMsg avatar="NC" name="Noah" time="2:15 PM" text="That's me! Already created the board card and linked the Figma mockup." bg="bg-[#7C3AED]" accent />
                    <HeroMsg avatar="SL" name="Sam" time="2:17 PM" text="Nice! I'll pair with you on this tomorrow. Let's sync after standup." bg="bg-[#00C875]" />
                  </>
                )}
                {selectedUseCase === "marketing" && (
                  <>
                    <HeroMsg avatar="SL" name="Sam" time="10:05 AM" text="Let's align on the Q2 campaign assets." bg="bg-[#00C875]" />
                    <HeroMsg avatar="ER" name="Elena" time="10:08 AM" text="I've uploaded the Figma draft. Stuck on logo variants though." bg="bg-[#E2445C]" accent />
                    <HeroMsg avatar="NC" name="Noah" time="10:12 AM" text="I can take a look and give some feedback." bg="bg-[#7C3AED]" />
                  </>
                )}
                {selectedUseCase === "remote" && (
                  <>
                    <HeroMsg avatar="AP" name="Ava" time="4:30 PM" text="How are we doing on the time zone overlay setup?" bg="bg-[#0086F0]" />
                    <HeroMsg avatar="SL" name="Sam" time="4:32 PM" text="Done! It's deployed and active on all dashboards." bg="bg-[#00C875]" accent />
                    <HeroMsg avatar="ER" name="Elena" time="4:35 PM" text="Awesome, this will save so much sync time for the APAC team." bg="bg-[#E2445C]" />
                  </>
                )}
                {selectedUseCase === "enterprise" && (
                  <>
                    <HeroMsg avatar="ER" name="Elena" time="11:15 AM" text="Working on the SAML SSO integration setup." bg="bg-[#E2445C]" />
                    <HeroMsg avatar="AP" name="Ava" time="11:20 AM" text="We passed the SOC 2 Type II audit today! Congrats team." bg="bg-[#0086F0]" accent />
                    <HeroMsg avatar="SL" name="Sam" time="11:25 AM" text="That's huge news! Let's get the certification badges added." bg="bg-[#00C875]" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ LOGO MARQUEE ══════════════════════════════ */}
      <section className="py-12 bg-white border-y border-slate-100 overflow-hidden">
        <p className="text-center text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-8">
          Trusted by teams at the world&apos;s best companies
        </p>
        <div className="relative">
          <div className="flex gap-16 animate-[marquee_30s_linear_infinite] whitespace-nowrap" ref={marqueeRef}>
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span key={i} className="text-[16px] font-bold text-slate-300 hover:text-slate-400 transition-colors select-none shrink-0 font-monday">
                {name}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>
      </section>

      {/* ══════════════════ STATS STRIP ══════════════════════════════ */}
      <section className="py-16 px-6 bg-slate-50/50">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} data-reveal className="lp-reveal text-center">
              <div className="text-[40px] font-extrabold tracking-tight text-slate-800 mb-1 font-monday">
                {s.value}
              </div>
              <div className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ BENTO FEATURE GRID ═══════════════════════ */}
      <section id="features" className="py-20 lg:py-28 px-6 bg-[#F6F6F9]">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal text-center mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-4 shadow-sm">
              Everything in one place
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-tight text-slate-950 mb-4 font-monday">
              All-in-one. Actually unified.
            </h2>
            <p className="text-[16px] lg:text-[18px] text-slate-500 max-w-2xl mx-auto">
              Slack&apos;s speed, Jira&apos;s structure, Zoom&apos;s reliability — in one workspace your whole company can standardize on.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.id}
                data-reveal
                className={cn(
                  "lp-reveal group relative rounded-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 hover:border-slate-355 hover:shadow-lg bg-gradient-to-br",
                  f.gradient,
                  f.span
                )}
              >
                {/* Top accent line */}
                <div className="h-[3px] w-full" style={{ backgroundColor: f.accent }} />
                
                <div className="relative z-10 p-6 lg:p-8 flex flex-col flex-1">
                  {/* Icon + label */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${f.accent}12` }}>
                      <f.icon size={17} style={{ color: f.accent }} />
                    </div>
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: f.accent }}>{f.label}</span>
                  </div>
                  <h3 className="text-[19px] lg:text-[21px] font-bold mb-2 text-slate-900 leading-snug font-monday">{f.headline}</h3>
                  <p className="text-[14px] text-slate-500 leading-relaxed mb-6">{f.body}</p>

                  {/* Preview area */}
                  <div className="mt-auto rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden shadow-inner">
                    {f.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ WORKSPACE VIBE SECTION (Monday Vibe Style) ══════════════════ */}
      <section className="py-24 px-6 bg-white overflow-hidden relative border-b border-slate-100">
        <div className="mx-auto max-w-7xl relative z-10">
          <div data-reveal className="lp-reveal text-center mb-16">
            <h2 className="text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold tracking-tight text-slate-900 mb-4 font-monday">
              Build any <span className="text-[#6161FF]">workspace</span> in minutes
            </h2>
            <p className="text-[16px] lg:text-[18px] text-slate-500 max-w-2xl mx-auto font-medium">
              Reduce costs and clutter by replacing disconnected tools with custom workspaces tailored to how your business actually works.
            </p>
          </div>

          <WorkspaceVibeWidget />
        </div>
      </section>

      {/* ══════════════════ WORKFLOW STEPS ════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#6161FF] mb-4">How it works</div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-tight text-slate-900 mb-5 font-monday">
                From idea to shipped, in one thread.
              </h2>
              <p className="text-[16px] text-slate-500 leading-relaxed mb-10">
                Discuss in chat → turn messages into tasks → review in meetings → ship. Context is preserved at every step.
              </p>

              <div className="space-y-6">
                {WORKFLOW.map((step, i) => (
                  <div key={step.title} className="flex items-start gap-4 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[13px] font-bold text-slate-400 group-hover:border-[#6161FF] group-hover:text-[#6161FF] group-hover:bg-[#6161FF]/5 transition-all mt-0.5 shadow-sm">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-slate-800 mb-0.5 font-monday">{step.title}</div>
                      <div className="text-[13px] text-slate-500 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
              <WorkflowPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ USE CASES ══════════════════════════════════ */}
      <section id="use-cases" className="py-20 lg:py-28 px-6 bg-[#F6F6F9]">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal text-center mb-16">
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-tight text-slate-900 mb-4 font-monday">
              Built for every team.
            </h2>
            <p className="text-[16px] text-slate-500">Whether you&apos;re a startup of 5 or an enterprise of 5,000.</p>
          </div>

          <div data-reveal className="lp-reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map(uc => (
              <div key={uc.title} className="group rounded-2xl border border-slate-200 bg-white p-6 hover:border-slate-350 hover:shadow-md transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-colors" style={{ backgroundColor: `${uc.accent}12` }}>
                  <uc.icon size={18} style={{ color: uc.accent }} />
                </div>
                <div className="text-[16px] font-bold text-slate-800 mb-2 font-monday">{uc.title}</div>
                <div className="text-[13px] text-slate-500 leading-relaxed mb-4 min-h-[40px]">{uc.desc}</div>
                <ul className="space-y-2.5 pt-3 border-t border-slate-100">
                  {uc.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-slate-600">
                      <Check size={12} className="text-[#00C875] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ INTEGRATIONS ══════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#00CFF4] mb-4">Integrations</div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-tight text-slate-900 mb-4 font-monday">
                Works with the tools you already use.
              </h2>
              <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
                Connect GitHub, Figma, Google Workspace, Salesforce, and 1,000+ more. Or build your own integration with our REST API and webhooks.
              </p>
              <button className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[14px] font-bold text-slate-700 shadow-sm transition-all">
                Explore all integrations <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {INTEGRATIONS.map(int => (
                <div key={int.name} className="rounded-xl border border-slate-100 bg-[#F6F6F9] p-4 flex flex-col items-center text-center gap-2.5 hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${int.color}12` }}>
                    <int.icon size={18} style={{ color: int.color }} />
                  </div>
                  <div className="text-[13px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">{int.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 bg-[#F6F6F9]">
        <div className="mx-auto max-w-5xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-slate-900 mb-3 font-monday">
              Loved by teams that ship.
            </h2>
            <div className="flex items-center justify-center gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-[14px] text-slate-500 font-medium">4.8 / 5 across 2,400+ reviews</span>
            </div>
          </div>

          {/* Featured testimonial */}
          <div data-reveal className="lp-reveal relative rounded-2xl border border-slate-200 bg-white p-8 lg:p-12 mb-6 overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: MONDAY_INDIGO }} />
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#00C875] mb-4">{activeTestimonial.metric}</div>
            <p className="text-[18px] lg:text-[22px] font-medium leading-relaxed text-slate-700 mb-8 max-w-3xl font-monday">
              &ldquo;{activeTestimonial.quote}&rdquo;
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[#6161FF] flex items-center justify-center font-bold text-white text-[14px] shadow-sm select-none">
                  {activeTestimonial.avatar}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-slate-800 font-monday">{activeTestimonial.name}</div>
                  <div className="text-[13px] text-slate-400">{activeTestimonial.role} · {activeTestimonial.company}</div>
                </div>
              </div>
              
              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)}
                    className={cn("rounded-full transition-all", i === testimonialIdx ? "w-6 h-2 bg-[#6161FF]" : "w-2 h-2 bg-slate-200 hover:bg-slate-300")}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mini proof points */}
          <div data-reveal className="lp-reveal grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROOF_POINTS.map(p => (
              <div key={p.label} className="rounded-xl border border-slate-100 bg-white p-5 text-center shadow-sm">
                <div className="text-[28px] font-extrabold tracking-tight text-slate-800 mb-1 font-monday">{p.value}</div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ SECURITY ══════════════════════════════════ */}
      <section id="security" className="py-20 lg:py-28 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="lp-reveal grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#0086F0] mb-4">Security & Compliance</div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-tight text-slate-900 mb-5 font-monday">
                Enterprise-grade trust, out of the box.
              </h2>
              <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
                SSO, audit logs, and data residency controls — without sacrificing the UX your teams will actually use.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {SECURITY_FEATS.map(f => (
                  <div key={f.title} className="rounded-xl border border-slate-100 bg-[#F6F6F9] p-5 shadow-inner">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-[#0086F0]/10 flex items-center justify-center">
                        <f.icon size={14} className="text-[#0086F0]" />
                      </div>
                      <div className="text-[14px] font-bold text-slate-800 font-monday">{f.title}</div>
                    </div>
                    <div className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {COMPLIANCE_BADGES.map(b => (
                <div key={b.name} className="rounded-2xl border border-slate-200 bg-[#F6F6F9] p-8 flex flex-col items-center text-center hover:border-[#0086F0]/30 hover:bg-white hover:shadow-md transition-all group">
                  <div className="h-12 w-12 rounded-full bg-[#0086F0]/10 flex items-center justify-center mb-4 group-hover:bg-[#0086F0]/20 transition-colors">
                    <Shield size={22} className="text-[#0086F0]" />
                  </div>
                  <div className="text-[15px] font-bold text-slate-800 font-monday">{b.name}</div>
                  <div className="text-[12px] text-slate-400 mt-1">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ PRICING ═══════════════════════════════════ */}
      <section id="pricing" className="py-20 lg:py-28 px-6 bg-[#F6F6F9]">
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-extrabold tracking-tight text-slate-900 mb-4 font-monday">Simple, transparent pricing.</h2>
            <p className="text-[16px] text-slate-500 mb-8">Start free. Upgrade when you&apos;re ready. No surprises.</p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 rounded-full border border-slate-200 bg-white shadow-sm">
              {(["monthly", "annual"] as BillingCycle[]).map(c => (
                <button
                  key={c}
                  onClick={() => setBillingCycle(c)}
                  className={cn(
                    "px-6 py-2 rounded-full text-[13px] font-bold transition-all capitalize",
                    billingCycle === c ? "bg-[#6161FF] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {c} {c === "annual" && <span className="ml-1 text-[10px] text-[#00C875] font-extrabold bg-[#00C875]/10 px-2 py-0.5 rounded-full">save 20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div data-reveal className="lp-reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {pricing.map(tier => (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-7 transition-all duration-300 bg-white",
                  tier.popular
                    ? "border-[#6161FF] shadow-lg lg:scale-[1.03]"
                    : "border-slate-200 hover:border-slate-350 hover:shadow-md"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#6161FF] text-[11px] font-bold uppercase tracking-wider text-white shadow-sm select-none">
                    Most popular
                  </div>
                )}
                <div className="text-[18px] font-bold text-slate-850 mb-1 font-monday">{tier.name}</div>
                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className="text-[36px] font-extrabold tracking-tight text-slate-900 font-monday">{priceForCycle(tier.price)}</span>
                  {tier.price !== "Custom" && (
                    <span className="text-[13px] text-slate-400 font-medium">
                      {billingCycle === "annual" && tier.price.startsWith("$") && tier.price !== "$0" ? "/mo billed yearly" : tier.period}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-400 mb-6 min-h-[40px] leading-relaxed">{tier.description}</p>

                <Link href="/register" className="mb-6">
                  <button className={cn(
                    "w-full py-3 rounded-full text-[14px] font-bold transition-all shadow-sm",
                    tier.popular
                      ? "bg-[#6161FF] hover:bg-[#4b4bff] text-white"
                      : "border border-slate-250 bg-white hover:bg-slate-50 text-slate-700"
                  )}>
                    {tier.cta}
                  </button>
                </Link>

                <ul className="space-y-3.5 pt-6 border-t border-slate-100">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-650">
                      <Check size={14} className="text-[#00C875] shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FAQ ═══════════════════════════════════════ */}
      <section className="py-20 lg:py-28 px-6 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-3xl">
          <div data-reveal className="lp-reveal text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-slate-900 mb-3 font-monday">Frequently asked questions.</h2>
          </div>
          <div data-reveal className="lp-reveal space-y-3.5">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className={cn("rounded-xl border transition-all", open ? "border-[#6161FF]/30 bg-[#6161FF]/5" : "border-slate-200 bg-white")}>
                  <button
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="text-[15px] font-bold text-slate-800 font-monday">{f.q}</span>
                    <ChevronDown size={17} className={cn("text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && <div className="px-6 pb-5 text-[14px] text-slate-500 leading-relaxed border-t border-slate-100/30 pt-3">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ══════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
            {/* Sleek, premium dark slate background with subtle glow */}
            <div className="absolute inset-0 bg-[#0F172A]" />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_100%_100%,rgba(97,97,255,0.25),transparent_60%),radial-gradient(circle_at_0%_0%,rgba(0,207,244,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            <div className="relative z-10 px-8 py-16 lg:py-20 text-center max-w-3xl mx-auto text-white">
              <div className="text-[12px] font-bold uppercase tracking-widest text-white/80 mb-4 bg-white/10 inline-block px-4 py-1 rounded-full border border-white/10">Get started today</div>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold tracking-tight mb-5 font-monday leading-tight">
                Ready to transform how your team works?
              </h2>
              <p className="text-[16px] lg:text-[18px] text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Start free in minutes, or schedule a personalized demo for your enterprise.
              </p>

              {ctaSubmitted ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                    <Check size={24} className="text-white" />
                  </div>
                  <p className="text-[20px] font-bold text-white font-monday">You&apos;re on the list!</p>
                  <p className="text-white/85 text-[14px]">We&apos;ll be in touch shortly.</p>
                  <Link href="/register"><button className="mt-2 px-8 py-3.5 rounded-full bg-white text-[#6161FF] font-bold text-[15px] hover:bg-slate-50 transition-all shadow-md">Start free now</button></Link>
                </div>
              ) : (
                <form onSubmit={handleCta} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto bg-white/10 p-2 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <input
                    type="email" required value={ctaEmail} onChange={e => setCtaEmail(e.target.value)}
                    placeholder="Work email address"
                    className="flex-1 w-full px-5 py-3 rounded-xl bg-white border border-transparent text-slate-800 placeholder:text-slate-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#6161FF]/40 focus:bg-white"
                  />
                  <button type="submit" className="shrink-0 w-full sm:w-auto px-8 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-[14px] transition-all shadow-sm whitespace-nowrap">
                    Start free
                  </button>
                </form>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[13px] text-white/90 font-medium">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-white" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-white" /> 14-day trial</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-white" /> Enterprise onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ════════════════════════════════════ */}
      <footer className="border-t border-slate-100 bg-[#0F172A] text-white pt-16 pb-10 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <WordMark className="mb-5" />
              <p className="text-[13px] text-slate-400 leading-relaxed max-w-[240px]">
                The all-in-one workspace for modern teams — chat, plan, and ship together.
              </p>
            </div>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-550 mb-4">{col.title}</h5>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}><Link href="#" className="text-[13px] text-slate-400 hover:text-white transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800">
            <div className="text-[13px] text-slate-400">© 2026 Cowrk, Inc. All rights reserved.</div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00C875] lp-live-dot" />
                All systems operational
              </div>
              <button className="text-[13px] text-slate-400 flex items-center gap-1.5 hover:text-white transition-colors">
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

function HeroMsg({ avatar, name, time, text, bg, accent }: { avatar: string; name: string; time: string; text: string; bg: string; accent?: boolean }) {
  return (
    <div className={cn(
      "flex items-start gap-3.5 p-2 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-transparent hover:border-slate-100",
      accent && "bg-white/40"
    )}>
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white shrink-0 select-none shadow-sm ring-2 ring-white/60", bg)}>
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[12.5px] font-bold text-slate-800">{name}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">{time}</span>
        </div>
        <p className={cn("text-[13px] leading-relaxed", accent ? "text-slate-900 font-medium" : "text-slate-655")}>{text}</p>
      </div>
    </div>
  );
}

/* Bento previews in light mode */
function BentoChatBubble({ name, text, highlight, avatar, bg }: { name: string; text: string; highlight?: boolean; avatar: string; bg: string }) {
  return (
    <div className={cn("flex gap-2.5 items-start text-[11px] transition-all", highlight ? "animate-[pulse_4s_infinite]" : "")}>
      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center font-bold text-white text-[9px] shrink-0 shadow-sm select-none", bg)}>
        {avatar}
      </div>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-slate-700">{name}</span>
          <span className="text-[9px] text-slate-400 font-medium">11:24 AM</span>
        </div>
        <div className={cn("rounded-lg p-2.5 text-slate-655 leading-relaxed shadow-sm border transition-all duration-200", 
          highlight 
            ? "border-[#6161FF]/20 bg-[#6161FF]/5 text-slate-900 font-medium" 
            : "border-slate-100 bg-white hover:border-slate-200"
        )}>
          {text}
        </div>
      </div>
    </div>
  );
}

function BentoChat() {
  return (
    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-0 bg-white" style={{ minHeight: 175 }}>
      <div className="border-r border-slate-100 bg-slate-50/50 p-3 text-[11px] space-y-1.5 select-none">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Channels</div>
        {["# delivery", "# eng", "# design"].map((c, i) => (
          <div key={c} className={cn("px-2 py-1 rounded-md font-bold transition-all cursor-pointer", i === 0 ? "bg-[#6161FF]/10 text-[#6161FF]" : "text-slate-450 hover:bg-slate-100/70 hover:text-slate-700")}>{c}</div>
        ))}
      </div>
      <div className="p-4 space-y-3.5 flex flex-col justify-center">
        <BentoChatBubble name="Ava" text="Decision: ship by Friday." avatar="AP" bg="bg-[#0086F0]" />
        <BentoChatBubble name="Noah" text="Task created ✓" highlight avatar="NC" bg="bg-[#7C3AED]" />
        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold px-1 select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C875] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C875]"></span>
          </span>
          Decision linked to board
        </div>
      </div>
    </div>
  );
}

function BentoBoard() {
  return (
    <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#F8FAFC]" style={{ minHeight: 175 }}>
      {[
        { col: "To Do", count: 2, tasks: [{ name: "API docs", prio: "High" }, { name: "Dark mode", prio: "Med" }], color: MONDAY_BLUE },
        { col: "Doing", count: 1, tasks: [{ name: "Mobile UI", prio: "High" }], color: MONDAY_PURPLE },
        { col: "Done", count: 1, tasks: [{ name: "Auth flow", prio: "Low" }], color: MONDAY_GREEN },
      ].map(col => (
        <div key={col.col} className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col select-none">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-655 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: col.color }} />
              {col.col}
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-200/70 text-slate-655 font-bold">{col.count}</span>
          </div>
          <div className="p-2 space-y-2 flex-1 bg-slate-50/20">
            {col.tasks.map(t => (
              <div key={t.name} className="rounded-lg bg-white border border-slate-150 p-2 text-[10.5px] font-semibold text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-1.5">
                <span>{t.name}</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase", 
                    t.prio === "High" && "bg-red-55/70 text-red-550 border border-red-100",
                    t.prio === "Med" && "bg-amber-55/70 text-amber-550 border border-amber-100",
                    t.prio === "Low" && "bg-emerald-55/70 text-emerald-550 border border-emerald-100",
                  )}>{t.prio}</span>
                  <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] text-slate-600 font-bold border border-white">AP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BentoMeeting() {
  return (
    <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col justify-between" style={{ minHeight: 175 }}>
      <div className="flex items-center justify-between mb-3 select-none">
        <div className="text-[12px] font-bold text-slate-200">Sprint review · Live</div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00C875]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00C875] animate-pulse" /> Recording
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {[
          { initials: "AP", bg: "bg-[#0086F0]", name: "Ava (Presenter)", mic: true },
          { initials: "NC", bg: "bg-[#7C3AED]", name: "Noah", mic: true },
          { initials: "SL", bg: "bg-[#00C875]", name: "Sam", mic: false },
          { initials: "ER", bg: "bg-[#E2445C]", name: "Elena", mic: true }
        ].map((i, idx) => (
          <div key={i.initials} className={cn("aspect-video rounded-lg flex flex-col items-center justify-center border relative overflow-hidden group/feed shadow-sm transition-all duration-300",
            idx === 0 ? "border-blue-500/80 bg-slate-800" : "border-slate-800 bg-slate-850/80")}>
            
            {/* Mini avatar */}
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ring-2 ring-white/10 transition-transform duration-300 group-hover/feed:scale-110", i.bg)}>
              {i.initials}
            </div>
            
            {/* Name label & Mic overlay */}
            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[8px] bg-slate-950/65 px-1.5 py-0.5 rounded-md text-slate-200 font-medium">
              <span className="truncate max-w-[50px]">{i.name}</span>
              {i.mic ? (
                <span className="text-emerald-450 font-bold">●</span>
              ) : (
                <span className="text-red-400 font-bold">✕</span>
              )}
            </div>
            
            {/* Active speaker glow */}
            {idx === 0 && (
              <div className="absolute inset-0 border border-blue-500/50 rounded-lg pointer-events-none animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoAnalytics() {
  return (
    <div className="p-4 bg-white rounded-lg flex flex-col justify-between" style={{ minHeight: 175 }}>
      <div className="text-[11px] font-bold text-slate-550 mb-3 flex justify-between items-center select-none">
        <span>Velocity · Sprint 14</span>
        <span className="text-[9px] text-slate-400 font-medium">Goal: 85 pts</span>
      </div>
      <div className="flex items-end gap-2.5 h-20 pt-2 border-b border-slate-100 px-1">
        {[45, 62, 55, 70, 80, 72, 90].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar relative cursor-pointer">
            {/* Tooltip */}
            <div className="absolute -top-7 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
              {h} pts
            </div>
            <div className="w-full rounded-t-md transition-all duration-300 group-hover/bar:brightness-95 shadow-sm" 
              style={{ 
                height: `${h}%`, 
                backgroundColor: i === 6 ? MONDAY_BLUE : MONDAY_GREEN,
                opacity: i === 6 ? 0.95 : 0.8 + (i * 0.02)
              }} 
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-400 font-bold select-none">
        <span>Week 1</span><span>Week 7 (Current)</span>
      </div>
    </div>
  );
}

function BentoAI() {
  const prompts = [
    "Summarize Sprint 14 blockers...",
    "Assign overdue push notification task...",
    "Draft Q2 campaign status update...",
  ];
  const [promptIdx, setPromptIdx] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: any;
    const fullText = prompts[promptIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText(prev => prev.slice(0, -1));
      }, 30);
    } else {
      timer = setTimeout(() => {
        setCurrentText(fullText.slice(0, currentText.length + 1));
      }, 65);
    }

    if (!isDeleting && currentText === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setPromptIdx(prev => (prev + 1) % prompts.length);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, promptIdx]);

  return (
    <div className="p-4 bg-white relative overflow-hidden flex flex-col justify-between" style={{ minHeight: 175 }}>
      {/* Glowing Orb in background (Monday Sidekick style) */}
      <div className="absolute -right-2 -bottom-2 w-28 h-28 rounded-full bg-gradient-to-tr from-pink-400 via-purple-400 to-[#6161FF] opacity-25 blur-xl animate-pulse" />
      
      <div>
        <div className="flex items-center gap-2 mb-2.5 relative z-10 select-none">
          <Sparkles size={12} className="text-[#FF158A]" />
          <span className="text-[11px] font-bold text-[#FF158A] uppercase tracking-wider">AI Assistant</span>
        </div>
        
        {/* Mock Prompt Box */}
        <div className="rounded-lg border border-slate-150 bg-slate-50 p-2 text-[11.5px] font-mono text-slate-700 shadow-inner flex items-center gap-1.5 mb-2 relative z-10 select-none">
          <span className="text-[#FF158A] font-bold">@</span>
          <span className="border-r-2 border-[#FF158A] pr-0.5 animate-[pulse_1s_infinite]">{currentText}</span>
        </div>
      </div>

      <div className="space-y-1.5 relative z-10">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
          Suggested action
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-1 rounded-md bg-[#FF158A] hover:bg-[#E01077] hover:shadow-[0_4px_12px_rgba(255,21,138,0.25)] text-[10px] font-bold text-white shadow-sm transition-all active:scale-95">Assign</button>
          <button className="px-3.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-500 border border-slate-200/60 shadow-sm transition-all active:scale-95">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function WorkflowPreview() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { step: "Discuss", icon: MessageSquare, color: MONDAY_PURPLE, desc: "Ship onboarding by Friday?" },
    { step: "Plan", icon: Kanban, color: MONDAY_BLUE, desc: "Task created · Sprint 14 · @ava" },
    { step: "Meet", icon: Video, color: MONDAY_CYAN, desc: "Sprint review · Agenda attached" },
    { step: "Ship", icon: Zap, color: MONDAY_GREEN, desc: "Deploy triggered · 0 blockers" },
  ];

  return (
    <div className="p-6 space-y-4 bg-white rounded-xl border border-slate-150 relative overflow-hidden">
      {/* Track line behind */}
      <div className="absolute left-[39px] top-[40px] bottom-[40px] w-[2px] bg-slate-100 -z-10" />
      
      {steps.map((s, i) => {
        const isActive = activeStep === i;
        return (
          <div 
            key={s.step} 
            className={cn(
              "flex items-start gap-4 transition-all duration-500", 
              isActive ? "opacity-100 translate-x-1" : "opacity-40"
            )}
          >
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-all duration-300", 
                  isActive ? "bg-white text-white border-2 scale-110 shadow-md" : "border border-slate-200"
                )}
                style={{ 
                  backgroundColor: isActive ? s.color : "#F6F6F9",
                  borderColor: s.color,
                  color: isActive ? "#ffffff" : s.color
                }}
              >
                <s.icon size={15} />
              </div>
            </div>
            <div className="pt-0.5">
              <div className="text-[13px] font-bold text-slate-800 font-monday">{s.step}</div>
              <div className="text-[12px] text-slate-550 font-medium">{s.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Workspace Vibe Widget Component (Monday Vibe Style) ───────── */
function WorkspaceVibeWidget() {
  const tags = [
    { id: "sprint", label: "Sprint planning", typeText: "sprint planning backlog" },
    { id: "marketing", label: "Marketing calendar", typeText: "marketing campaign portal" },
    { id: "recruiting", label: "Recruiting app", typeText: "recruiting & applicant tracker" },
    { id: "onboarding", label: "Client onboarding", typeText: "client onboarding workspace" },
    { id: "tracker", label: "Time tracker", typeText: "timesheet & activity logger" },
    { id: "event", label: "Event portal", typeText: "event planning dashboard" },
  ];

  const [activeTab, setActiveTab] = useState("sprint");
  const [inputText, setInputText] = useState("sprint planning backlog");
  const [isTyping, setIsTyping] = useState(false);

  const handleTagClick = (tagId: string, text: string) => {
    setActiveTab(tagId);
    setIsTyping(true);
    
    // Simulate typewriter effect
    let current = "";
    let i = 0;
    setInputText("");
    const interval = setInterval(() => {
      if (i < text.length) {
        current += text[i];
        setInputText(current);
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 40);
  };

  return (
    <div className="relative min-h-[420px] flex items-center justify-center">
      {/* Background Mockup Cards Collage (Monday Vibe Style) */}
      <div className="absolute inset-0 flex items-center justify-center gap-6 overflow-hidden select-none pointer-events-none opacity-30 blur-[0.5px]">
        {/* Card 1: Sprint Backlog */}
        <div className={cn(
          "w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all duration-700 transform rotate-[-2deg] hidden sm:block",
          activeTab === "sprint" ? "scale-105 opacity-100 border-[#6161FF]/40 shadow-md rotate-0" : "scale-95 opacity-40"
        )}>
          <div className="text-[11px] font-bold text-slate-400 mb-2">Backlog Items</div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded">
              <span className="font-semibold text-slate-700">API Setup</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#00C875] text-white font-bold">Done</span>
            </div>
            <div className="flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded">
              <span className="font-semibold text-slate-700">CSS Polish</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FDAB3D] text-white font-bold">Doing</span>
            </div>
          </div>
        </div>

        {/* Card 2: Marketing Calendar */}
        <div className={cn(
          "w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all duration-700 transform rotate-[3deg] hidden sm:block",
          activeTab === "marketing" ? "scale-105 opacity-100 border-[#FF158A]/40 shadow-md rotate-0" : "scale-95 opacity-45"
        )}>
          <div className="text-[11px] font-bold text-slate-400 mb-2">Resource Insights</div>
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-[#FF158A]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF158A]" style={{ width: "70%" }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Campaigns Active</span>
              <span className="font-bold text-slate-700">70%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Recruiting */}
        <div className={cn(
          "w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all duration-700 transform rotate-[-3deg] hidden md:block",
          activeTab === "recruiting" ? "scale-105 opacity-100 border-[#00CFF4]/40 shadow-md rotate-0" : "scale-95 opacity-45"
        )}>
          <div className="text-[11px] font-bold text-slate-400 mb-2">Recruiting pipeline</div>
          <div className="flex gap-1.5">
            <div className="flex-1 bg-slate-50 p-2 rounded text-center">
              <div className="text-[14px] font-extrabold text-slate-800">12</div>
              <div className="text-[9px] text-slate-400">Applied</div>
            </div>
            <div className="flex-1 bg-[#00CFF4]/10 p-2 rounded text-center border border-[#00CFF4]/20">
              <div className="text-[14px] font-extrabold text-[#00CFF4]">4</div>
              <div className="text-[9px] text-[#00CFF4]/80">Interviews</div>
            </div>
          </div>
        </div>

        {/* Card 4: Client Onboarding */}
        <div className={cn(
          "w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all duration-700 transform rotate-[2deg] hidden lg:block",
          activeTab === "onboarding" ? "scale-105 opacity-100 border-[#0086F0]/40 shadow-md rotate-0" : "scale-95 opacity-45"
        )}>
          <div className="text-[11px] font-bold text-slate-400 mb-2">SSO provisioning</div>
          <div className="flex items-center gap-2 text-[11px] bg-slate-50 p-2 rounded">
            <Shield size={12} className="text-[#0086F0]" />
            <span className="font-semibold text-slate-700">Okta SSO Enabled</span>
            <Check size={12} className="text-[#00C875] ml-auto" />
          </div>
        </div>
      </div>

      {/* Floating Prompts Glassmorphism Widget */}
      <div className="relative z-10 w-full max-w-xl mx-auto bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-3xl p-6 md:p-8">
        {/* Little logo mark */}
        <div className="flex items-center gap-2 mb-4 select-none">
          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#6161FF] via-[#FF158A] to-[#FDAB3D] flex items-center justify-center text-white text-[10px] font-bold">C</div>
          <span className="text-[12px] font-bold text-slate-800 uppercase tracking-wider font-monday">Cowrk Workspace OS</span>
        </div>

        <h3 className="text-[20px] md:text-[24px] font-bold text-slate-800 mb-5 font-monday leading-snug select-none">
          What do you want to manage?
        </h3>

        {/* Search input mimic */}
        <div className="relative mb-6">
          <div className="w-full px-5 py-4 rounded-2xl border border-slate-250 bg-white text-slate-800 text-[14px] md:text-[15px] font-medium shadow-inner flex items-center gap-2 min-h-[54px] select-none">
            <span className="text-[#6161FF] font-bold text-[16px] animate-[pulse_1s_infinite]">|</span>
            <span className="font-mono text-slate-700">{inputText}</span>
            {isTyping && <span className="h-4 w-[2px] bg-[#6161FF] animate-blink" />}
          </div>
          <button className="absolute right-3.5 top-3.5 h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-[#6161FF] transition-colors shadow-sm select-none">
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Clickable Quick Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTagClick(t.id, t.typeText)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all border",
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm scale-102"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
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
    accent: MONDAY_PURPLE,
    icon: GitBranch,
    features: ["Sprint planning", "Deploy alerts in channels", "PR → task linking"],
  },
  {
    title: "Marketing Teams",
    desc: "From brief to publish without a single tool handoff.",
    accent: MONDAY_PINK,
    icon: Zap,
    features: ["Editorial calendars", "Asset approval threads", "Campaign analytics"],
  },
  {
    title: "Remote Teams",
    desc: "Async by default, synchronous when it matters.",
    accent: MONDAY_CYAN,
    icon: Globe,
    features: ["Async video handoffs", "Time zone overlays", "Meeting recordings"],
  },
  {
    title: "Enterprise",
    desc: "Compliance, governance, and admin control at scale.",
    accent: MONDAY_BLUE,
    icon: Shield,
    features: ["SAML SSO + SCIM", "Data residency", "Audit logs"],
  },
];

const INTEGRATIONS = [
  { name: "GitHub", color: "#24292e", icon: GitBranch },
  { name: "Figma", color: "#F24E1E", icon: Sparkles },
  { name: "Google", color: "#4285F4", icon: Globe },
  { name: "Slack", color: "#4A154B", icon: MessageSquare },
  { name: "Jira", color: "#0052CC", icon: Kanban },
  { name: "Salesforce", color: "#00A1E0", icon: BarChart3 },
  { name: "Okta", color: "#007DC1", icon: Lock },
  { name: "Webhooks", color: MONDAY_GREEN, icon: Zap },
  { name: "Analytics", color: MONDAY_ORANGE, icon: Activity },
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
