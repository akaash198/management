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
} from "lucide-react";

export const meetingHighlights = [
  {
    icon: Video,
    eyebrow: "Instant",
    title: "Start a meeting now",
    description: "Launch an instant meeting for your team and keep the chat context together.",
    bullets: ["One-click start", "Attendee selection", "Meeting-linked channel"],
    accent: "cyan",
  },
  {
    icon: CalendarDays,
    eyebrow: "Scheduled",
    title: "Schedule ahead",
    description: "Plan meetings for later, set duration, and keep a clean calendar view for your team.",
    bullets: ["Schedule date & time", "Duration + status", "Search meetings"],
    accent: "indigo",
  },
  {
    icon: MessageSquare,
    eyebrow: "Follow-up",
    title: "Turn decisions into tasks",
    description: "Capture outcomes and move directly into execution with tasks, comments, and notifications.",
    bullets: ["Link work to conversations", "Mentions + notifications", "Saved messages & pins"],
    accent: "violet",
  },
] as const;

export const securityHighlights = [
  {
    icon: Shield,
    eyebrow: "RBAC",
    title: "Team + project permissions",
    description:
      "CEO/Admin manage team settings and members. Managers invite employees. Employees focus on delivery with clear boundaries.",
    bullets: ["Protected CEO role", "Capability-driven UI", "Project-level roles"],
    accent: "indigo",
  },
  {
    icon: CheckCircle2,
    eyebrow: "Audit",
    title: "Audit logs & retention",
    description:
      "Track sensitive actions across your workspace to support reviews, compliance, and incident response workflows.",
    bullets: ["Tamper-resistant event trail", "Export-friendly formats", "365-day retention"],
    accent: "emerald",
  },
  {
    icon: Zap,
    eyebrow: "Auth",
    title: "Hardened sign-in",
    description:
      "Modern auth with Google OAuth, rate limiting, 2FA, and secure session handling as your team grows.",
    bullets: ["Google OAuth one-click sign-in", "Two-factor authentication", "Refresh-token rotation"],
    accent: "rose",
  },
] as const;

export const rbacRoles = [
  {
    role: "CEO",
    subtitle: "Owns the workspace. Full control over team settings, membership, and sensitive operations.",
    bullets: ["Delete team", "Promote/demote roles (including CEO)", "Approve sensitive changes"],
    accent: "indigo",
  },
  {
    role: "Admin",
    subtitle: "Runs operations. Manages team settings and people without taking over ownership.",
    bullets: ["Manage members (except CEO)", "Change non-CEO roles", "Manage integrations/settings"],
    accent: "violet",
  },
  {
    role: "Manager",
    subtitle: "Delivers outcomes. Organizes work and meetings, and onboards employees into the team.",
    bullets: ["Invite employees", "Create/schedule meetings", "Create projects (team policy)"],
    accent: "cyan",
  },
  {
    role: "Member",
    subtitle: "Executes work. Contributes to projects, messages, meetings, and task delivery.",
    bullets: ["Create/update tasks", "Chat + mentions + threads", "Join meetings & calls"],
    accent: "emerald",
  },
] as const;

export const aiFeatures = [
  {
    icon: Brain,
    title: "Daily Briefing",
    description: "Every morning, get a personalised summary of overdue tasks, what's due today, and your meeting schedule — before you open a single tab.",
    stat: "10 min saved",
    statLabel: "per person daily",
    accent: "indigo",
  },
  {
    icon: Sparkles,
    title: "Focus Recommendations",
    description: "AI ranks your open tasks by urgency, blocking status, and due date so you always know exactly what to work on next.",
    stat: "No more",
    statLabel: "prioritisation meetings",
    accent: "violet",
  },
  {
    icon: FileText,
    title: "Auto Task Descriptions",
    description: "Type a task title and click one button. AI writes the full description, acceptance criteria, and suggested subtasks instantly.",
    stat: "5–10 min",
    statLabel: "saved per task",
    accent: "cyan",
  },
  {
    icon: MessageSquare,
    title: "Channel Catch-Me-Up",
    description: "Back from a meeting or holiday? One click summarises the last 48 hours of any channel into decisions, blockers, and open questions.",
    stat: "20 min",
    statLabel: "saved per absence",
    accent: "emerald",
  },
  {
    icon: BarChart3,
    title: "Project Health Score",
    description: "A 0–100 score with risk factors and recommended actions. Computed nightly, available on demand. Never be surprised by a failing project.",
    stat: "Catch risks",
    statLabel: "before they ship",
    accent: "amber",
  },
  {
    icon: Bot,
    title: "AI Automation Builder",
    description: "Describe a rule in plain English — \"when a bug is created, assign it to Alex and post to #incidents\" — and AI builds it for you.",
    stat: "Zero",
    statLabel: "manual rule configuration",
    accent: "rose",
  },
] as const;

export const testimonials = [
  {
    quote: "We replaced Jira, Slack, and Notion with FlowTeam. Our team actually enjoys standup now because the AI briefing does most of the talking.",
    name: "Marcus Webb",
    role: "CTO",
    company: "Luminary Labs",
    avatar: "MW",
    avatarColor: "bg-indigo-500",
  },
  {
    quote: "The sprint retrospective generator alone saves me two hours every two weeks. The insights are better than what I was writing manually.",
    name: "Priya Nair",
    role: "Engineering Manager",
    company: "Stackr.io",
    avatar: "PN",
    avatarColor: "bg-violet-500",
  },
  {
    quote: "Client reporting used to take 45 minutes per project per week. Now I click one button and it's done in seconds. Our clients love the format.",
    name: "Sofia Andreou",
    role: "Founder",
    company: "Craft Studio",
    avatar: "SA",
    avatarColor: "bg-cyan-500",
  },
] as const;

export const comparisons = [
  { feature: "Kanban + sprints", flowteam: true, jira: true, notion: false, asana: true },
  { feature: "Real-time messaging", flowteam: true, jira: false, notion: false, asana: false },
  { feature: "Built-in video meetings", flowteam: true, jira: false, notion: false, asana: false },
  { feature: "AI daily briefing", flowteam: true, jira: false, notion: false, asana: false },
  { feature: "AI sprint planner", flowteam: true, jira: false, notion: false, asana: false },
  { feature: "Project health score", flowteam: true, jira: false, notion: false, asana: false },
  { feature: "Client portal (no login)", flowteam: true, jira: false, notion: true, asana: false },
  { feature: "GitHub PR → task linking", flowteam: true, jira: true, notion: false, asana: false },
  { feature: "Browser push notifications", flowteam: true, jira: false, notion: false, asana: true },
  { feature: "Google OAuth sign-in", flowteam: true, jira: true, notion: true, asana: true },
  { feature: "Free plan (real features)", flowteam: true, jira: false, notion: true, asana: false },
  { feature: "Audit log on all paid plans", flowteam: true, jira: false, notion: false, asana: false },
] as const;

export const pricing = [
  {
    name: "Free",
    monthlyPrice: "€0",
    yearlyPrice: "€0",
    priceSuffix: "forever",
    subtitle: "For small teams getting started",
    limit: "Up to 5 members · 3 projects",
    bullets: [
      "Kanban boards + custom columns",
      "Real-time messaging & DMs",
      "Meetings + calendar",
      "Sprint planning & milestones",
      "Time tracking & approvals",
      "In-app + browser push notifications",
      "Client portal (read-only links)",
      "CSV / XLSX / PDF export",
      "Google Sign-In (OAuth)",
      "2FA + audit log",
    ],
    cta: { label: "Get started free", href: "/register" },
  },
  {
    name: "Pro",
    monthlyPrice: "€29",
    yearlyPrice: "€23",
    priceSuffix: "per workspace / mo",
    subtitle: "For growing teams that need scale",
    limit: "Up to 50 members · Unlimited projects",
    bullets: [
      "Everything in Free",
      "50 team members",
      "Unlimited projects",
      "Advanced analytics & velocity reports",
      "Automation rules",
      "Slack webhook integration",
      "GitHub repo integration per project",
      "Priority email support",
    ],
    highlight: true,
    badge: "Most popular",
    cta: { label: "Start Pro free trial", href: "/register" },
  },
  {
    name: "AI",
    monthlyPrice: "€69",
    yearlyPrice: "€55",
    priceSuffix: "per workspace / mo",
    subtitle: "For teams that want to move faster with AI",
    limit: "Up to 50 members · Unlimited projects",
    bullets: [
      "Everything in Pro",
      "AI Daily Briefing",
      "AI Focus Recommendations",
      "Auto task descriptions & labels",
      "Channel catch-me-up summaries",
      "Sprint AI planner & retrospectives",
      "Workload balancer",
      "Project health score (0–100)",
      "Meeting action item extractor",
      "AI automation builder",
      "AI client report generator",
      "Weekly AI status reports",
    ],
    badge: "Best value",
    accentColor: "violet" as const,
    cta: { label: "Start AI free trial", href: "/register" },
  },
] as const;

export const faqs = [
  {
    q: "Is FlowTeam a Jira replacement, a Slack replacement, or both?",
    a: "Both. FlowTeam combines project management (Kanban, sprints, milestones, analytics) with real-time messaging and meetings in one workspace — so your decisions and your work live in the same place.",
  },
  {
    q: "What's actually included in the Free plan?",
    a: "The Free plan gives you full access to Kanban boards, real-time chat, meetings, sprints, milestones, time tracking, the client portal, and Google sign-in — for up to 5 members and 3 projects. No credit card required, no feature nerfing.",
  },
  {
    q: "What does the AI plan add over Pro?",
    a: "The AI plan adds 12 AI features powered by Claude (Anthropic): daily briefing, focus recommendations, auto task descriptions, channel catch-me-up, sprint planner, workload balancer, project health score, retrospective generator, meeting action items, AI automation builder, weekly status reports, and client report generator.",
  },
  {
    q: "How does RBAC work?",
    a: "Team roles (CEO/Admin/Manager/Member) control workspace-level actions. Project roles control access inside each project. CEO is protected — only another CEO can change it. Every role change is logged.",
  },
  {
    q: "Can we link GitHub pull requests to tasks?",
    a: "Yes. Connect a GitHub repo to a project via OAuth (scope: repo). FlowTeam registers a webhook and automatically links PRs to tasks when the PR title or body contains a reference like #42 or #WEB-42.",
  },
  {
    q: "Do yearly plans save money?",
    a: "Yes — about 20%. Pro drops from €29/mo to €23/mo billed annually (€276/yr). AI drops from €69/mo to €55/mo billed annually (€660/yr).",
  },
  {
    q: "Can I run FlowTeam for multiple separate teams?",
    a: "Yes. Each workspace is fully isolated — its own members, projects, channels, meetings, and audit trail. There is no cross-workspace data leakage.",
  },
  {
    q: "Do you support 2FA and browser push notifications?",
    a: "Yes on both. 2FA uses TOTP (Google Authenticator, Authy, 1Password). Browser push uses the Web Push / VAPID standard — Chrome, Edge, Firefox, and Safari 16.4+ are supported.",
  },
] as const;
