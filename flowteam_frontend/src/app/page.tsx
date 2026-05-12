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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   LANDING PAGE REDESIGN
   Direction: Slack vibrancy × Jira professionalism × Teams enterprise
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
    <div className="flex min-h-screen flex-col bg-[#050508] text-white overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* ── Navigation ────────────────────────────────── */}
      <nav className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-500",
        isScrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/10 py-3" : "bg-transparent py-6"
      )}>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <div key={item.label} className="group relative">
                  <button className="flex items-center gap-1 text-[14px] font-medium text-white/70 hover:text-white transition-colors">
                    {item.label}
                    {item.children && <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />}
                  </button>
                  {item.children && (
                    <div className="absolute top-full left-[-20px] pt-4 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
                      <div className="w-[280px] rounded-2xl border border-white/10 bg-[#0a0a10]/95 backdrop-blur-2xl p-4 shadow-2xl">
                        {item.children.map((child: any) => (
                          <Link key={child.label} href="#" className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group/item">
                            {child.icon && <child.icon size={20} className="text-indigo-400 mt-1" />}
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
            <Link href="/register">
              <button className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
                Get Started Free
              </button>
            </Link>
            <button className="lg:hidden text-white/70" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col p-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-12">
            <Logo />
            <button onClick={() => setMobileMenuOpen(false)}><X size={28} /></button>
          </div>
          <div className="space-y-8">
            {navItems.map(item => (
              <div key={item.label}>
                <div className="text-2xl font-bold mb-4">{item.label}</div>
                {item.children && (
                  <div className="space-y-4 pl-4 border-l border-white/10">
                    {item.children.map((child: any) => (
                      <div key={child.label} className="text-lg text-white/60">{child.label}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-4">
            <Link href="/register" className="w-full py-4 rounded-2xl bg-indigo-600 text-center font-bold text-lg">Get Started Free</Link>
            <Link href="/login" className="w-full py-4 rounded-2xl border border-white/10 text-center font-bold text-lg">Sign In</Link>
          </div>
        </div>
      )}

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative pt-40 pb-24 lg:pt-56 lg:pb-40 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[1000px] pointer-events-none opacity-40">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#611f69_0%,#0052CC_30%,#6264A7_60%,transparent_100%)]" />
        </div>
        
        <div className="mx-auto max-w-7xl px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[12px] font-bold text-indigo-300 mb-8 animate-in slide-in-from-bottom-4 duration-700">
              <Zap size={14} className="fill-indigo-300" />
              10M+ teams collaborate daily
            </div>
            <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-black leading-[1.05] tracking-tight mb-8 animate-in slide-in-from-bottom-6 duration-1000">
              Where Teams <span className="text-indigo-400">Plan</span>, <br />
              <span className="text-violet-400">Communicate</span>, <br />
              and <span className="text-cyan-400">Deliver</span>.
            </h1>
            <p className="text-[18px] lg:text-[20px] text-white/50 leading-relaxed mb-10 max-w-xl animate-in slide-in-from-bottom-8 duration-1000">
              Unite your workflow with real-time chat, agile project tracking, and seamless video collaboration in one workspace.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom-10 duration-1000">
              <Link href="/register">
                <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-[16px] font-black text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center gap-2 group transition-all hover:scale-105 active:scale-95">
                  Start Free Trial
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-[16px] font-black text-white flex items-center justify-center gap-2 transition-all">
                <Play size={18} className="fill-white" />
                Watch Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-8 text-white/30">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">JD</div>
                ))}
                <div className="h-10 w-10 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">+5k</div>
              </div>
              <div className="text-[13px] font-medium">Joined by the world's most innovative teams</div>
            </div>
          </div>
          
          <div className="relative group perspective-1000 animate-in slide-in-from-right-12 duration-1000">
            {/* Animated Mockup Container */}
            <div className="relative z-20 rounded-3xl border border-white/10 bg-[#0d0d1c] shadow-[0_64px_128px_-16px_rgba(0,0,0,0.7)] overflow-hidden transform group-hover:rotate-x-1 group-hover:rotate-y-[-1deg] transition-transform duration-700">
              <div className="flex h-10 items-center gap-2 border-b border-white/5 bg-white/2 px-5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-4 h-6 w-1/2 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono">app.cowrk.io</div>
              </div>
              <img 
                src="file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_hero_mockup_1778590467130.png" 
                alt="Cowrk Interface"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-10 -right-10 z-30 p-4 rounded-2xl glass-dark border border-white/10 shadow-2xl animate-float">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold">JD</div>
                <div>
                  <div className="text-[12px] font-bold">James Davis</div>
                  <div className="text-[10px] text-white/50">Joined #engineering</div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-12 z-30 p-4 rounded-2xl glass-dark border border-white/10 shadow-2xl animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500 flex items-center justify-center"><CheckCircle2 size={24} /></div>
                <div>
                  <div className="text-[12px] font-bold">Sprint Beta Complete</div>
                  <div className="text-[10px] text-white/50">12 tasks delivered today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────── */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl lg:text-4xl font-black text-white mb-2">{stat.value}</div>
              <div className="text-[13px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid (Tri-Split) ─────────────────── */}
      <section className="py-32 lg:py-48 px-6 bg-[#050508]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-black mb-8">Unified Workspace. <br /> Unlimited Potential.</h2>
            <p className="text-xl text-white/50">Ditch the tool overload. One platform for everything your team needs to stay in flow.</p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature, idx) => (
              <div key={feature.id} className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                {/* Accent Glow */}
                <div className={cn("absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 bg-[var(--accent)]")} style={{ "--accent": feature.accent } as any} />
                
                <div className="relative z-10">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl" style={{ backgroundColor: feature.accent }}>
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                  <p className="text-white/50 mb-8 leading-relaxed">{feature.description}</p>
                  
                  <ul className="space-y-4 mb-10">
                    {feature.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-[14px] font-medium text-white/70">
                        <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center"><Check size={12} className="text-indigo-400" /></div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="relative mt-auto pt-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                  <img 
                    src={
                      feature.id === "communication" ? "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_chat_feature_1778590483995.png" :
                      feature.id === "projects" ? "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_project_feature_1778590501481.png" :
                      "file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_meeting_feature_1778590517690.png"
                    } 
                    alt={feature.title}
                    className="rounded-t-2xl border border-white/10 shadow-2xl transition-all group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Unified Workflow (Idea to Delivery) ────────── */}
      <section className="py-32 lg:py-48 px-6 bg-black relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[conic-gradient(from_0deg_at_50%_50%,#611f69_0deg,#0052CC_120deg,#6264A7_240deg,#611f69_360deg)] animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-0 bg-black backdrop-blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-24">
            <div className="text-indigo-400 font-bold uppercase tracking-widest text-[13px] mb-4">From Idea to Delivery</div>
            <h2 className="text-4xl lg:text-6xl font-black mb-8 text-white">One Unified Workflow.</h2>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-6 items-start relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
            
            {[
              { step: 1, title: "Discuss", desc: "Team ideates in channels & threads", icon: MessageSquare, accent: "#611f69" },
              { step: 2, title: "Plan", desc: "Instantly convert decisions to tasks", icon: Kanban, accent: "#0052CC" },
              { step: 3, title: "Review", desc: "Meet face-to-face to refine goals", icon: Video, accent: "#6264A7" },
              { step: 4, title: "Deliver", desc: "Ship with confidence & track results", icon: CheckCircle2, accent: "#10b981" }
            ].map((node, i) => (
              <div key={node.step} className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl glass border border-white/5 hover:border-white/20 transition-all duration-500 group">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: node.accent }}>
                  <node.icon size={32} />
                </div>
                <div className="text-white/30 font-bold mb-2">Step {node.step}</div>
                <h4 className="text-2xl font-black mb-3">{node.title}</h4>
                <p className="text-white/50 text-[14px] leading-relaxed">{node.desc}</p>
                {i < 3 && <ArrowRight size={24} className="lg:hidden mt-8 text-white/20" />}
              </div>
            ))}
          </div>
          
          <div className="mt-32 p-12 rounded-[40px] border border-white/10 bg-white/[0.01] backdrop-blur-sm grid lg:grid-cols-3 gap-16 items-center">
            <div className="lg:col-span-1">
              <h3 className="text-3xl font-black mb-6">Real-time Efficiency.</h3>
              <p className="text-white/50 mb-8">See how teams using Cowrk outperform their peers across every key metric.</p>
              <Link href="/register" className="text-indigo-400 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                Learn more about productivity gains <ArrowRight size={16} />
              </Link>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-8">
              {[
                { label: "Productivity Increase", value: "+32%" },
                { label: "Meeting Time Saved", value: "4.5h/wk" },
                { label: "Communication Latency", value: "-60%" },
                { label: "Team Morale Score", value: "4.9/5" }
              ].map(metric => (
                <div key={metric.label} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="text-3xl font-black text-white mb-1">{metric.value}</div>
                  <div className="text-[12px] font-bold text-white/30 uppercase tracking-widest">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations Section ──────────────────────── */}
      <section className="py-32 lg:py-48 px-6 bg-[#050508]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-black mb-8">Your Workflow, <br /> Unified.</h2>
            <p className="text-xl text-white/50">Cowrk plays nicely with the tools you already use every day.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-24">
            {integrations.map(int => (
              <div key={int.name} className="h-32 flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group grayscale hover:grayscale-0">
                <img src={`https://cdn.simpleicons.org/${int.icon}/ffffff`} alt={int.name} className="h-10 mb-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                <span className="text-[12px] font-bold text-white/20 group-hover:text-white transition-colors">{int.name}</span>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col items-center">
            <p className="text-white/40 font-medium mb-8 uppercase tracking-widest text-[12px]">And 1,000+ more via API & Webhooks</p>
            <button className="px-10 py-4 rounded-2xl border border-white/10 hover:bg-white/5 font-black transition-all">Explore Marketplace</button>
          </div>
        </div>
      </section>

      {/* ── Use Case Tabs ────────────────────────────── */}
      <section className="py-32 lg:py-48 px-6 bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl lg:text-6xl font-black mb-12">Built for every <br /> type of team.</h2>
              <div className="space-y-6">
                {useCases.map((uc) => (
                  <button key={uc.id} className="w-full p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-left transition-all group flex items-start gap-6">
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <uc.icon size={24} />
                    </div>
                    <div>
                      <div className="text-xl font-black mb-2">{uc.label}</div>
                      <div className="text-white/50 text-[14px]">{uc.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-[40px] overflow-hidden border border-white/10 shadow-3xl bg-[#0a0a16]">
                <img src="file:///C:/Users/akaas/.gemini/antigravity/brain/69a09468-70fa-4500-ae49-2566a1c8fa3c/cowrk_hero_mockup_1778590467130.png" alt="Use Case Demo" className="w-full" />
              </div>
              {/* Floating Testimonial */}
              <div className="absolute -bottom-12 -left-12 max-w-sm p-8 rounded-3xl glass-dark border border-white/10 shadow-2xl">
                <Quote size={32} className="text-indigo-400 mb-6 opacity-40" />
                <p className="text-[15px] font-medium leading-relaxed mb-6 italic">"Cowrk is the first tool that actually keeps our remote team on the same page without endless sync meetings."</p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">SM</div>
                  <div>
                    <div className="text-[13px] font-bold">Sarah Miller</div>
                    <div className="text-[11px] text-white/40">Head of Growth, Acme Corp</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <section id="pricing" className="py-32 lg:py-48 px-6 bg-[#050508]">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-6xl font-black mb-8">Transparent Pricing.</h2>
            <div className="flex items-center justify-center gap-6 mt-12">
              <span className={cn("text-[14px] font-bold transition-colors", billingCycle === "monthly" ? "text-white" : "text-white/40")}>Monthly</span>
              <button 
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-14 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 p-1 relative transition-all"
              >
                <div className={cn("h-6 w-6 rounded-full bg-indigo-500 transition-all", billingCycle === "annual" ? "translate-x-6" : "translate-x-0")} />
              </button>
              <div className="flex items-center gap-2">
                <span className={cn("text-[14px] font-bold transition-colors", billingCycle === "annual" ? "text-white" : "text-white/40")}>Annually</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider">Save 20%</span>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {pricing.map(tier => (
              <div key={tier.name} className={cn(
                "relative flex flex-col p-8 rounded-[32px] border transition-all duration-500",
                tier.popular ? "bg-[#0a0a16] border-indigo-500/30 shadow-2xl scale-[1.02] lg:scale-[1.05]" : "bg-white/[0.01] border-white/5 hover:border-white/20"
              )}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/40">
                    Most Popular
                  </div>
                )}
                <div className="text-xl font-black mb-2">{tier.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{tier.price}</span>
                  <span className="text-white/40 text-[14px]">{tier.period}</span>
                </div>
                <p className="text-[13px] text-white/50 mb-8 h-10">{tier.description}</p>
                
                <Link href="/register" className="mb-10">
                  <button className={cn(
                    "w-full py-4 rounded-2xl font-black transition-all",
                    tier.popular ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  )}>
                    {tier.cta}
                  </button>
                </Link>
                
                <div className="space-y-4">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-start gap-3 text-[13px] font-medium text-white/60">
                      <Check size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Trust ──────────────────────────── */}
      <section className="py-32 lg:py-48 px-6 bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div>
              <div className="text-violet-400 font-bold uppercase tracking-widest text-[13px] mb-4">Enterprise Grade Security</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-8">Trusted by the world's <br /> most secure orgs.</h2>
              <p className="text-xl text-white/50 mb-12">Cowrk is built on a foundation of security and compliance, with features designed to keep your data protected at every level.</p>
              
              <div className="grid grid-cols-2 gap-8">
                {[
                  { title: "SSO & SCIM", desc: "SAML 2.0 & Okta support" },
                  { title: "End-to-End", desc: "AES-256 data encryption" },
                  { title: "Audit Logs", desc: "Full action history logs" },
                  { title: "24/7 Support", desc: "Dedicated success managers" }
                ].map(item => (
                  <div key={item.title}>
                    <div className="text-[15px] font-black mb-1">{item.title}</div>
                    <div className="text-[12px] text-white/40">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {securityBadges.map(badge => (
                <div key={badge.name} className="p-10 rounded-[32px] glass-dark border border-white/5 flex flex-col items-center text-center group hover:bg-white/[0.05] transition-all">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {badge.icon === "ShieldCheck" ? <Shield size={32} /> : badge.icon === "Lock" ? <Lock size={32} /> : badge.icon === "Activity" ? <Activity size={32} /> : <CheckCircle2 size={32} />}
                  </div>
                  <div className="text-lg font-black">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-7xl relative rounded-[60px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#611f69] via-[#0052CC] to-[#6264A7] opacity-90" />
          <div className="relative z-10 px-8 py-24 lg:py-32 text-center max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-7xl font-black mb-8 text-white tracking-tight">Ready to transform how your team works?</h2>
            <p className="text-xl lg:text-2xl text-white/80 mb-12">Join 10,000+ teams shipping faster and staying aligned with Cowrk.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full px-12 py-5 rounded-2xl bg-white text-indigo-900 text-[18px] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all">
                  Get Started Free
                </button>
              </Link>
              <button className="w-full sm:w-auto px-12 py-5 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-sm text-white text-[18px] font-black hover:bg-black/40 transition-all">
                Schedule Demo
              </button>
            </div>
            <div className="mt-8 text-white/50 text-[14px] font-medium flex flex-wrap items-center justify-center gap-6">
              <span className="flex items-center gap-1.5"><Check size={16} /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check size={16} /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><Check size={16} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="pt-24 pb-12 px-6 border-t border-white/5 bg-[#050508]">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 mb-24">
            <div className="col-span-2 lg:col-span-1">
              <Logo className="mb-8" />
              <p className="text-[14px] text-white/40 leading-relaxed max-w-[200px]">The modern all-in-one OS for team collaboration and project management.</p>
            </div>
            <div>
              <h5 className="text-[14px] font-black mb-6 uppercase tracking-widest text-white/30">Product</h5>
              <ul className="space-y-4 text-[14px] text-white/60">
                <li><Link href="#" className="hover:text-white transition-colors">Chat & Channels</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Kanban Boards</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Video Meetings</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Automations</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-black mb-6 uppercase tracking-widest text-white/30">Solutions</h5>
              <ul className="space-y-4 text-[14px] text-white/60">
                <li><Link href="#" className="hover:text-white transition-colors">Software Development</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Marketing Teams</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Remote Orgs</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Startups</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Enterprise</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-black mb-6 uppercase tracking-widest text-white/30">Company</h5>
              <ul className="space-y-4 text-[14px] text-white/60">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Press Kit</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-black mb-6 uppercase tracking-widest text-white/30">Connect</h5>
              <ul className="space-y-4 text-[14px] text-white/60">
                <li><Link href="#" className="hover:text-white transition-colors">Twitter (X)</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">LinkedIn</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Discord</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">GitHub</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-white/5">
            <div className="text-[12px] text-white/20">© 2026 Cowrk Technologies Inc. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[12px] text-white/40">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                All Systems Operational
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <button className="text-[12px] text-white/40 flex items-center gap-1.5 hover:text-white transition-colors">
                <Globe size={14} /> English (US)
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
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <span className="relative text-[18px] font-black text-white tracking-tighter">CW</span>
      </div>
      <span className="text-[20px] font-black tracking-tighter text-white">COWRK</span>
    </div>
  );
}
