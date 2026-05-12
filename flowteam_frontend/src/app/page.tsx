"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  coreFeatures, 
  navItems, 
  integrations, 
  useCases, 
  stats, 
  pricing, 
  testimonials, 
  securityBadges,
  faqs 
} from "./landingContent";
import {
  ArrowRight,
  ChevronDown,
  Play,
  Check,
  MessageSquare,
  Users,
  Calendar,
  Globe,
  Shield,
  Star,
  Plus,
  ArrowUpRight,
  Menu,
  X,
  Zap,
  CheckCircle2,
  Lock,
  Activity,
  ArrowDown,
  Quote,
  Kanban,
  Video,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   LANDING PAGE REDESIGN v2 (Ultra-Premium)
   Direction: High-fidelity Slack × Jira × Teams
   ───────────────────────────────────────────── */

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#020205] text-white overflow-x-hidden selection:bg-indigo-500/30 grainy">
      
      {/* ── Navigation ────────────────────────────────── */}
      <nav className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-700",
        isScrolled ? "bg-black/40 backdrop-blur-2xl border-b border-white/[0.05] py-3" : "bg-transparent py-8"
      )}>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo />
            <div className="hidden lg:flex items-center gap-10">
              {navItems.map((item) => (
                <div key={item.label} className="group relative">
                  <button className="flex items-center gap-1.5 text-[14px] font-semibold text-white/60 hover:text-white transition-all">
                    {item.label}
                    {item.children && <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-500 opacity-40" />}
                  </button>
                  {item.children && (
                    <div className="absolute top-full left-[-24px] pt-5 opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-500">
                      <div className="w-[320px] rounded-[24px] border border-white/[0.08] bg-[#08080f]/98 backdrop-blur-3xl p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
                        <div className="grid gap-2">
                          {item.children.map((child: any) => (
                            <Link key={child.label} href="#" className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all group/item">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] text-indigo-400 group-hover/item:scale-110 group-hover/item:bg-indigo-500/10 transition-all">
                                {child.icon && <child.icon size={20} />}
                              </div>
                              <div>
                                <div className="text-[14px] font-bold text-white mb-0.5">{child.label}</div>
                                <div className="text-[12px] text-white/40 leading-snug">{child.description}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden sm:block text-[14px] font-bold text-white/50 hover:text-white transition-all">
              Sign In
            </Link>
            <Link href="/register">
              <button className="relative px-7 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[14px] font-black text-white shadow-[0_20px_40px_-8px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                Get Started Free
              </button>
            </Link>
            <button className="lg:hidden text-white/70" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative pt-44 pb-32 lg:pt-64 lg:pb-48 overflow-hidden">
        {/* Deep Nebula Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[1200px] pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#611f69]/20 blur-[140px] animate-pulse-slow" />
          <div className="absolute top-[5%] right-[15%] w-[500px] h-[500px] rounded-full bg-[#0052CC]/15 blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/[0.08] blur-[160px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,#020205_80%)]" />
        </div>
        
        <div className="mx-auto max-w-7xl px-6 relative z-10 grid lg:grid-cols-2 gap-20 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-5 py-2 text-[12px] font-black uppercase tracking-[0.15em] text-indigo-300 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Sparkles size={14} className="text-amber-400" />
              The Future of Team OS
              <div className="ml-2 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            
            <h1 className="text-[clamp(3rem,6vw,6rem)] font-black leading-[0.98] tracking-[-0.04em] mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              <span className="text-white">Where Teams</span><br />
              <span className="text-gradient-purple">Communicate</span>, <br />
              <span className="text-gradient-blue">Plan</span> & <span className="text-indigo-400">Deliver</span>.
            </h1>
            
            <p className="text-[20px] lg:text-[22px] text-white/45 leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              The only platform that unites Slack-style chat, Jira-style project tracking, and Teams-style video into one fluid workspace.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-10 py-5 rounded-[22px] bg-indigo-600 hover:bg-indigo-500 text-[17px] font-black text-white shadow-[0_24px_48px_-12px_rgba(79,70,229,0.5)] flex items-center justify-center gap-3 group transition-all hover:scale-[1.03] active:scale-95">
                  Start Free Trial
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                </button>
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 rounded-[22px] border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[17px] font-black text-white/80 flex items-center justify-center gap-3 backdrop-blur-xl transition-all hover:text-white">
                <Play size={18} className="fill-white" />
                Watch Demo
              </button>
            </div>
            
            <div className="mt-16 flex flex-col items-center lg:items-start gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
              <div className="flex -space-x-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-11 w-11 rounded-full border-[3px] border-[#020205] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-black text-white shadow-xl">CW</div>
                ))}
                <div className="h-11 w-11 rounded-full border-[3px] border-[#020205] bg-white/[0.08] flex items-center justify-center text-[11px] font-black text-white/40 backdrop-blur-sm">+10k</div>
              </div>
              <div className="text-[13px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                <span className="h-1 w-8 bg-white/10 rounded-full" />
                Trusted by 10M+ innovative users
              </div>
            </div>
          </div>
          
          <div className="relative group perspective-2000 animate-in fade-in slide-in-from-right-16 duration-1200">
            {/* Ultra-Premium Glass Mockup */}
            <div className="relative z-20 rounded-[32px] border border-white/[0.12] bg-[#0a0a14]/60 backdrop-blur-md shadow-[0_80px_160px_-32px_rgba(0,0,0,0.9)] overflow-hidden transform-gpu group-hover:rotate-y-[-2deg] group-hover:rotate-x-1 transition-all duration-1000 ease-out">
              <div className="flex h-12 items-center gap-2.5 border-b border-white/[0.06] bg-white/[0.03] px-6">
                <div className="flex gap-2">
                  <div className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] shadow-[0_0_10px_rgba(255,95,87,0.3)]" />
                  <div className="h-3.5 w-3.5 rounded-full bg-[#febc2e] shadow-[0_0_10px_rgba(254,188,46,0.3)]" />
                  <div className="h-3.5 w-3.5 rounded-full bg-[#28c840] shadow-[0_0_10px_rgba(40,200,64,0.3)]" />
                </div>
                <div className="ml-6 h-7 w-64 rounded-full bg-white/[0.05] border border-white/[0.05] flex items-center px-4 text-[11px] text-white/30 font-medium">
                  app.cowrk.io/project/velocity-sprint
                </div>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src="file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_hero_mockup_1778590467130.png" 
                  alt="Cowrk Workspace"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14]/40 to-transparent" />
              </div>
            </div>
            
            {/* Floating Context Cards */}
            <div className="absolute -top-12 -right-12 z-30 p-5 rounded-2xl glass-dark border border-white/[0.1] shadow-2xl animate-float">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center font-black text-[14px]">JD</div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-[#0a0a14]" />
                </div>
                <div>
                  <div className="text-[14px] font-black">Julian Chen</div>
                  <div className="text-[11px] text-white/40">Typing in #product-sync...</div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -left-16 z-30 p-6 rounded-2xl glass-dark border border-white/[0.1] shadow-2xl animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#00A3BF] flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Kanban size={32} />
                </div>
                <div>
                  <div className="text-[15px] font-black mb-0.5">Sprint Goal Reached</div>
                  <div className="text-[11px] text-white/40">24 tasks completed ahead of schedule</div>
                </div>
                <div className="ml-4 h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                  <Plus size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Unified Workspace Section ────────────────── */}
      <section className="py-40 lg:py-60 px-6 relative bg-[#020205]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-32 max-w-3xl mx-auto">
            <div className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[12px] mb-6">One Workspace</div>
            <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-black leading-tight mb-10 text-white tracking-tight">
              Unified Workspace. <br /> 
              <span className="text-white/40">Unlimited Potential.</span>
            </h2>
            <p className="text-[20px] text-white/45 max-w-2xl mx-auto">Ditch the tab-switching fatigue. Bring your team, your tasks, and your meetings into one high-performance interface.</p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-10">
            {coreFeatures.map((feature) => (
              <div key={feature.id} className="group relative rounded-[40px] border border-white/[0.05] bg-white/[0.01] p-10 hover:bg-white/[0.03] transition-all duration-700 overflow-hidden">
                {/* Dynamic Aura */}
                <div 
                  className="absolute -top-32 -right-32 w-80 h-80 blur-[120px] opacity-0 group-hover:opacity-20 transition-all duration-1000" 
                  style={{ backgroundColor: feature.accent }} 
                />
                
                <div className="relative z-10">
                  <div 
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.5)]" 
                    style={{ backgroundColor: feature.accent }}
                  >
                    <feature.icon size={32} />
                  </div>
                  <h3 className="text-3xl font-black mb-5 tracking-tight">{feature.title}</h3>
                  <p className="text-white/40 text-[16px] leading-relaxed mb-10">{feature.description}</p>
                  
                  <ul className="space-y-5 mb-12">
                    {feature.features.map(f => (
                      <li key={f} className="flex items-center gap-4 text-[15px] font-bold text-white/70">
                        <div className="h-6 w-6 rounded-full bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          <Check size={14} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="relative mt-auto pt-8 translate-y-12 group-hover:translate-y-0 transition-all duration-1000 ease-out opacity-40 group-hover:opacity-100">
                  <img 
                    src={
                      feature.id === "communication" ? "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_chat_feature_1778590483995.png" :
                      feature.id === "projects" ? "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_project_feature_1778590501481.png" :
                      "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_meeting_feature_1778590517690.png"
                    } 
                    alt={feature.title}
                    className="rounded-t-[32px] border-t border-x border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Diagram Section ────────────────── */}
      <section className="py-40 lg:py-60 px-6 bg-black relative overflow-hidden">
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-32">
            <div className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[12px] mb-8">End-to-End Execution</div>
            <h2 className="text-[clamp(2.5rem,5vw,5.5rem)] font-black leading-tight mb-8 text-white tracking-tighter">One Unified Workflow.</h2>
            <p className="text-[20px] text-white/40 max-w-xl mx-auto leading-relaxed">From the first brainstorm to the final delivery, data flows seamlessly between every module.</p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8 relative">
            {/* Connecting SVG Path (Dynamic Feel) */}
            <svg className="hidden lg:block absolute top-[60px] left-[10%] w-[80%] h-1 z-0 opacity-20" viewBox="0 0 1000 1">
              <line x1="0" y1="0.5" x2="1000" y2="0.5" stroke="white" strokeWidth="2" strokeDasharray="8 12" />
            </svg>
            
            {[
              { step: 1, title: "Ideate", desc: "Collaborate in real-time channels", icon: MessageSquare, accent: "#611f69" },
              { step: 2, title: "Convert", desc: "Turn chats into trackable tasks", icon: Kanban, accent: "#0052CC" },
              { step: 3, title: "Huddle", desc: "Meet to align on blockers", icon: Video, accent: "#6264A7" },
              { step: 4, title: "Deliver", desc: "Ship faster with AI assistance", icon: CheckCircle2, accent: "#10b981" }
            ].map((node, i) => (
              <div key={node.step} className="relative z-10 flex flex-col items-center text-center p-10 rounded-[32px] glass border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-700 group">
                <div 
                  className="h-20 w-20 rounded-[24px] flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500" 
                  style={{ backgroundColor: node.accent }}
                >
                  <node.icon size={36} />
                </div>
                <div className="text-white/25 font-black uppercase tracking-widest text-[11px] mb-3">Phase {node.step}</div>
                <h4 className="text-2xl font-black mb-4 tracking-tight">{node.title}</h4>
                <p className="text-white/40 text-[15px] leading-relaxed mb-6">{node.desc}</p>
                
                {/* Step indicator dot */}
                <div className="mt-auto h-2 w-2 rounded-full bg-white/10 group-hover:bg-indigo-500 group-hover:scale-150 transition-all" />
              </div>
            ))}
          </div>
          
          <div className="mt-32 p-16 rounded-[48px] border border-white/[0.08] bg-white/[0.01] backdrop-blur-xl grid lg:grid-cols-3 gap-20 items-center">
            <div className="lg:col-span-1">
              <h3 className="text-[36px] font-black leading-tight mb-8">Performance <br /> that speaks.</h3>
              <p className="text-white/40 text-[18px] leading-relaxed mb-10">Teams moving to Cowrk report a dramatic decrease in "work about work" within the first 30 days.</p>
              <Link href="/register" className="inline-flex items-center gap-3 text-indigo-400 font-black hover:gap-5 transition-all text-[16px]">
                View Productivity Report <ArrowRight size={20} />
              </Link>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-10">
              {[
                { label: "Efficiency Boost", value: "+32%", sub: "Avg across 5k+ teams" },
                { label: "Meeting Reduction", value: "4.5h", sub: "Saved per user / week" },
                { label: "Decisions Logged", value: "85%", sub: "Higher visibility rate" },
                { label: "Developer Velocity", value: "+40%", sub: "Shipping speedup" }
              ].map(metric => (
                <div key={metric.label} className="p-8 rounded-[24px] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all">
                  <div className="text-4xl font-black text-white mb-2">{metric.value}</div>
                  <div className="text-[13px] font-black text-white/50 uppercase tracking-widest mb-2">{metric.label}</div>
                  <div className="text-[12px] text-white/30">{metric.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials Carousel (Premium Style) ────────── */}
      <section className="py-40 lg:py-60 px-6 bg-[#020205]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-12">
            {testimonials.map((t, idx) => (
              <div key={idx} className="relative p-12 rounded-[40px] border border-white/[0.05] bg-white/[0.01] flex flex-col items-start hover:bg-white/[0.03] transition-all duration-700">
                <Quote size={48} className="text-indigo-500 opacity-20 mb-10" />
                <p className="text-[18px] lg:text-[20px] font-bold leading-relaxed mb-12 text-white/80">"{t.quote}"</p>
                
                <div className="mt-auto flex items-center gap-5 pt-8 border-t border-white/[0.05] w-full">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-lg">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[16px] font-black text-white">{t.name}</div>
                    <div className="text-[13px] text-white/40">{t.role}, {t.company}</div>
                  </div>
                  <div className="ml-auto px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-[11px] font-black uppercase tracking-widest">
                    {t.metric}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section (High Contrast) ──────────────── */}
      <section id="pricing" className="py-40 lg:py-60 px-6 bg-black relative">
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-32">
            <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-black tracking-tighter mb-10">Simple, Scaling Pricing.</h2>
            
            <div className="flex items-center justify-center gap-8 mt-16">
              <span className={cn("text-[15px] font-black transition-all", billingCycle === "monthly" ? "text-white" : "text-white/30")}>Billed Monthly</span>
              <button 
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-18 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] p-1.5 relative transition-all"
              >
                <div className={cn("h-6 w-6 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] transition-all", billingCycle === "annual" ? "translate-x-8" : "translate-x-0")} />
              </button>
              <div className="flex items-center gap-3">
                <span className={cn("text-[15px] font-black transition-all", billingCycle === "annual" ? "text-white" : "text-white/30")}>Billed Annually</span>
                <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-[11px] font-black uppercase tracking-widest">Save 25%</span>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10 items-start">
            {pricing.map(tier => (
              <div key={tier.name} className={cn(
                "relative flex flex-col p-12 rounded-[48px] border transition-all duration-700",
                tier.popular 
                  ? "bg-[#080812] border-indigo-500/40 shadow-[0_48px_96px_-16px_rgba(0,0,0,0.8)] scale-[1.05] z-20" 
                  : "bg-white/[0.01] border-white/[0.05] hover:border-white/[0.15] z-10"
              )}>
                {tier.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-indigo-600 text-[12px] font-black uppercase tracking-widest text-white shadow-2xl">
                    Most Popular Choice
                  </div>
                )}
                
                <div className="text-2xl font-black mb-4 tracking-tight">{tier.name}</div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-6xl font-black tracking-tighter">{tier.price}</span>
                  <span className="text-white/30 text-[16px] font-medium">{tier.period}</span>
                </div>
                <p className="text-[15px] text-white/40 mb-12 h-12 leading-relaxed">{tier.description}</p>
                
                <Link href="/register" className="mb-12">
                  <button className={cn(
                    "w-full py-5 rounded-2xl text-[17px] font-black transition-all active:scale-95",
                    tier.popular 
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/30" 
                      : "bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                  )}>
                    {tier.cta}
                  </button>
                </Link>
                
                <div className="space-y-6">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-start gap-4 text-[14px] font-bold text-white/60">
                      <div className="h-5 w-5 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={4} className="text-indigo-400" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Section (Enterprise Focus) ────────── */}
      <section className="py-40 lg:py-60 px-6 bg-[#020205]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div>
              <div className="text-violet-400 font-black uppercase tracking-[0.2em] text-[12px] mb-8">Security & Compliance</div>
              <h2 className="text-[clamp(2.5rem,4.5vw,4.5rem)] font-black leading-tight mb-10 tracking-tighter">Trusted by the <br /> most secure orgs.</h2>
              <p className="text-[20px] text-white/40 mb-16 leading-relaxed">We protect your most sensitive data with military-grade encryption and rigorous compliance standards.</p>
              
              <div className="grid sm:grid-cols-2 gap-12">
                {[
                  { title: "SAML SSO", desc: "Enterprise-wide auth with Okta, Azure AD, or Google" },
                  { title: "Data Isolation", desc: "Physically separated data storage per workspace" },
                  { title: "Network Security", desc: "Cloudflare-protected DDoS and WAF security" },
                  { title: "Admin Controls", desc: "Granular RBAC and IP-based access restrictions" }
                ].map(item => (
                  <div key={item.title}>
                    <div className="text-[17px] font-black mb-2 tracking-tight">{item.title}</div>
                    <div className="text-[13px] text-white/35 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {securityBadges.map(badge => (
                <div key={badge.name} className="p-12 rounded-[48px] glass-dark border border-white/[0.05] flex flex-col items-center text-center group hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-700">
                  <div className="h-20 w-20 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl">
                    {badge.icon === "ShieldCheck" ? <Shield size={40} /> : badge.icon === "Lock" ? <Lock size={40} /> : badge.icon === "Activity" ? <Activity size={40} /> : <CheckCircle2 size={40} />}
                  </div>
                  <div className="text-[20px] font-black tracking-tight">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA (Big Orb Design) ────────────────── */}
      <section className="py-40 px-6 bg-black relative overflow-hidden">
        <div className="mx-auto max-w-7xl relative rounded-[80px] overflow-hidden group">
          {/* Immersive Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#611f69] via-[#0052CC] to-[#6264A7] opacity-90 transition-transform duration-1000 group-hover:scale-110" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-white/10 blur-[150px] rounded-full animate-pulse-slow" />
          
          <div className="relative z-10 px-8 py-32 lg:py-48 text-center max-w-4xl mx-auto">
            <h2 className="text-[clamp(2.5rem,6vw,6rem)] font-black mb-10 text-white tracking-tighter leading-[0.95]">Ready to transform <br /> how you work?</h2>
            <p className="text-[22px] lg:text-[26px] text-white/80 font-medium mb-16 leading-relaxed">Join 10,000+ teams shipping faster and staying aligned with Cowrk.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full px-14 py-6 rounded-2xl bg-white text-indigo-900 text-[20px] font-black shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all">
                  Get Started Free
                </button>
              </Link>
              <button className="w-full sm:w-auto px-14 py-6 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md text-white text-[20px] font-black hover:bg-black/40 transition-all">
                Schedule Demo
              </button>
            </div>
            
            <div className="mt-16 flex flex-wrap items-center justify-center gap-10 text-white/60 text-[15px] font-bold">
              <span className="flex items-center gap-2"><Check size={20} className="text-white/40" /> No credit card required</span>
              <span className="flex items-center gap-2"><Check size={20} className="text-white/40" /> 14-day free trial</span>
              <span className="flex items-center gap-2"><Check size={20} className="text-white/40" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="pt-32 pb-16 px-6 border-t border-white/[0.05] bg-[#020205]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-32">
            <div className="col-span-2 lg:col-span-2">
              <Logo className="mb-10" />
              <p className="text-[15px] text-white/35 leading-relaxed max-w-xs">The modern all-in-one operating system for team collaboration, task delivery, and remote execution.</p>
            </div>
            {['Product', 'Solutions', 'Company', 'Social'].map((category) => (
              <div key={category}>
                <h5 className="text-[13px] font-black mb-8 uppercase tracking-[0.2em] text-white/20">{category}</h5>
                <ul className="space-y-5 text-[15px] font-bold text-white/50">
                  <li><Link href="#" className="hover:text-white transition-all">Chat & Messaging</Link></li>
                  <li><Link href="#" className="hover:text-white transition-all">Project Boards</Link></li>
                  <li><Link href="#" className="hover:text-white transition-all">Video Huddles</Link></li>
                  <li><Link href="#" className="hover:text-white transition-all">Automations</Link></li>
                </ul>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-16 border-t border-white/[0.05]">
            <div className="text-[13px] font-bold text-white/20">© 2026 Cowrk Technologies Inc. All rights reserved. Built with ❤️ for remote teams.</div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-[13px] font-black text-white/30">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                System Active
              </div>
              <div className="h-5 w-[1px] bg-white/[0.08]" />
              <button className="text-[13px] font-black text-white/30 flex items-center gap-2 hover:text-white transition-all">
                <Globe size={16} /> EN-US
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] bg-indigo-600 shadow-[0_12px_24px_-4px_rgba(79,70,229,0.5)]">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent" />
        <span className="relative text-[20px] font-black text-white tracking-tighter">CW</span>
      </div>
      <span className="text-[22px] font-black tracking-[-0.05em] text-white uppercase">Cowrk</span>
    </div>
  );
}
