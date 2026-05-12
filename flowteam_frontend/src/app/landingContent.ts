import {
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Shield,
  Video,
  Zap,
  Sparkles,
  Brain,
  FileText,
  BarChart3,
  Users,
  Bot,
  Hash,
  LayoutDashboard,
  Kanban,
  Layers,
  Activity,
  Lock,
  Globe,
  Clock,
  Briefcase,
  Monitor,
  Code,
  Megaphone,
  Building2,
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
    ]
  },
  { 
    label: "Solutions", 
    href: "#",
    children: [
      { label: "For Startups", description: "Scale fast with agile tools", icon: Zap },
      { label: "For Enterprise", description: "Security & compliance at scale", icon: Building2 },
      { label: "For Remote Teams", description: "Stay connected anywhere", icon: Globe },
    ]
  },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#", children: [
    { label: "Documentation", href: "#" },
    { label: "Tutorials", href: "#" },
    { label: "Community", href: "#" },
  ]},
];

export const coreFeatures = [
  {
    id: "communication",
    title: "Communication Hub",
    icon: MessageSquare,
    description: "Connect your team with real-time messaging, structured threads, and expressive reactions.",
    features: ["Channels & DMs", "Structured Threads", "Emoji Reactions", "File Sharing", "User Mentions"],
    accent: "#611f69", // Slack Purple
    gradient: "from-[#611f69]/20 to-transparent",
    image: "/mockups/chat.png"
  },
  {
    id: "projects",
    title: "Project Powerhouse",
    icon: Kanban,
    description: "Manage complex projects with ease using agile boards, automated workflows, and visual roadmaps.",
    features: ["Sprint Planning", "Kanban Boards", "Custom Workflows", "Visual Roadmaps", "Automation"],
    accent: "#0052CC", // Jira Blue
    gradient: "from-[#0052CC]/20 to-transparent",
    image: "/mockups/projects.png"
  },
  {
    id: "collaboration",
    title: "Seamless Collaboration",
    icon: Video,
    description: "Meet face-to-face from anywhere with crystal-clear video calls and interactive screen sharing.",
    features: ["HD Video Calls", "Screen Sharing", "Meeting Recordings", "Calendar Sync", "Grid View"],
    accent: "#6264A7", // Teams Purple
    gradient: "from-[#6264A7]/20 to-transparent",
    image: "/mockups/meetings.png"
  }
];

export const integrations = [
  { name: "GitHub", icon: "github" },
  { name: "Figma", icon: "figma" },
  { name: "Google Workspace", icon: "google" },
  { name: "Salesforce", icon: "salesforce" },
  { name: "Confluence", icon: "confluence" },
  { name: "Slack", icon: "slack" },
  { name: "Jira", icon: "jira" },
  { name: "Teams", icon: "teams" },
];

export const useCases = [
  {
    id: "software",
    label: "Software Teams",
    title: "Build & Ship Faster",
    description: "Connect your code directly to your tasks and discussions.",
    icon: Code,
    features: ["Git integration", "Code reviews", "CI/CD alerts"],
    image: "/usecases/software.png"
  },
  {
    id: "marketing",
    label: "Marketing Teams",
    title: "Campaign Management",
    description: "Organize creative assets and coordinate global launches.",
    icon: Megaphone,
    features: ["Asset management", "Editorial calendars", "Stakeholder reviews"],
    image: "/usecases/marketing.png"
  },
  {
    id: "enterprise",
    label: "Enterprise",
    title: "Global Scale",
    description: "Security and compliance built for the world's largest organizations.",
    icon: Building2,
    features: ["SSO & SCIM", "Data residency", "Advanced audit logs"],
    image: "/usecases/enterprise.png"
  }
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
    price: "€0",
    period: "forever",
    description: "Basic chat + limited boards for individuals.",
    features: ["Unlimited DMs", "5 public channels", "3 project boards", "Standard security"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "€12",
    period: "per user/mo",
    description: "Complete toolkit for growing teams.",
    features: ["Everything in Free", "Unlimited channels", "Unlimited boards", "Custom workflows", "HD Video (up to 50)"],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "Advanced controls and dedicated support.",
    features: ["Everything in Pro", "SAML SSO", "Data residency", "Audit logs", "Dedicated manager"],
    cta: "Contact Sales",
    popular: false,
  },
];

export const testimonials = [
  {
    quote: "Cowrk has completely transformed how our engineering and product teams collaborate. It's the best of three worlds.",
    name: "Sarah Chen",
    role: "VP of Engineering",
    company: "TechFlow",
    avatar: "SC",
    metric: "40% faster shipping"
  },
  {
    quote: "The integration between chat and task management is seamless. We no longer lose decisions in message history.",
    name: "James Wilson",
    role: "Product Director",
    company: "GlobalScale",
    avatar: "JW",
    metric: "2.5h saved weekly"
  },
  {
    quote: "Security was our #1 concern. Cowrk's enterprise features gave us the peace of mind we needed to move our entire org.",
    name: "Elena Rodriguez",
    role: "CISO",
    company: "BankSafe",
    avatar: "ER",
    metric: "Zero compliance issues"
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
    q: "Is Cowrk a Jira replacement, a Slack replacement, or both?",
    a: "Both. Cowrk combines project management (Kanban, sprints, milestones, analytics) with real-time messaging and meetings in one workspace — so your decisions and your work live in the same place.",
  },
  {
    q: "What's actually included in the Free plan?",
    a: "The Free plan gives you full access to Kanban boards, real-time chat, meetings, sprints, milestones, time tracking, the client portal, and Google sign-in — for up to 5 members and 3 projects.",
  },
];
