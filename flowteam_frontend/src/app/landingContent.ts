import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Code,
  FileText,
  GitBranch,
  Globe,
  Kanban,
  Layers,
  Lock,
  Megaphone,
  MessageSquare,
  Paintbrush,
  Smartphone,
  Terminal,
  Video,
  Zap,
} from "lucide-react";

export const navItems = [
  {
    label: "Product",
    href: "#",
    children: [
      { label: "Chat", description: "Real-time messaging & threads", icon: MessageSquare },
      { label: "Projects", description: "Kanban, sprints & roadmaps", icon: Kanban },
      { label: "Meetings", description: "HD video calls & scheduling", icon: Video },
      { label: "Integrations", description: "Connect your favorite tools", icon: Zap },
    ],
  },
  {
    label: "Solutions",
    href: "#",
    children: [
      { label: "By Team Size", description: "From 2 to 20,000 users", icon: Building2 },
      { label: "By Industry", description: "Secure workflows for regulated teams", icon: Lock },
      { label: "By Use Case", description: "Ship, launch, and operate in one place", icon: Zap },
    ],
  },
  {
    label: "Resources",
    href: "#",
    children: [
      { label: "Documentation", description: "Guides & API references", icon: FileText },
      { label: "Tutorials", description: "Step-by-step walkthroughs", icon: Activity },
      { label: "Community", description: "Join the conversation", icon: Globe },
    ],
  },
  { label: "Pricing", href: "#pricing" },
];

export const coreFeatures = [
  {
    id: "communication",
    title: "Communication Hub",
    icon: MessageSquare,
    description: "Channels, DMs, threads, mentions, reactions, and file sharing — built for speed and clarity.",
    features: ["Channels & DMs", "Threads & replies", "Mentions & reactions", "File sharing & search", "Emoji & rich text"],
    accent: "#611f69",
  },
  {
    id: "projects",
    title: "Project Management Powerhouse",
    icon: Kanban,
    description: "Plan sprints, manage backlogs, and automate workflows with an enterprise-grade agile engine.",
    features: ["Sprint planning & tracking", "Backlog management", "Custom workflows & automation", "Roadmaps & milestones", "Burndown & analytics"],
    accent: "#0052CC",
  },
  {
    id: "collaboration",
    title: "Seamless Collaboration",
    icon: Video,
    description: "Meet in HD with recordings, screen share, and calendar sync — without leaving the workspace.",
    features: ["HD video & audio", "Screen sharing & co-annotation", "Meeting recordings & transcripts", "Calendar & scheduling", "Grid view & breakout rooms"],
    accent: "#6264A7",
  },
];

export type Integration = {
  name: string;
  icon: LucideIcon;
  blurb: string;
};

export const integrations: Integration[] = [
  { name: "GitHub", icon: GitBranch, blurb: "Link PRs to tasks and decisions with automatic status sync." },
  { name: "Figma", icon: Paintbrush, blurb: "Preview designs and leave feedback directly in threads." },
  { name: "Google Workspace", icon: FileText, blurb: "Attach Docs, Sheets, and Slides to any task or message." },
  { name: "Salesforce", icon: BarChart3, blurb: "Keep deal context aligned with delivery timelines." },
  { name: "Confluence", icon: Layers, blurb: "Turn documentation into actionable plans instantly." },
  { name: "Outlook/Google Cal", icon: CalendarDays, blurb: "Schedule meetings and sync availability across calendars." },
  { name: "Okta / Azure AD", icon: Lock, blurb: "Enterprise SSO and automated user provisioning (SCIM)." },
  { name: "Webhooks + REST API", icon: Zap, blurb: "Build custom automations with real-time event streams." },
];

export const customerLogos = [
  "TechFlow", "GlobalScale", "BankSafe", "RemoteFirst",
  "NovaSystems", "PioneerLabs", "VertexAI", "AtlasCorp",
  "StrataCloud", "CoreBridge", "OrionHealth", "QuantumLeap",
];

export const useCases = [
  {
    id: "software",
    label: "Software Teams",
    title: "Build & Ship Faster",
    description: "Connect code to tasks and decisions — no more context switching between tools.",
    icon: Code,
    features: ["Sprints + code reviews", "Deploy alerts in channels", "Decision-attached threads", "Automated CI/CD status cards"],
  },
  {
    id: "marketing",
    label: "Marketing Teams",
    title: "Campaigns Without Chaos",
    description: "Plan launches, manage creative assets, and keep stakeholders aligned from brief to publish.",
    icon: Megaphone,
    features: ["Editorial calendars", "Creative approval threads", "Asset handoff tracking", "Campaign retrospectives"],
  },
  {
    id: "remote",
    label: "Remote Teams",
    title: "Async by Default",
    description: "Stay aligned across time zones with threaded updates, video handoffs, and recorded decisions.",
    icon: Globe,
    features: ["Async daily check-ins", "Time zone overlays", "Meeting recordings + transcripts", "Decision capture"],
  },
  {
    id: "enterprise",
    label: "Enterprise Organizations",
    title: "Security at Scale",
    description: "Compliance, governance, and administrative control for the most regulated organizations.",
    icon: Building2,
    features: ["SAML SSO + SCIM provisioning", "Data residency controls", "Granular audit logs", "Custom retention policies"],
  },
];

export const stats = [
  { label: "Active Users", value: "10M+" },
  { label: "Countries", value: "150+" },
  { label: "Uptime", value: "99.9%" },
  { label: "Rating", value: "4.8★" },
];

export const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic chat + limited boards for individuals and small evaluations.",
    features: ["Unlimited direct messages", "5 public channels", "3 project boards", "Standard security", "Community support"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "$12",
    period: "per user/mo",
    description: "Full platform access for growing teams ready to standardize.",
    features: ["Unlimited channels & boards", "Custom workflows & automation", "HD video (up to 50 participants)", "Meeting recordings", "Guest access & sharing"],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Business",
    price: "$24",
    period: "per user/mo",
    description: "Advanced analytics, automation rules, and priority support.",
    features: ["Analytics dashboards & reports", "Advanced automation engine", "Unlimited meeting recordings", "Granular permissions", "Priority 24/7 support"],
    cta: "Upgrade Now",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "Dedicated support, compliance, and governance for large organizations.",
    features: ["SAML SSO + SCIM provisioning", "Data residency & encryption", "Audit logs & compliance reports", "Dedicated account manager", "Custom SLAs & onboarding"],
    cta: "Contact Sales",
    popular: false,
  },
];

export const testimonials = [
  {
    quote: "FlowTeam has transformed how engineering and product collaborate. It's the best of three worlds — Slack's speed, Jira's structure, and Teams' reliability — all in one place.",
    name: "Sarah Chen",
    role: "VP of Engineering",
    company: "TechFlow",
    avatar: "SC",
    metric: "40% faster shipping cycles",
    stars: 5,
  },
  {
    quote: "The connection between chat and project work is seamless. We stopped losing decisions in message history across dozens of channels.",
    name: "James Wilson",
    role: "Product Director",
    company: "GlobalScale",
    avatar: "JW",
    metric: "2.5h saved per person weekly",
    stars: 5,
  },
  {
    quote: "Security was our #1 concern when moving to a unified platform. FlowTeam's enterprise features gave us the confidence to roll out to 3,000 employees globally.",
    name: "Elena Rodriguez",
    role: "CISO",
    company: "BankSafe",
    avatar: "ER",
    metric: "Zero compliance findings in Q1",
    stars: 5,
  },
  {
    quote: "Our weekly status meeting is now optional. Async updates in threads + connected task boards mean everyone knows what's happening without another Zoom call.",
    name: "Noah Patel",
    role: "Head of Operations",
    company: "RemoteFirst Co.",
    avatar: "NP",
    metric: "30% fewer meetings, 20% faster delivery",
    stars: 5,
  },
];

export const caseStudies = [
  {
    company: "TechFlow",
    industry: "SaaS",
    logo: "TF",
    metric: "40% faster shipping",
    quote: "FlowTeam replaced Slack, Jira, and Zoom for our engineering org of 200+ people. The unified context between chat and project boards alone saved us 6 hours per sprint.",
    executive: "Sarah Chen",
    role: "VP of Engineering",
    before: "6 context-switching tools, decisions lost in DMs, manual status updates",
    after: "One workspace, decisions auto-attached to tasks, real-time sprint dashboards",
  },
  {
    company: "GlobalScale",
    industry: "E-commerce",
    logo: "GS",
    metric: "2.5h saved per person/week",
    quote: "Marketing and engineering used completely different stacks. FlowTeam bridged the gap — campaigns now go from brief to deploy without a single tool handoff.",
    executive: "James Wilson",
    role: "Product Director",
    before: "Disconnected tools, 3-week onboarding, no cross-team visibility",
    after: "Unified workflows, 2-day onboarding, full campaign lifecycle in one view",
  },
  {
    company: "BankSafe",
    industry: "Finance",
    logo: "BS",
    metric: "Zero compliance issues",
    quote: "We needed SOC 2, HIPAA, and GDPR compliance in a single platform. FlowTeam delivered without sacrificing the UX our teams actually want to use.",
    executive: "Elena Rodriguez",
    role: "CISO",
    before: "Shadow IT with consumer tools, no audit trail, manual compliance reporting",
    after: "Approved single platform, automated audit logs, real-time compliance dashboards",
  },
];

export const securityBadges = [
  { name: "SOC 2 Type II", icon: "ShieldCheck" },
  { name: "GDPR Compliant", icon: "Lock" },
  { name: "HIPAA Ready", icon: "Activity" },
  { name: "ISO 27001", icon: "CheckCircle" },
];

export const faqs = [
  {
    q: "Is FlowTeam a Jira replacement, a Slack replacement, or both?",
    a: "Both — plus Teams. FlowTeam combines enterprise project management (Kanban, sprints, roadmaps, analytics) with real-time messaging and HD video meetings in one workspace. Your decisions, tasks, and conversations stay connected by design.",
  },
  {
    q: "What's included in the Free plan?",
    a: "Free includes chat, boards, and meetings for up to 5 members and 3 projects, plus file search and standard security. No credit card required.",
  },
  {
    q: "Do you support SSO and admin controls for enterprise?",
    a: "Yes. Enterprise includes SAML 2.0 SSO, SCIM automated provisioning, granular role-based access controls, data residency options, and comprehensive audit logging.",
  },
  {
    q: "Can I migrate from Slack, Jira, or Microsoft Teams?",
    a: "Yes. We provide import tools for channels, projects, and history from all three platforms. Our integration layer also lets you keep existing tools connected during the transition.",
  },
  {
    q: "How does FlowTeam handle data security and compliance?",
    a: "We encrypt data at rest (AES-256) and in transit (TLS 1.3). FlowTeam is SOC 2 Type II certified, GDPR compliant, and HIPAA eligible. Enterprise plans include data residency controls and retention policies.",
  },
  {
    q: "What kind of support is available?",
    a: "Free and Professional plans include community support and knowledge base access. Business includes priority 24/7 email and chat. Enterprise includes a dedicated account manager, custom SLAs, and white-glove onboarding.",
  },
];

export const apiFeatures = [
  { title: "RESTful API", desc: "Full CRUD for channels, tasks, meetings, and users" },
  { title: "Webhook Events", desc: "Real-time push for messages, status changes, and meeting events" },
  { title: "OAuth 2.0", desc: "Secure delegated access with scoped permissions" },
  { title: "Rate Limits", desc: "Generous tiers — 5,000 requests/hour standard, custom for Enterprise" },
];

export const appFeatures = [
  { title: "Cross-platform", desc: "iOS, Android, Web, and Desktop apps" },
  { title: "Offline mode", desc: "Read and reply without internet — syncs when connected" },
  { title: "Push notifications", desc: "Smart notification grouping and do-not-disturb schedules" },
  { title: "Widget support", desc: "iOS widgets and Android shortcuts for quick access" },
];
