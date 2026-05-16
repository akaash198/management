import type { CalendarItem, Channel, Message, NotificationItem, Project, Task, Team, User } from "./types";

export const sampleUser: User = {
  id: "demo-user",
  email: "sarah@nova-agency.com",
  full_name: "Sarah Chen",
};

export const sampleTeams: Team[] = [
  { id: "nova", name: "Nova Agency", slug: "nova-agency", your_role: "CEO" },
];

export const sampleProjects: Project[] = [
  { id: "website", name: "Client Website Relaunch", status: "Active", progress: 68, due_date: "2026-05-12" },
  { id: "brand", name: "Brand System Rollout", status: "Planning", progress: 34, due_date: "2026-05-28" },
  { id: "mobile", name: "FlowTeam Mobile", status: "Active", progress: 18, due_date: "2026-06-18" },
];

export const sampleTasks: Task[] = [
  { id: "t1", title: "Approve homepage wireframes", status: "review", priority: "high", assignee_name: "Sarah", due_date: "Today" },
  { id: "t2", title: "Connect calendar account", status: "todo", priority: "medium", assignee_name: "Priya", due_date: "Tomorrow" },
  { id: "t3", title: "Fix mobile navigation states", status: "in_progress", priority: "urgent", assignee_name: "Alex", due_date: "Apr 30" },
  { id: "t4", title: "Write launch QA checklist", status: "done", priority: "low", assignee_name: "Mina", due_date: "May 02" },
];

export const sampleChannels: Channel[] = [
  { id: "general", name: "general", unread_count: 3, last_message_text: "Priya shared the latest sprint notes." },
  { id: "design", name: "design-review", unread_count: 1, last_message_text: "Figma embed is ready for review." },
  { id: "client", name: "client-portal", unread_count: 0, last_message_text: "Jordan approved the milestone." },
];

export const sampleMessagesByChannel: Record<string, Message[]> = {
  general: [
    {
      id: "m1",
      channel: "general",
      text: "Morning! Daily standup in 10 — drop blockers here.",
      created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      sender: { id: "u1", full_name: "Priya", avatar: null },
    },
    {
      id: "m2",
      channel: "general",
      text: "No blockers. Pushing mobile nav polish today.",
      created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      sender: { id: sampleUser.id, full_name: sampleUser.full_name, avatar: null },
    },
    {
      id: "m3",
      channel: "general",
      text: "Great — can you also review the homepage wireframes after lunch?",
      created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      sender: { id: "u2", full_name: "Alex", avatar: null },
    },
  ],
  design: [
    {
      id: "m4",
      channel: "design",
      text: "Figma embed is ready for review.",
      created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      sender: { id: "u3", full_name: "Mina", avatar: null },
    },
    {
      id: "m5",
      channel: "design",
      text: "Nice — I'll leave comments in the prototype.",
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      sender: { id: sampleUser.id, full_name: sampleUser.full_name, avatar: null },
    },
  ],
  client: [
    {
      id: "m6",
      channel: "client",
      text: "Jordan approved the milestone ✅",
      created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      sender: { id: "u4", full_name: "Jordan", avatar: null },
    },
  ],
};

export const sampleCalendar: CalendarItem[] = [
  { id: "c1", title: "Daily briefing", kind: "meeting", starts_at: "09:30" },
  { id: "c2", title: "Homepage wireframes due", kind: "task", due_date: "Today" },
  { id: "c3", title: "Client review call", kind: "meeting", starts_at: "15:00" },
];

export const sampleNotifications: NotificationItem[] = [
  { id: "n1", title: "Task assigned", body: "Alex assigned you Fix mobile navigation states.", is_read: false },
  { id: "n2", title: "Meeting transcript ready", body: "AI action items are available for Client review call.", is_read: false },
  { id: "n3", title: "Project health changed", body: "Client Website Relaunch moved to On Track.", is_read: true },
];
