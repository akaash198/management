"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiFeatures,
  appFeatures,
  caseStudies,
  coreFeatures,
  customerLogos,
  faqs,
  integrations,
  navItems,
  pricing,
  securityBadges,
  stats,
  testimonials,
  useCases,
} from "./landingContent";
import {
  Activity,
  Apple,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe,
  Kanban,
  Lock,
  Menu,
  MessageSquare,
  Play,
  Quote,
  Shield,
  Smartphone,
  Star,
  Terminal,
  Video,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";
type DemoView = "chat" | "projects" | "meetings";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [demoView, setDemoView] = useState<DemoView>("chat");
  const [activeUseCaseId, setActiveUseCaseId] = useState(useCases[0]?.id ?? "software");
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      setDemoView((prev) => (prev === "chat" ? "projects" : prev === "projects" ? "meetings" : "chat"));
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      setTestimonialIndex((i) => (i + 1) % testimonials.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "40px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const activeUseCase = useMemo(() => useCases.find((u) => u.id === activeUseCaseId) ?? useCases[0], [activeUseCaseId]);
  const activeTestimonial = testimonials[testimonialIndex] ?? testimonials[0];
  const priceForCycle = (raw: string) => {
    if (billingCycle === "monthly") return raw;
    if (!raw.startsWith("$")) return raw;
    const n = Number(raw.slice(1));
    if (!Number.isFinite(n) || n === 0) return raw;
    const discounted = Math.max(1, Math.round(n * 0.8));
    return `$${discounted}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 overflow-x-hidden selection:bg-indigo-500/30">
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-all duration-300",
          isScrolled ? "bg-[#07070c]/70 backdrop-blur-xl py-3 border-b border-white/5" : "bg-transparent py-6"
        )}
      >
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-10">
            <Logo />
            <div className="hidden lg:flex items-center gap-6 xl:gap-8">
              {navItems.map((item) => (
                <div key={item.label} className="group relative">
                  <button className="flex items-center gap-1 text-[14px] font-medium text-white/75 hover:text-white transition-colors">
                    {item.label}
                    {item.children && <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />}
                  </button>
                  {item.children && (
                    <div className="absolute top-full left-[-18px] pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                      <div className="w-[300px] rounded-2xl border border-white/10 bg-[#0b0b12]/95 backdrop-blur-2xl p-2 shadow-2xl">
                        {item.children.map((child: any) => (
                          <Link key={child.label} href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group/item">
                            {child.icon && <child.icon size={20} className="text-indigo-300 mt-1" />}
                            <div>
                              <div className="text-[14px] font-semibold text-white">{child.label}</div>
                              <div className="text-[12px] text-white/50">{child.description}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-[14px] font-medium text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hidden sm:block">
              <button className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Get Started Free
              </button>
            </Link>
            <button className="lg:hidden text-white/80" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-[#050508]/95 backdrop-blur-2xl flex flex-col p-8">
          <div className="flex items-center justify-between mb-10">
            <Logo />
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="text-white/80">
              <X size={28} />
            </button>
          </div>
          <div className="space-y-8 text-white">
            {navItems.map((item) => (
              <div key={item.label}>
                <div className="text-2xl font-black mb-4">{item.label}</div>
                {item.children && (
                  <div className="space-y-4 pl-4 border-l border-white/10">
                    {item.children.map((child: any) => (
                      <div key={child.label} className="text-lg text-white/60">
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-4">
            <Link href="/register" className="w-full py-4 rounded-2xl bg-indigo-600 text-center font-black text-lg text-white">
              Get Started Free
            </Link>
            <Link href="/login" className="w-full py-4 rounded-2xl border border-white/10 text-center font-black text-lg text-white">
              Sign In
            </Link>
          </div>
        </div>
      )}

      <section className="relative pt-28 sm:pt-32 pb-16 lg:pt-56 lg:pb-40 px-6 bg-[#050508] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-44 left-1/2 -translate-x-1/2 w-[1600px] h-[1000px] opacity-60 bg-[radial-gradient(circle_at_50%_0%,rgba(97,31,105,0.6)_0%,rgba(0,82,204,0.35)_35%,rgba(98,100,167,0.25)_55%,transparent_75%)]" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_0%_40%,rgba(97,31,105,0.35),transparent_55%),radial-gradient(circle_at_100%_55%,rgba(0,82,204,0.28),transparent_55%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#050508]" />
        </div>

        <div className="mx-auto max-w-7xl px-0 lg:px-6 relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div data-reveal className="lp-reveal">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-bold text-white/80 mb-8">
              <Zap size={14} className="text-indigo-300" />
              10M+ teams collaborate daily
            </div>
            <h1 className="text-[clamp(2.6rem,5vw,5.2rem)] font-black leading-[1.03] tracking-tight mb-7">
              Where Teams{" "}
              <span className="text-gradient bg-gradient-to-r from-[#611f69] via-[#0052CC] to-[#6264A7]">Plan</span>,{" "}
              Communicate, and Deliver
            </h1>
            <p className="text-[18px] lg:text-[20px] text-white/55 leading-relaxed mb-10 max-w-xl">
              Unite your workflow with real-time chat, agile project tracking, and seamless video collaboration—built for modern enterprises.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full px-8 py-4 rounded-2xl bg-[#611f69] hover:bg-[#6c2576] text-[16px] font-black text-white shadow-2xl shadow-[#611f69]/30 flex items-center justify-center gap-2 group transition-all hover:translate-y-[-1px] active:translate-y-[0px]">
                  Start Free Trial
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 text-[16px] font-black text-white flex items-center justify-center gap-2 transition-all">
                <Play size={18} className="fill-white" />
                Watch Demo
              </button>
            </div>
            <div className="mt-8 lg:mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-white/40 text-[12px] lg:text-[13px] font-medium">
              <span className="inline-flex items-center gap-2"><Check size={14} /> No credit card required</span>
              <span className="inline-flex items-center gap-2"><Check size={14} /> 14-day free trial</span>
              <span className="inline-flex items-center gap-2"><Check size={14} /> WCAG-friendly UI</span>
            </div>
          </div>

          <div data-reveal className="lp-reveal relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 rounded-[38px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_60px_120px_-18px_rgba(0,0,0,0.8)] overflow-hidden">
              <ProductDemo view={demoView} onViewChange={setDemoView} />
            </div>

            <div className="hidden md:block absolute -top-12 -right-10 z-20 p-3 md:p-4 rounded-2xl glass-dark border border-white/10 shadow-2xl lp-float" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-black text-white text-[11px] md:text-[13px] shadow-lg shadow-emerald-500/20">JD</div>
                <div>
                  <div className="text-[12px] font-black text-white">James joined</div>
                  <div className="text-[10px] text-white/50">#delivery • thread reply</div>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block absolute -bottom-10 -left-12 z-20 p-3 md:p-4 rounded-2xl glass-dark border border-white/10 shadow-2xl lp-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><Kanban size={16} /></div>
                <div>
                  <div className="text-[12px] font-black text-white">Sprint ready</div>
                  <div className="text-[10px] text-white/50">12 tasks moved • 3 blockers</div>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block absolute top-[15%] -left-20 z-20 p-3 rounded-2xl glass-dark border border-white/10 shadow-2xl lp-float" style={{ animationDelay: "0.9s" }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6264A7] to-[#4e508a] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Video size={18} /></div>
                <div>
                  <div className="text-[12px] font-black text-white">Meeting started</div>
                  <div className="text-[10px] text-white/50">Sprint review • 4 participants</div>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block absolute bottom-[25%] -right-16 z-20 p-3 rounded-2xl glass-dark border border-white/10 shadow-2xl lp-float" style={{ animationDelay: "2.2s" }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#611f69] to-[#4d1854] flex items-center justify-center text-white shadow-lg shadow-purple-500/20"><MessageSquare size={18} /></div>
                <div>
                  <div className="text-[12px] font-black text-white">New message</div>
                  <div className="text-[10px] text-white/50">@ava mentioned you in #engineering</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center" data-reveal>
              <div className="lp-reveal">
                <div className="text-3xl lg:text-4xl font-black text-slate-900 mb-2">{stat.value}</div>
                <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 lg:py-20 px-6 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-[12px] font-black uppercase tracking-widest text-slate-400 mb-10">
            Trusted by teams at Fortune 500 companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6" data-reveal>
            <div className="lp-reveal flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {customerLogos.map((name) => (
                <div
                  key={name}
                  className="text-[16px] font-black text-slate-300 hover:text-slate-400 transition-colors tracking-tight select-none"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-40 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 lg:mb-24 max-w-3xl mx-auto" data-reveal>
            <div className="lp-reveal">
              <h2 className="text-[clamp(2rem,5vw,3.75rem)] font-black mb-6 text-slate-900">All-in-one. Actually unified.</h2>
              <p className="text-[16px] lg:text-xl text-slate-500">
                Slack-style communication, Jira-grade planning, and Teams-ready collaboration — in one workspace your enterprise can standardize on.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => (
              <div key={feature.id} data-reveal className="lp-reveal group relative rounded-3xl border border-slate-100 bg-white p-8 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 overflow-hidden">
                <div className="absolute -top-28 -right-28 w-72 h-72 blur-[90px] opacity-0 group-hover:opacity-15 transition-opacity duration-500" style={{ background: feature.accent }} />
                <div className="relative z-10">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-8 shadow-xl text-white" style={{ backgroundColor: feature.accent }}>
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-3 text-slate-900">{feature.title}</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-4">
                    {feature.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[14px] font-medium text-slate-700">
                        <div className="h-5 w-5 rounded-full bg-slate-50 flex items-center justify-center">
                          <Check size={12} className="text-indigo-600" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    {feature.id === "communication" ? <MiniChat accent={feature.accent} /> : feature.id === "projects" ? <MiniBoard accent={feature.accent} /> : <MiniMeeting accent={feature.accent} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-[#050508] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[1300px] h-[900px] bg-[radial-gradient(circle_at_50%_10%,rgba(0,82,204,0.35),transparent_60%)]" />
          <div className="absolute -bottom-60 left-1/2 -translate-x-1/2 w-[1300px] h-[900px] bg-[radial-gradient(circle_at_50%_90%,rgba(97,31,105,0.25),transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div data-reveal className="lp-reveal">
              <div className="text-indigo-300 font-black uppercase tracking-widest text-[12px] mb-4">From idea to delivery</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-6">One unified workflow.</h2>
              <p className="text-lg lg:text-xl text-white/55">
                Discuss in chat, turn decisions into work, review in meetings, and ship — with context preserved across every step.
              </p>
            </div>

            <div data-reveal className="lp-reveal rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 lg:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {[
                  { step: 1, title: "Discuss", desc: "Threads keep decisions searchable and scoped.", icon: Quote },
                  { step: 2, title: "Plan", desc: "Create tasks straight from messages.", icon: CheckCircle2 },
                  { step: 3, title: "Review", desc: "Meet with agenda + recordings attached.", icon: Video },
                  { step: 4, title: "Deliver", desc: "Progress updates roll up automatically.", icon: Activity },
                ].map((node) => (
                  <div key={node.step} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[12px] font-black text-white/60 uppercase tracking-widest">Step {node.step}</div>
                      <node.icon size={18} className="text-indigo-300" />
                    </div>
                    <div className="text-xl font-black mb-2">{node.title}</div>
                    <div className="text-white/55 text-[13px] leading-relaxed">{node.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div data-reveal className="lp-reveal mt-14 lg:mt-20 grid lg:grid-cols-3 gap-6">
            {[
              { label: "Productivity increase", value: "+32%" },
              { label: "Meeting time saved", value: "4.5h/wk" },
              { label: "Fewer tool switches", value: "-60%" },
            ].map((metric) => (
              <div key={metric.label} className="p-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="text-3xl font-black mb-1">{metric.value}</div>
                <div className="text-[12px] font-black text-white/40 uppercase tracking-widest">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 lg:mb-20 max-w-3xl mx-auto" data-reveal>
            <div className="lp-reveal">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Works with the tools you already love.</h2>
              <p className="text-lg lg:text-xl text-slate-500">Connect, automate, and keep your ecosystem — without sacrificing a unified workflow.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-reveal>
            {integrations.map((int) => (
              <div key={int.name} className="lp-reveal rounded-3xl border border-slate-100 bg-white p-5 md:p-6 hover:shadow-xl hover:shadow-slate-100 transition-all">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 mb-4">
                  <int.icon size={20} />
                </div>
                <div className="text-[14px] md:text-[15px] font-black text-slate-900 mb-1">{int.name}</div>
                <div className="text-[12px] md:text-[13px] text-slate-500 leading-relaxed">{int.blurb}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center" data-reveal>
            <div className="lp-reveal">
              <p className="text-slate-400 font-black mb-6 uppercase tracking-widest text-[12px]">And 1,000+ more via API & webhooks</p>
              <button className="px-10 py-4 rounded-2xl border border-slate-200 hover:bg-slate-50 font-black transition-all">Explore integrations</button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div data-reveal className="lp-reveal">
              <h2 className="text-4xl lg:text-6xl font-black mb-10 text-slate-900">Solutions for every team.</h2>
              <div className="space-y-4">
                {useCases.map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => setActiveUseCaseId(uc.id)}
                    className={cn(
                      "w-full p-6 rounded-3xl border text-left transition-all flex items-start gap-5",
                      activeUseCaseId === uc.id ? "border-indigo-200 bg-indigo-50/40 shadow-lg shadow-indigo-500/10" : "border-slate-100 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all", activeUseCaseId === uc.id ? "bg-indigo-600 text-white" : "bg-slate-50 text-indigo-600")}>
                      <uc.icon size={22} />
                    </div>
                    <div>
                      <div className="text-[16px] font-black mb-1 text-slate-900">{uc.label}</div>
                      <div className="text-[13px] text-slate-500 leading-relaxed">{uc.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div data-reveal className="lp-reveal rounded-[24px] lg:rounded-[36px] overflow-hidden border border-slate-100 bg-slate-50 p-6 lg:p-8 shadow-2xl shadow-slate-200">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-3">{activeUseCase?.label}</div>
                  <div className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">{activeUseCase?.title}</div>
                  <div className="text-slate-500 mb-6">{activeUseCase?.description}</div>
                  <div className="space-y-3">
                    {activeUseCase?.features.map((f) => (
                      <div key={f} className="flex items-center gap-3 text-[13px] font-medium text-slate-700">
                        <Check size={16} className="text-indigo-600" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-white border border-slate-100 items-center justify-center text-indigo-600 shrink-0">
                  {activeUseCase?.icon ? <activeUseCase.icon size={20} /> : <Globe size={20} />}
                </div>
              </div>

              <div className="mt-10 rounded-3xl border border-slate-100 bg-white p-6">
                <UseCasePreview id={activeUseCaseId} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-slate-50" id="pricing">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 lg:mb-20" data-reveal>
            <div className="lp-reveal">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Pricing that scales.</h2>
              <p className="text-lg lg:text-xl text-slate-500">Start free, then upgrade as your team standardizes and scales.</p>
              <div className="flex items-center justify-center gap-6 mt-10">
                <span className={cn("text-[14px] font-black transition-colors", billingCycle === "monthly" ? "text-slate-900" : "text-slate-400")}>Monthly</span>
                <button
                  onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                  className="w-14 h-8 rounded-full bg-slate-200 border border-slate-300 p-1 relative transition-all"
                  aria-label="Toggle billing cycle"
                >
                  <div className={cn("h-6 w-6 rounded-full bg-indigo-600 shadow-md transition-all", billingCycle === "annual" ? "translate-x-6" : "translate-x-0")} />
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[14px] font-black transition-colors", billingCycle === "annual" ? "text-slate-900" : "text-slate-400")}>Annually</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">Save 20%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
            {pricing.map((tier) => (
              <div
                key={tier.name}
                data-reveal
                className={cn(
                  "lp-reveal relative flex flex-col p-8 rounded-[32px] border transition-all duration-300",
                  tier.popular ? "bg-white border-indigo-200 shadow-2xl shadow-indigo-500/10 lg:scale-[1.02]" : "bg-white/70 border-slate-100 hover:border-slate-200"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/40">
                    Most Popular
                  </div>
                )}
                <div className="text-xl font-black mb-2 text-slate-900">{tier.name}</div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black text-slate-900">{priceForCycle(tier.price)}</span>
                  <span className="text-slate-400 text-[14px]">
                    {billingCycle === "annual" && tier.price.startsWith("$") && tier.price !== "$0" ? "per user/mo (billed annually)" : tier.period}
                  </span>
                </div>
                <p className="text-[13px] text-slate-500 mb-8 min-h-10">{tier.description}</p>

                <Link href="/register" className="mb-10">
                  <button
                    className={cn(
                      "w-full py-4 rounded-2xl font-black transition-all",
                      tier.popular ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20" : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                    )}
                  >
                    {tier.cta}
                  </button>
                </Link>

                <div className="space-y-4">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-3 text-[13px] font-medium text-slate-600">
                      <Check size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div data-reveal className="lp-reveal">
              <div className="text-indigo-700 font-black uppercase tracking-widest text-[12px] mb-4">Social proof</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Loved by teams that ship.</h2>
              <p className="text-lg lg:text-xl text-slate-500 mb-10">Quotes your execs can forward and your ICs will actually agree with.</p>

              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: activeTestimonial.stars ?? 5 }).map((_, i) => (
                      <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{activeTestimonial.metric}</div>
                </div>
                <Quote size={34} className="text-indigo-600 opacity-15 mb-4" />
                <p className="text-[16px] font-medium leading-relaxed text-slate-800 mb-6">{activeTestimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white">
                    {activeTestimonial.avatar}
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-slate-900">{activeTestimonial.name}</div>
                    <div className="text-[12px] text-slate-400">
                      {activeTestimonial.role} • {activeTestimonial.company}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      className={cn("h-2.5 rounded-full transition-all", i === testimonialIndex ? "w-8 bg-indigo-600" : "w-2.5 bg-slate-200 hover:bg-slate-300")}
                      onClick={() => setTestimonialIndex(i)}
                      aria-label={`Show testimonial ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div data-reveal className="lp-reveal rounded-[24px] lg:rounded-[36px] border border-slate-100 bg-slate-50 p-6 lg:p-10">
              <div className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-4">Proof points</div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: "10M+", label: "Active users" },
                  { value: "150+", label: "Countries" },
                  { value: "99.9%", label: "Uptime" },
                  { value: "4.8★", label: "Average rating" },
                ].map((p) => (
                  <div key={p.label} className="rounded-3xl border border-slate-100 bg-white p-6">
                    <div className="text-2xl font-black text-slate-900">{p.value}</div>
                    <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-1">{p.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex items-center gap-3 text-slate-500 text-[13px]">
                <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="font-black text-slate-900">Enterprise-ready from day one</div>
                  <div className="text-slate-500">SSO, audit logs, encryption, and admin controls.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16 max-w-3xl mx-auto" data-reveal>
            <div className="lp-reveal">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Customer success stories.</h2>
              <p className="text-lg lg:text-xl text-slate-500">Real results from teams that made the switch to FlowTeam.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8" data-reveal>
            <div className="lp-reveal grid md:grid-cols-3 gap-8 md:col-span-3">
              {caseStudies.map((cs) => (
                <div key={cs.company} className="group rounded-3xl border border-slate-100 bg-white p-6 lg:p-8 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg">
                      {cs.logo}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase tracking-wider">{cs.industry}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mb-4">{cs.metric}</div>
                  <p className="text-[14px] text-slate-600 leading-relaxed mb-6">&ldquo;{cs.quote}&rdquo;</p>
                  <div className="pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Before</div>
                        <div className="text-[12px] text-slate-700 leading-relaxed">{cs.before}</div>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">After</div>
                        <div className="text-[12px] text-emerald-800 leading-relaxed">{cs.after}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white text-[12px]">
                        {cs.logo}
                      </div>
                      <div>
                        <div className="text-[13px] font-black text-slate-900">{cs.executive}</div>
                        <div className="text-[12px] text-slate-400">{cs.role}, {cs.company}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-[#050508] text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div data-reveal className="lp-reveal">
              <div className="text-indigo-300 font-black uppercase tracking-widest text-[12px] mb-4">Security & compliance</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-6">Enterprise-grade trust.</h2>
              <p className="text-lg lg:text-xl text-white/55 mb-10">
                SSO, encryption, and governance controls designed for regulated teams — without compromising the UX your team will actually use.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { title: "SSO & SCIM", desc: "SAML 2.0 + automated provisioning", icon: Lock },
                  { title: "Encryption", desc: "AES-256 at rest, TLS in transit", icon: Shield },
                  { title: "Audit Logs", desc: "Full action history for governance", icon: Activity },
                  { title: "Availability", desc: "99.9% uptime target", icon: Globe },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-200">
                        <item.icon size={18} />
                      </div>
                      <div className="font-black">{item.title}</div>
                    </div>
                    <div className="text-[13px] text-white/55">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="lp-reveal grid grid-cols-2 gap-6">
              {securityBadges.map((badge) => (
                <div key={badge.name} className="p-8 rounded-[28px] glass-dark border border-white/10 flex flex-col items-center text-center hover:bg-white/[0.05] transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center mb-5">
                    {badge.icon === "ShieldCheck" ? <Shield size={28} /> : badge.icon === "Lock" ? <Lock size={28} /> : badge.icon === "Activity" ? <Activity size={28} /> : <CheckCircle2 size={28} />}
                  </div>
                  <div className="text-[14px] font-black">{badge.name}</div>
                </div>
              ))}
              <div className="col-span-2 rounded-[28px] border border-white/10 bg-gradient-to-r from-[#611f69]/20 via-[#0052CC]/20 to-[#6264A7]/20 p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-widest text-white/55 mb-2">Admin controls</div>
                    <div className="text-2xl font-black mb-2">Centralized governance</div>
                    <div className="text-white/55 text-[13px] leading-relaxed">
                      Manage access, policies, and compliance requirements across chat, projects, and meetings — from one console.
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                    <Lock size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div data-reveal className="lp-reveal">
              <div className="text-indigo-600 font-black uppercase tracking-widest text-[12px] mb-4">Developer API</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Build on FlowTeam.</h2>
              <p className="text-lg lg:text-xl text-slate-500 mb-8">Extend, integrate, and automate with our developer platform. RESTful APIs, webhooks, and SDKs for every major language.</p>
              <div className="space-y-5">
                {apiFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-slate-900">{f.title}</div>
                      <div className="text-[13px] text-slate-500">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-10 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black flex items-center gap-2 transition-all">
                <Terminal size={18} />
                Explore API Docs
              </button>
            </div>
            <div data-reveal className="lp-reveal rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100">
              <div className="rounded-2xl bg-[#050508] text-white p-4 md:p-6 font-mono text-[12px] md:text-[13px] leading-relaxed overflow-x-auto whitespace-nowrap md:whitespace-normal">
                <div className="text-emerald-400 mb-3">// Create a task from a message</div>
                <div className="text-white/80">POST<span className="text-indigo-300"> /api/v1/tasks</span></div>
                <div className="text-white/60">{"{"}</div>
                <div className="pl-4 text-white/60">&ldquo;channel_id&rdquo;: <span className="text-amber-300">&ldquo;C01ABC123&rdquo;</span>,</div>
                <div className="pl-4 text-white/60">&ldquo;message_id&rdquo;: <span className="text-amber-300">&ldquo;m_abc123&rdquo;</span>,</div>
                <div className="pl-4 text-white/60">&ldquo;title&rdquo;: <span className="text-amber-300">&ldquo;Update onboarding flow&rdquo;</span>,</div>
                <div className="pl-4 text-white/60">&ldquo;assignee_id&rdquo;: <span className="text-amber-300">&ldquo;U02XYZ&rdquo;</span>,</div>
                <div className="pl-4 text-white/60">&ldquo;priority&rdquo;: <span className="text-amber-300">&ldquo;high&rdquo;</span></div>
                <div className="text-white/60">{"}"}</div>
                <div className="mt-4 pt-4 border-t border-white/10 text-white/50 text-[12px]">
                  <span className="text-emerald-400">// Response 201</span> Task created from message. Linked in thread.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 max-w-3xl mx-auto" data-reveal>
            <div className="lp-reveal">
              <div className="text-indigo-600 font-black uppercase tracking-widest text-[12px] mb-4">Mobile App</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Your workspace in your pocket.</h2>
              <p className="text-lg lg:text-xl text-slate-500">Stay connected, review tasks, and join meetings from anywhere with native iOS and Android apps.</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center" data-reveal>
            <div className="lp-reveal">
              <div className="grid grid-cols-2 gap-6">
                {appFeatures.map((f) => (
                  <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6">
                    <Smartphone size={24} className="text-indigo-600 mb-3" />
                    <div className="text-[15px] font-black text-slate-900 mb-1">{f.title}</div>
                    <div className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-reveal flex flex-col items-start">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 w-full">
                <div className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-4">Download the app</div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all">
                    <Apple size={24} />
                    <div className="text-left">
                      <div className="text-[10px] text-white/60">Download on the</div>
                      <div className="text-[16px] font-black">App Store</div>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all">
                    <Smartphone size={24} />
                    <div className="text-left">
                      <div className="text-[10px] text-white/60">Get it on</div>
                      <div className="text-[16px] font-black">Google Play</div>
                    </div>
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[13px] text-slate-500">
                  <Check size={16} className="text-emerald-500" /> Free with your FlowTeam account
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-40 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div data-reveal className="lp-reveal">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-slate-900">Frequently asked questions.</h2>
              <p className="text-lg lg:text-xl text-slate-500">Fast answers for procurement, IT, and the team shipping the work.</p>
            </div>
            <div data-reveal className="lp-reveal space-y-4">
              {faqs.map((f, idx) => {
                const open = openFaq === idx;
                return (
                  <button
                    key={f.q}
                    className={cn("w-full text-left rounded-3xl border px-6 py-5 transition-all", open ? "border-indigo-200 bg-indigo-50/40" : "border-slate-100 bg-white hover:bg-slate-50")}
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="text-[15px] font-black text-slate-900">{f.q}</div>
                      <div className={cn("h-8 w-8 rounded-full border flex items-center justify-center transition-all", open ? "border-indigo-200 bg-white text-indigo-600" : "border-slate-200 bg-white text-slate-500")}>
                        {open ? <X size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {open && <div className="mt-3 text-[13px] text-slate-600 leading-relaxed">{f.a}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl relative rounded-[24px] lg:rounded-[56px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#611f69] via-[#0052CC] to-[#6264A7] opacity-95" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="relative z-10 px-5 sm:px-8 py-16 lg:py-24 text-center max-w-4xl mx-auto text-white">
            <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight">Ready to transform how your team works?</h2>
            <p className="text-lg lg:text-xl text-white/85 mb-10">
              Start free in minutes, or schedule a demo for security + procurement workflows.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-[360px]">
                <input
                  placeholder="Work email"
                  className="w-full px-5 py-4 rounded-2xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-semibold outline-none focus:ring-4 focus:ring-white/30"
                />
              </div>
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full px-10 py-4 rounded-2xl bg-black/90 hover:bg-black text-white text-[16px] font-black shadow-2xl transition-all">
                  Start Free
                </button>
              </Link>
              <button className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm text-white text-[16px] font-black hover:bg-white/15 transition-all">
                Schedule a Demo
              </button>
            </div>
            <div className="mt-6 text-white/70 text-[13px] font-semibold flex flex-wrap items-center justify-center gap-6">
              <span className="flex items-center gap-2"><Check size={16} /> No credit card required</span>
              <span className="flex items-center gap-2"><Check size={16} /> Cancel anytime</span>
              <span className="flex items-center gap-2"><Check size={16} /> Enterprise onboarding</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="pt-20 pb-12 px-6 border-t border-white/5 bg-[#050508] text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-16">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <Logo className="mb-6" />
              <p className="text-[13px] text-white/50 leading-relaxed max-w-[260px]">
                FlowTeam is the all-in-one platform for planning, communication, and delivery — built for modern enterprises.
              </p>
            </div>
            <FooterCol title="Product" items={["Chat", "Projects", "Meetings", "Integrations", "Security"]} />
            <FooterCol title="Solutions" items={["Startups", "Remote", "Enterprise", "Agile teams", "Operations"]} />
            <FooterCol title="Resources" items={["Docs", "Tutorials", "Community", "Status", "Support"]} />
            <FooterCol title="Company" items={["About", "Careers", "Press", "Contact", "Legal"]} />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t border-white/10">
            <div className="text-[12px] text-white/30">© 2026 FlowTeam. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[12px] text-white/50">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                All Systems Operational
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <button className="text-[12px] text-white/50 flex items-center gap-2 hover:text-white transition-colors">
                <Globe size={14} /> English (US)
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="text-[12px] font-black mb-5 uppercase tracking-widest text-white/35">{title}</h5>
      <ul className="space-y-3 text-[13px] text-white/60">
        {items.map((i) => (
          <li key={i}>
            <Link href="#" className="hover:text-white transition-colors">
              {i}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#611f69] via-[#0052CC] to-[#6264A7] shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <span className="relative text-[18px] font-black text-white tracking-tighter">FT</span>
      </div>
      <span className="text-[20px] font-black tracking-tight text-white">FlowTeam</span>
    </div>
  );
}

function ProductDemo({ view, onViewChange }: { view: DemoView; onViewChange: (v: DemoView) => void }) {
  const tabs: Array<{ id: DemoView; label: string; icon: any; color: string }> = [
    { id: "chat", label: "Chat", icon: Quote, color: "#611f69" },
    { id: "projects", label: "Boards", icon: CheckCircle2, color: "#0052CC" },
    { id: "meetings", label: "Meetings", icon: Video, color: "#6264A7" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b border-white/10 bg-black/30">
        <div className="hidden sm:flex items-center gap-2 text-white/60 text-[12px] font-black uppercase tracking-widest">
          Live product view
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onViewChange(t.id)}
              className={cn(
                "px-2 md:px-3 py-1.5 rounded-full text-[12px] font-black transition-all flex items-center gap-1.5",
                view === t.id ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
              )}
            >
              <t.icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/30">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-3 text-[11px] text-white/45 font-mono">flowteam.app</div>
          </div>

          <div className="p-4 md:p-6">
            {view === "chat" ? <DemoChat /> : view === "projects" ? <DemoProjects /> : <DemoMeetings />}
          </div>
        </div>

        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] md:text-[12px] text-white/55">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold">Real-time updates</span>
          </div>
          <div className="font-semibold">Switches automatically</div>
        </div>
      </div>
    </div>
  );
}

function DemoChat() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-3 md:gap-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-[11px] font-black uppercase tracking-widest text-white/45 mb-3">Channels</div>
        {["# delivery", "# engineering", "# design", "# launches"].map((c, i) => (
          <div key={c} className={cn("px-3 py-2 rounded-lg text-[12px] font-semibold", i === 0 ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5")}>
            {c}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-black text-white"># delivery</div>
            <div className="text-[11px] text-white/45">Decisions + tasks in one thread</div>
          </div>
          <div className="flex items-center gap-2 text-white/45 text-[11px] font-semibold">
            <Check size={14} className="text-emerald-400" />
            Synced
          </div>
        </div>
        <div className="space-y-3">
          <ChatBubble name="Ava" tag="@ava" text="We should ship the onboarding improvements in Sprint 14." />
          <ChatBubble name="Noah" tag="@noah" text="Agreed — I created tasks for copy + checklist updates." highlight />
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] font-black text-white/60 mb-2">Thread</div>
            <div className="text-[12px] text-white/70">Decision: Ship in Sprint 14 • Owner: @noah</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ name, tag, text, highlight }: { name: string; tag: string; text: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", highlight ? "border-indigo-500/30 bg-indigo-500/10" : "border-white/10 bg-white/[0.02]")}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[12px] font-black text-white">{name} <span className="text-white/45 font-semibold">{tag}</span></div>
        <div className="text-[10px] text-white/35 font-semibold">2m</div>
      </div>
      <div className="text-[12px] text-white/75 leading-relaxed">{text}</div>
    </div>
  );
}

function DemoProjects() {
  const columns = [
    { 
      title: "Backlog", 
      color: "from-[#0052CC]/25",
      tasks: [
        { title: "SSO Integration", tag: "High", owner: "SC", progress: 0 },
        { title: "Dark mode support", tag: "Low", owner: "JW", progress: 0 },
      ]
    },
    { 
      title: "In Progress", 
      color: "from-[#611f69]/25",
      tasks: [
        { title: "Mobile UI Polish", tag: "Medium", owner: "AP", progress: 65 },
        { title: "API Documentation", tag: "High", owner: "SC", progress: 30 },
        { title: "Video reliability", tag: "High", owner: "ER", progress: 85 },
      ]
    },
    { 
      title: "Done", 
      color: "from-emerald-500/25",
      tasks: [
        { title: "Landing page V1", tag: "High", owner: "AP", progress: 100 },
        { title: "User auth flow", tag: "High", owner: "JW", progress: 100 },
      ]
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((col) => (
        <div key={col.title} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className={cn("px-3 py-2 text-[11px] font-black text-white/70 bg-gradient-to-r", col.color, "to-transparent border-b border-white/10 flex items-center justify-between")}>
            {col.title}
            <span className="text-[10px] opacity-60">{col.tasks.length}</span>
          </div>
          <div className="p-2 space-y-2">
            {col.tasks.map((task, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.05] p-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-[11px] font-bold text-white leading-tight">{task.title}</div>
                  <div className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                    task.tag === "High" ? "bg-red-500/20 text-red-300" : task.tag === "Medium" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                  )}>
                    {task.tag}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[9px] font-black text-white/80">
                      {task.owner}
                    </div>
                  </div>
                  <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000", task.progress === 100 ? "bg-emerald-400" : "bg-indigo-400")} style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoMeetings() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13px] font-black text-white">Sprint review</div>
          <div className="text-[11px] text-white/45">Recording + notes attach to work</div>
        </div>
        <button className="px-3 py-2 rounded-lg bg-white text-slate-900 text-[12px] font-black flex items-center gap-2">
          <Video size={14} />
          Join
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["AP", "SC", "JW", "ER"].map((a, i) => (
          <div key={a} className={cn("aspect-video rounded-xl border overflow-hidden", i === 0 ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/10 bg-white/[0.02]")}>
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-black text-white">{a}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-black text-white">Agenda</div>
          <div className="text-[11px] text-white/45 font-semibold">3 items</div>
        </div>
        <div className="mt-2 space-y-2">
          {["Sprint outcomes", "Blockers", "Next sprint scope"].map((x) => (
            <div key={x} className="flex items-center gap-2 text-[12px] text-white/70">
              <div className="h-4 w-4 rounded bg-white/10 border border-white/10" />
              {x}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniChat({ accent }: { accent: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-black text-slate-700"># launches</div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Threaded</div>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg border border-slate-100 p-3">
          <div className="text-[11px] font-black text-slate-900">Decision</div>
          <div className="text-[12px] text-slate-600">Ship the new pricing page on Monday.</div>
        </div>
        <div className="rounded-lg border border-slate-100 p-3" style={{ borderColor: `${accent}33`, background: `${accent}0A` }}>
          <div className="text-[11px] font-black text-slate-900">Task created</div>
          <div className="text-[12px] text-slate-600">“Finalize tier copy” assigned to @ava.</div>
        </div>
      </div>
    </div>
  );
}

function MiniBoard({ accent }: { accent: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {["To do", "Doing", "Done"].map((t, i) => (
        <div key={t} className="rounded-xl border border-slate-100 bg-white p-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t}</div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            <div className="text-[11px] font-black text-slate-900">Card</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full" style={{ width: `${35 + i * 20}%`, background: accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniMeeting({ accent }: { accent: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {["AP", "SC", "JW", "ER"].map((a, i) => (
        <div key={a} className="aspect-square rounded-xl border border-slate-100 bg-white flex items-center justify-center">
          <div className="h-9 w-9 rounded-full flex items-center justify-center font-black text-white" style={{ background: i === 0 ? accent : "#94a3b8" }}>
            {a}
          </div>
        </div>
      ))}
    </div>
  );
}

function UseCasePreview({ id }: { id: string }) {
  if (id === "marketing") {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Campaign board</div>
          <div className="space-y-2">
            {["Draft", "Review", "Approved"].map((s) => (
              <div key={s} className="rounded-xl border border-slate-100 bg-white p-3 text-[12px] font-semibold text-slate-700">
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Stakeholder thread</div>
          <div className="space-y-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-slate-700">“Can we tweak the headline?”</div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-[12px] text-slate-700">Approved — ship version B.</div>
          </div>
        </div>
      </div>
    );
  }

  if (id === "remote") {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Async check-in</div>
          <div className="space-y-2 text-[12px] text-slate-700">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">Yesterday: closed 8 tasks</div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">Today: unblock auth flow</div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">Blocker: waiting on review</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Handoff</div>
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-black text-slate-900">Timezone overlap</div>
              <div className="text-[12px] font-black text-indigo-600">2h</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600" style={{ width: "35%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === "enterprise") {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Access policies</div>
          <div className="space-y-2">
            {["SSO required", "2FA enforced", "Guest expiry 7d"].map((p) => (
              <div key={p} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-slate-700 flex items-center justify-between">
                <span>{p}</span>
                <span className="text-emerald-700 font-black">On</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-[12px] font-black text-slate-900 mb-2">Audit logs</div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2 text-[12px] text-slate-700">
            <div className="flex items-center justify-between"><span>Role updated</span><span className="text-slate-400">1m</span></div>
            <div className="flex items-center justify-between"><span>Workspace created</span><span className="text-slate-400">12m</span></div>
            <div className="flex items-center justify-between"><span>SSO enabled</span><span className="text-slate-400">2h</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="text-[12px] font-black text-slate-900 mb-2">Sprint overview</div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="text-[12px] font-black text-slate-900">Sprint 14</div>
          <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: "62%" }} />
          </div>
          <div className="mt-2 text-[12px] text-slate-500">12 / 19 tasks complete</div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-[12px] font-black text-slate-900 mb-2">PR to task</div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-black text-slate-900">#482</div>
            <div className="text-[12px] font-black text-emerald-700">Merged</div>
          </div>
          <div className="text-[12px] text-slate-600 mt-2">“Improve onboarding completion”</div>
        </div>
      </div>
    </div>
  );
}
