# FlowTeam — Complete User Guide

**Version:** 4.0  
**Covers:** Every page and component — Company hierarchy, Teams, Settings (9 tabs), Dashboard (role-specific), Portfolio, My Tasks, Projects (6 view types), Issue Navigator, Planning Hub, Operations Hub, Project Reports, Timeline, Files, Docs, Billing, Project Settings & Permissions, Messaging (full feature set), Calls, Presence, Status, Meetings, Calendar, Search, Notifications, 2FA, Push, Audit Log, Exports, Client Portal, Automation, AI Features, Super Admin.

---

## Table of Contents

1. [What is FlowTeam?](#1-what-is-flowteam)
2. [Getting Started — Register & Sign In](#2-getting-started--register--sign-in)
3. [Onboarding — Create Your Workspace](#3-onboarding--create-your-workspace)
4. [Company Structure & Roles](#4-company-structure--roles)
5. [Company Admin Dashboard](#5-company-admin-dashboard)
6. [Team Management](#6-team-management)
7. [Settings — All 9 Tabs](#7-settings--all-9-tabs)
8. [Dashboard — Role-Specific Views](#8-dashboard--role-specific-views)
9. [Portfolio](#9-portfolio)
10. [My Tasks](#10-my-tasks)
11. [Projects List](#11-projects-list)
12. [Project Board — 6 View Types](#12-project-board--6-view-types)
13. [Tasks — Full Feature Breakdown](#13-tasks--full-feature-breakdown)
14. [Issue Navigator](#14-issue-navigator)
15. [Planning Hub](#15-planning-hub)
16. [Operations Hub — 8 Tabs](#16-operations-hub--8-tabs)
17. [Project Reports & Insights](#17-project-reports--insights)
18. [Project Timeline](#18-project-timeline)
19. [Project Files](#19-project-files)
20. [Project Docs](#20-project-docs)
21. [Project Billing](#21-project-billing)
22. [Project Settings & Permissions](#22-project-settings--permissions)
23. [Messages — Real-Time Chat](#23-messages--real-time-chat)
24. [Calls — Audio & Video](#24-calls--audio--video)
25. [Presence & Custom Status](#25-presence--custom-status)
26. [Meetings](#26-meetings)
27. [Calendar](#27-calendar)
28. [Search](#28-search)
29. [Notifications](#29-notifications)
30. [Dark / Light Theme](#30-dark--light-theme)
31. [Two-Factor Authentication (2FA)](#31-two-factor-authentication-2fa)
32. [Web Push Notifications](#32-web-push-notifications)
33. [Audit Log](#33-audit-log)
34. [Exports](#34-exports)
35. [Client Portal](#35-client-portal)
36. [Automation Rules](#36-automation-rules)
37. [AI Features (AI Plan)](#37-ai-features-ai-plan)
38. [Super Admin](#38-super-admin)
39. [Plan Limits](#39-plan-limits)
40. [Quick Reference — Field Limits](#40-quick-reference--field-limits)
41. [Appendix A — Production Setup](#appendix-a--production-setup)

---

## 1. What is FlowTeam?

FlowTeam is an all-in-one team workspace combining:

- **Company & team hierarchy** — multi-level roles (CEO → Admin → Manager → Member → Viewer)
- **Project management** — Kanban, table, epics, bugs, timeline, retrospectives, sprints, milestones
- **Cross-project views** — Issue Navigator (Jira-style filtering), Planning Hub, Operations Hub, Portfolio
- **Real-time messaging** — channels, DMs, threads, reactions, pinning, voice memos, slash commands, GIFs, polls, message scheduling
- **Audio & video calls** — WebRTC peer-to-peer calls with screen sharing and recording
- **Presence & custom status** — live indicators with emoji status, expiry timers, quick presets
- **AI assistant** — daily briefing, focus recommendations, sprint planning, task generation, retrospectives, client reports (AI plan)
- **Dark / light theme** — persisted per browser
- **Notifications** — in-app, email, web push, per-project rules
- **Enterprise security** — 2FA, RBAC, audit log, OAuth

---

## 2. Getting Started — Register & Sign In

### 2.1 Sign Up

1. Go to your FlowTeam URL and click **Sign up**
2. Enter full name, email, password (min 8 characters)
3. Verify email via the link sent to your inbox
4. If your company already exists and your email domain matches the allowed domain, you are automatically added

### 2.2 Sign In Options

- **Email + password** — standard form
- **Google OAuth** — click "Continue with Google" (if enabled by your admin)

### 2.3 Forgot Password

Click **Forgot password** → enter email → follow reset link in your inbox.

### 2.4 Session Management

JWT access tokens refresh automatically and silently. Only a confirmed 401 authentication failure will log you out — network errors or server errors will not.

---

## 3. Onboarding — Create Your Workspace

After first login:

1. Create or join a company (name, plan)
2. Set your company role
3. Create your first team (e.g. "Engineering")
4. Invite teammates by email or shareable invite link
5. Create your first project (blank or from template)

---

## 4. Company Structure & Roles

### 4.1 Hierarchy

```
Company
 └── Teams (Engineering, Design, Marketing…)
      └── Projects
           └── Tasks / Issues
```

### 4.2 Company / Team Roles

| Role    | Manage team | Invite | Change roles | Delete team | Audit log | Create projects |
|---------|-------------|--------|--------------|-------------|-----------|-----------------|
| CEO     | ✓           | ✓      | ✓            | ✓           | ✓         | ✓               |
| Admin   | ✓           | ✓      | ✓            | —           | ✓         | ✓               |
| Manager | — (own)     | ✓      | —            | —           | —         | ✓               |
| Member  | —           | —      | —            | —           | —         | —               |
| Viewer  | —           | —      | —            | —           | —         | —               |

### 4.3 Project Roles

| Role          | View | Edit tasks | Export | Comment | Admin |
|---------------|------|------------|--------|---------|-------|
| Project Admin | ✓    | ✓          | ✓      | ✓       | ✓     |
| Editor        | ✓    | ✓          | ✓      | ✓       | —     |
| Commenter     | ✓    | —          | —      | ✓       | —     |
| Viewer        | ✓    | —          | —      | —       | —     |

Team role implies a project role by default: CEO/Admin → Project Admin, Manager/Member → Editor, Viewer → Viewer. These can be overridden per user per project in Project Settings.

---

## 5. Company Admin Dashboard

**Route:** `/company-admin/dashboard`  
Available to CEO and Admin roles.

Four tabs:

### 5.1 Overview

Stats: total members, teams, projects, pending invites. Summary of company plan and capabilities.

### 5.2 Members

- Full member list with role colour badges
- Change role via the `⋯` menu (dropdown: CEO / Admin / Manager / Member / Viewer)
- Deactivate or remove a member
- Your own role cannot be lowered

### 5.3 Invites

- Lists all pending invites with status: pending / accepted / expired
- Resend or cancel an invite
- Send new invite: enter email, select role → **Send invite**

### 5.4 Teams

- List of all teams in the company with member count and project count
- Drill into a team → see its members and their roles
- Create a new team from this view

---

## 6. Team Management

Access via the **team switcher** in the top-left sidebar or **Settings → Team**.

- **Create a team** — name, description
- **Switch active team** — all project/task/planning views filter to the active team
- **Team roles** — separate from company roles (Owner, Admin, Member within the team context)
- **Invite to team** — from Settings → Members → Invite Member (see Section 7)

---

## 7. Settings — All 9 Tabs

**Route:** `/settings` (also openable with `?tab=<name>`)

The Settings page has 9 tabs accessible to all users (some sections are role-gated):

### 7.1 Profile

- **Full Name** — update display name
- **Email** — shown read-only (email cannot be changed)
- **Timezone** — select from a list of common timezones (UTC, ET, CT, MT, PT, London, Paris, Tokyo, Singapore); used for due-date display and notifications
- **Avatar** — shown; upload coming soon
- **Reporting Structure card** — if you have a manager or CEO above you in the hierarchy, a card shows who you directly report to and their role

### 7.2 Team

- Update **team name** (shown with slug)
- **Danger Zone** — Delete team button (only enabled for CEO/Admin with `can_delete_team` capability)

### 7.3 Members

- Table of all team members: avatar, name, email, role badge, joined date
- `⋯` menu per row: **Change Role** (modal with role selector) and **Remove** (with confirmation)
- **Invite Member** button (top-right) — opens invite modal: enter email, select role from your assignable roles
- Assignable roles depend on your own role (CEO can assign all; Manager can only assign Member/Viewer)

### 7.4 Notifications

- **Browser notifications** (push) — toggle to enable/disable OS-level alerts
- Five individual toggles (saved to `localStorage`):
  - Task Assigned
  - Task Completed
  - Project Updates
  - Member Joined
  - Weekly Digest
- **Save Preferences** button

### 7.5 Integrations

- **Google Calendar** — OAuth connect; toggle sync of external events into FlowTeam calendar
- **Microsoft Calendar** — OAuth connect; same toggle
- **Slack Webhooks** — add webhook URLs (name + URL + enable/disable toggle); multiple webhooks supported; copy URL button; delete button

### 7.6 AI

- **AI Features toggle** — master on/off for the entire team (CEO/Admin only)
- Shows a grid of all 10 AI capabilities with icons and descriptions:
  - Daily Briefing, Auto Task Descriptions, Weekly Status Reports, Sprint Planning AI, Channel Catch-up, Project Health Score, Workload Balancer, Client Reports, Focus Recommendations, Auto Label & Triage
- When AI is off, all AI buttons in the app are visible but show a "not enabled" toast

### 7.7 Plan

- Shows current plan and whether AI is enabled
- Plan upgrades coming soon

### 7.8 Security

- **Change Password** — enter current password + new password (min 8 characters, must match confirmation)
- **Account Security card** — shows email verification status, your account role in the active team
- **Two-Factor Authentication** — embedded TwoFactorCard (enable/disable TOTP; see Section 31)

### 7.9 Roles & Access (RBAC)

- **Your Permissions** — colour-coded list of what you can do in the team (green = allowed, grey = not allowed): manage team settings, invite members, change roles, remove members, delete team, view audit log, create projects
- **Team Role Capability Matrix** — full table showing which capabilities each team role (CEO/Admin/Manager/Member/Viewer) has
- **Project Role Capability Matrix** — full table showing which capabilities each project role (Project Admin / Editor / Commenter / Viewer) has

---

## 8. Dashboard — Role-Specific Views

**Route:** `/dashboard`

The dashboard automatically renders a different layout based on your team role.

### 8.1 All Dashboards (common)

- **Missed Messages Pulse** — top card showing channels with unread messages since last login; animated pulse; up to 3 channel previews with last message + sender; click to jump to `/messages?channel={id}`
- **Time-of-day greeting** — "Good morning/afternoon/evening, [first name]"
- **Refresh button** — re-fetches all dashboard data
- Current date shown in header

### 8.2 CEO Dashboard

- **KPI row**: Total members, Active projects, Completed this week, Overdue tasks
- **Organisation pulse banner** — delivery velocity %, most active member, tasks created vs completed this week
- **Top projects** — sorted by progress %, up to 4 project cards
- **Leadership team** — cards for CEO/Admin/Manager members
- **Quick actions** — Invite member, New project, View reports
- **AI: Daily Briefing card** — AI text summary of overdue/due-today/meeting counts (requires AI plan)
- **AI: Focus Recommendations card** — ranked list of up to 6 tasks to work on next, each with urgency badge and reason (requires AI plan)

### 8.3 Admin Dashboard

- **KPI row**: Total members, Viewers/pending count, Active projects, Overdue tasks
- **Organisation pulse banner** — same as CEO
- **Team members table** — sorted by role; shows pending count
- **Quick actions** — Invite, New project, Settings
- **Missed Messages Pulse**

### 8.4 Manager Dashboard

- **KPI row**: Active projects, Overdue tasks, Completed this week, Delivery velocity %
- **Priority breakdown bar** — visual distribution of your tasks by priority (urgent/high/normal/low)
- **Focus tasks** — up to 4 tasks sorted by overdue first, then due date
- **Active projects grid** — up to 4 project cards
- **Team members** list (member role only)
- **Missed Messages Pulse**

### 8.5 Member Dashboard

- **KPI row**: Active projects, Overdue tasks, Due today, Completed this week
- **My tasks** — searchable list of all assigned tasks; filtered tasks with project name, priority badge, due date
- **Focus tasks** — top 4 by urgency
- **Projects grid** — projects you're part of
- **Reporting to** — shows your manager's avatar and role
- **Missed Messages Pulse**

### 8.6 Viewer Dashboard

- **Projects grid** — read-only view of all projects in the team
- **Team activity** sidebar — recent events feed
- "View only" badge in the header

---

## 9. Portfolio

**Route:** `/portfolio`

A cross-project health and delivery view for your active team.

- **Summary badges** — total projects, projects with overdue tasks, projects "at risk" (health score < 50)
- **Project cards grid** — one card per project showing:
  - Health score (0–100) with colour-coded label (green ≥ 80, amber ≥ 50, red < 50)
  - Team name
  - Progress bar (% complete)
  - Open/total tasks count
  - Overdue task count (shown in red if > 0)
  - Next milestone name and due date
  - **Open project** button → links to `/projects/[id]`
- **Refresh button** — re-fetches portfolio data (with spin animation while loading)

---

## 10. My Tasks

**Route:** `/dashboard/my-tasks`

All tasks assigned to you in the active team, in a dedicated full-page view.

**Filters:**
- **Status** — All / Open / Done
- **Due** — All / Overdue / Today / This week (also settable via URL `?due=overdue`)
- **Search** — free text across task titles

**Summary badges** — shows current Status filter, Due filter, and total task count.

Each task row shows: title, project, epic, priority, due date, sprint, status. Click a task to open it in the project board.

Back button returns to `/dashboard`.

---

## 11. Projects List

**Route:** `/projects`

- Lists all active projects in the active team
- Each project card: icon, name, team, status badge, progress bar, task counts
- **New Project** button → opens create project modal
  - Name, description, team, colour, icon (emoji)
  - Start from a template (see Planning Hub → Templates)
- **Project status filter** — All / Active / Archived

---

## 12. Project Board — 6 View Types

**Route:** `/projects/[id]`

The project has a tab bar with 6 view types:

| Tab | View | Description |
|-----|------|-------------|
| Board | Kanban | Drag-and-drop column view |
| Table | List | Flat list of all tasks with sortable columns |
| Epics | Epic grid | Cards for each epic with progress and child task count |
| Timeline | Placeholder | Coming soon — Gantt-style timeline |
| Bugs | Bug filter | Kanban filtered to issue_type = bug only |
| Retrospectives | Placeholder | Coming soon — Sprint retrospectives |

### 12.1 Board Header

- Back button (history aware)
- Project icon + name + status badge
- **Health score badge** — colour-coded (green/amber/red); score comes from AI health check if AI enabled, else static analytics
- Column count · task count · completion %
- **Watch (N) badge** — shows how many people are watching the project; click to watch/unwatch and receive notifications for all project activity
- **Reports** quick link
- **New task** button

### 12.2 Board Filters Bar

Available in board and table views:

- **Search tasks** — full-text filter
- **Priority filter** — All / Urgent / High / Normal / Low
- **Due filter** — All / Overdue / Today / This week
- **Assignee filter** — All / Me / [any team member]
- Active filter count badge; **Clear filters** button when any are active

### 12.3 Export

Dropdown on the board: **Export CSV**, **Export XLSX**, **Export PDF** — downloads immediately.

### 12.4 Kanban Board

- Drag task cards between columns
- Keyboard-accessible (dnd-kit PointerSensor + KeyboardSensor)
- Drag a card and drop onto a column header or between existing cards to set order
- **Add column inline** — click `+` at the right end of the column row; enter name; Enter or click check
- Columns show task count; the "done" column is styled distinctly

### 12.5 Table View

Flat sortable list of all tasks:

- Columns: title, assignee avatar, priority, due date, sprint, status/column, issue type, labels
- Click a row to open the task detail panel

### 12.6 Epics View

- Grid of epic cards showing: title, status (backlog/discovery/wip/review/done), progress bar, assignee, start/end dates, child task count
- **Create Epic** button
- **Search** field to filter epics by title

### 12.7 Bugs View

Same list view as Table but pre-filtered to `issue_type = "bug"`, grouped by column. Useful for QA triage without leaving the project.

### 12.8 Retrospectives View

Currently a placeholder screen with a **Start Retrospective** button. The interactive per-project retro board (columns: Keep / Improve / Discussion, voting, sidebar list) is available as the `RetrospectiveView` component and is being integrated into this tab.

AI-generated retrospectives (per sprint) are available now in the Planning Hub → Sprint Planning (requires AI plan).

---

## 13. Tasks — Full Feature Breakdown

### 13.1 Task Fields

| Field | Details |
|-------|---------|
| Title | Required, max 200 chars |
| Description | Markdown rich text |
| Issue type | Epic / Story / Task / Bug / Subtask (configurable per project) |
| Status | Column assignment |
| Priority | Critical / High / Normal / Low |
| Assignee | Any team member |
| Due date | Date picker |
| Labels | Colour-coded tags |
| Sprint | Assign to a sprint |
| Epic | Group under an epic |
| Story points | Numeric estimate |
| Time tracking | Built-in timer + manual log (see 13.5) |
| Dependencies | Block / blocked-by task links |
| Attachments | File uploads |
| Custom fields | Text / number / date / select (configured per issue type in Operations Hub) |

### 13.2 Creating a Task

- Kanban: click `+` in any column header for quick-add inline
- Board header: **New task** button → opens full create modal
- Issue Navigator: **Create issue** button → modal with project selector
- Keyboard shortcut: `N` (while not in an input)

### 13.3 Task Detail Panel

Opens as a side panel (not a full-page navigation) when clicking a task card.

- Edit all fields inline
- **Activity tab** — full history of field changes, assignments, and comments
- **Comments** — markdown with @mentions; reaction emoji on each comment
- **Subtasks** — nested task list; add subtask button
- **Dependencies** — search and link tasks as "blocks" / "blocked-by"
- **Watch / Unwatch** — click the Watch button in the task panel to subscribe to this task; you receive notifications for all changes. The watcher count and avatars of all watchers are shown in the panel
- **Time tracker** (see 13.5)
- **Attachments** — upload files; existing attachments listed with download links

### 13.4 Task Completion Modal

When moving a task to a "done" column, a completion modal may appear prompting for notes or a rating.

### 13.5 Time Tracker

- **Start** — click play button; a live timer counts up in seconds
- **Stop** — saves the session as a time log entry (converted to minutes)
- **Manual log** — enter minutes + optional note → **Log time**
- **History** — list of all time log entries for the task with date, duration, and note
- **Delete** individual log entries

### 13.6 Subtasks

Open task → **Add subtask** → enter title. Subtasks appear nested. Completing all subtasks does not auto-complete the parent.

### 13.7 Task Dependencies

Task detail → **Dependencies** → search tasks → link as "blocks" or "blocked by". Blocked tasks show a warning badge on their card.

---

## 14. Issue Navigator

**Route:** `/projects/issues`

Cross-project Jira-style view of all issues across every project in the active team.

### 14.1 Filters (7 dimensions)

| Filter | Options |
|--------|---------|
| Search | Title full-text |
| Project | Any active project |
| Status | Column names |
| Priority | Critical / High / Normal / Low |
| Due date | Overdue / Today / This week / This month |
| Sprint | Any sprint |
| Assignee | Any team member |

Filters stack; count and stats update in real time.

### 14.2 Stats Bar

Shows: visible issues, urgent issues, overdue issues, unassigned issues.

### 14.3 Saved Views

1. Apply filters → **Save view** → enter name
2. Saved views appear in the left sidebar
3. Click to restore any saved filter combination
4. Delete saved views from the sidebar

### 14.4 Bulk Actions

Select multiple issues (checkbox) → bulk action toolbar:

- Set priority
- Move to sprint
- Move to column
- Mark complete

---

## 15. Planning Hub

**Route:** `/projects/planning`

Team-level planning across 5 tabs. Header shows: sprint count, milestone count, recurring rule count, team member count.

### 15.1 Sprint Planning Tab

**Create sprint form:**
- Project, name, goal, start date, end date, total capacity hours
- Per-member capacity (enter hours for each team member)
- **Create sprint** button

**Backlog assignment:**
- Table of open tasks with no sprint assigned
- Select tasks with checkboxes
- Choose target sprint → **Assign to sprint**
- **AI: Suggest scope** — analyses backlog vs capacity; selects best-fit tasks; shows reasoning text (requires AI plan)

**Sprint list:**
- All sprints with status, goal, dates
- Per-sprint **Generate retrospective** button (AI analyses sprint; outputs What went well / What didn't / Action items; requires AI plan)

### 15.2 Roadmap Tab

Visual milestone timeline:

- Bar chart of all milestones across projects with names and due dates
- Status colour coding: planned / in progress / completed

### 15.3 Templates Tab

Create reusable project templates for the team:

- Name, description, colour (hex picker), icon (emoji)
- **Columns** — one per line; name a column "Done" to auto-set the done column
- **Labels** — `Name:#hexcolor` one per line (e.g. `Bug:#ef4444`)
- **Issue types** — one per line (e.g. `epic`, `story`, `task`, `bug`, `subtask`)

Templates appear as options when creating a new project.

### 15.4 Recurring Work Tab

Automate repeating task creation:

- Project, column, optional assignee, title, description, issue type, priority
- Frequency: **daily** / **weekly** / **monthly** + interval (e.g. every 2 weeks)
- Next run date
- Active/inactive toggle
- **Run now** — manually triggers the rule immediately
- Rules listed with last-run date and next-run date

### 15.5 Workload Tab

Team member workload overview:

- Table: member name, role, open task count, total story points
- Use to identify imbalance before sprint planning

---

## 16. Operations Hub — 8 Tabs

**Route:** `/projects/operations`

Cross-project operational layer.

### 16.1 Approvals

**Request tab:**
- Select project, title, description, one or more approvers
- Submit approval request

**Queue tab:**
- Lists pending approvals where you are an approver
- Approve or reject with a note

### 16.2 Activity

- Timeline feed of all project events: task created/moved/assigned/commented, sprint started, file uploaded, etc.
- Filter by project
- Each event links to the source task or project

### 16.3 Reporting

Advanced cross-project metrics:

| Metric | Description |
|--------|-------------|
| Lead time | Avg time from creation to completion |
| Cycle time | Avg time from "in progress" to completion |
| Throughput | Tasks completed per week bar chart |
| Overdue trend | Overdue count over past weeks |
| Sprint burndown | Remaining vs ideal per day |
| Velocity | Story points per sprint |

**ICS Calendar Export** — downloads a `.ics` file of all milestone due dates for import into Google Calendar / Outlook / Apple Calendar.

### 16.4 Docs (Knowledge Base)

- Create and list knowledge base documents per project
- Markdown editor with live preview
- Also accessible from each project's Docs tab

### 16.5 Notifications (Preferences & Rules)

**Global preferences:**

| Setting | Default |
|---------|---------|
| Email notifications | On |
| Due reminders | On |
| Overdue digest (daily) | Off |
| Watch notifications | On |
| Approval notifications | On |

**Digest preview** — sample of what your daily digest email looks like.

**Per-project notification rules:**
- Create rule: select project + event type + delivery channel (in-app / email / both)
- Rules override global defaults for that project
- List of active rules with delete button

### 16.6 Automation

**AI rule builder:**
- Describe automation in plain English → AI generates trigger + condition + action (requires AI plan)

**Manual rule builder:**
- Trigger: task created / task moved to column / due date reached / task assigned
- Condition: issue type / priority / assignee / column
- Action: assign user / move to column / set priority / send notification

Active rules listed with toggle on/off and delete.

### 16.7 Issue Fields (Custom Fields)

Per-project, per-issue-type custom fields:

| Type | Example |
|------|---------|
| Text | External ticket ID |
| Number | Budget, story points override |
| Date | Target ship date |
| Select | Region, environment |

Custom fields appear in the task create/edit form for the configured issue type.

### 16.8 Client Portal

- **Generate AI client report** — AI produces a client-ready progress summary (requires AI plan)
- **Grant access** — enter client email; they receive a read-only portal link
- **Portal links** — list all active links; copy or revoke

---

## 17. Project Reports & Insights

**Route:** `/projects/[id]/reports`

Per-project analytics across 4 tabs.

### 17.1 Overview Tab

- Health score (0–100) composite metric with colour indicator
- Progress ring — % tasks completed
- Open / In-progress / Done counts
- Overdue count with warning
- Team member task bar chart

### 17.2 Velocity Tab

- Weekly velocity bar chart (story points per week)
- Sprint-over-sprint comparison line chart

### 17.3 Burndown Tab

- Sprint burndown: remaining work vs ideal burn rate per day
- Hover to see exact values per day

### 17.4 Team Tab

- Per-member: assigned, completed, in-progress, completion rate %
- **AI insights** button — AI narrative summary with recommendations (requires AI plan)

**Export** — dropdown on the page: export charts as PNG or full report as CSV.

---

## 18. Project Timeline

**Route:** `/projects/[id]/timeline`

The Timeline tab in the project board currently shows a placeholder screen ("Visualize your project roadmap and dependencies in a Gantt-style timeline" + Configure Timeline button). The full Gantt implementation is in progress.

A separate per-project Timeline page exists at `/projects/[id]/timeline` with:
- Gantt-style horizontal bars for tasks and milestones
- Drag bars to adjust start/end dates
- Dependency arrows between linked tasks
- Group by epic or assignee
- Zoom: day / week / month view

---

## 19. Project Files

**Route:** `/projects/[id]/files`

Upload and manage file attachments scoped to a project.

### 19.1 Categories

| Category | Description |
|----------|-------------|
| Documentation | Technical docs, specs |
| PPT | Presentations |
| Excel | Spreadsheets |
| Use case | Flow diagrams |
| Other | Anything else |

### 19.2 Upload

1. Enter a title
2. Select category
3. Choose file from device
4. **Upload**

### 19.3 Managing

- **Search** — filter by title
- **Download** — download icon on each file
- **Delete** — trash icon (owner or project admin only)

---

## 20. Project Docs

**Route:** `/projects/[id]/docs`

Per-project knowledge base:

- Sidebar list of all documents
- Click to open in a markdown editor
- Create new document with a title
- Also accessible via Operations Hub → Docs tab

---

## 21. Project Billing

**Route:** `/projects/[id]/billing`

- Set total project budget
- Log expense line items: name, amount, date, category
- Budget gauge: spent vs remaining
- Export billing data as CSV

---

## 22. Project Settings & Permissions

**Route:** `/projects/[id]/settings/permissions`

### 22.1 Project Roles

- Lists all team members with their implied project role (derived from team role)
- Override any member's project role: Project Admin / Editor / Commenter / Viewer
- Add a member to the project with a specific role
- Remove a member's project override (reverts to team-role default)

### 22.2 Role Capability Matrix

Visual table showing what each project role (Project Admin / Editor / Commenter / Viewer) can do across all capabilities.

### 22.3 Git Integrations (per project)

Three integration cards available:

**GitHub:**
- OAuth connect (redirects to GitHub)
- Link a repository (owner/repo format)
- Connected status badge with GitHub username

**GitLab:**
- Same flow as GitHub with GitLab OAuth

**Bitbucket:**
- Same flow with Bitbucket OAuth

Once connected, commits and PRs mentioning a task ID appear in the task activity feed.

---

## 23. Messages — Real-Time Chat

**Route:** `/messages`

### 23.1 Sidebar Structure

**Special views (top of sidebar):**
- **All Unreads** — aggregated list of every channel with unread messages
- **Threads** — all thread replies you participated in or that mention you
- **Drafts & Sent** — your scheduled messages (pending and sent)

**Starred channels section** — channels you've starred appear here for quick access

**Channels** — `#channel-name` list with unread counts

**Direct Messages** — one-to-one and group DMs with presence dots

**Online members** — presence indicator on each avatar

### 23.2 Channel Sorting

Right-click the Channels group header or use the sort control:
- **Recent** — most recently active first (default)
- **Alphabetical** — A to Z
- **Most Unread** — highest unread count first

### 23.3 Sending a Message

- Type and press **Enter** to send; **Shift+Enter** for a new line
- Markdown: `**bold**`, `_italic_`, `` `code` ``, ` ```block``` `
- @mention: `@username` → notification sent to that user
- Channel mention: `#channel-name`
- Emoji picker via the 😊 icon or `:emoji_name:`

### 23.4 Slash Commands

Type `/` to open the command menu:

| Command | Effect |
|---------|--------|
| `/poll` | Create a poll with question + up to 4 options; members vote inline |
| `/remind` | Set a personal reminder at a chosen time |
| `/shrug` | Appends `¯\_(ツ)_/¯` |
| `/giphy` | Search and send an animated GIF |
| `/assign` | Assign a task to a team member from the composer |
| `/status` | Update your custom status without leaving chat |
| `/help` | Lists all available slash commands |

### 23.5 Voice Memos

Click the **microphone** icon in the composer:

1. Click to start recording (uses browser MediaRecorder API)
2. Timer shows duration while recording
3. Click stop — preview the recording with play/pause
4. **Send** to attach the audio to the message, or **Discard** to cancel

### 23.6 Format Toolbar

The composer has a format toolbar with quick-insert buttons for bold, italic, inline code, code block, links, and lists.

### 23.7 Quote / Reply in Composer

Hover a message → click **Quote** → the message is embedded as a blockquote in your composer.

### 23.8 Reactions & Threads

- Hover message → emoji icon → add reaction
- Reactions aggregate with count; click an existing one to add yours
- Click **Reply** to open the thread panel on the right
- Thread replies are visible only in the Threads special view or when the thread is open

### 23.9 Edit History

- Hover message → `⋯` → **View edit history** — opens a modal showing all previous versions with timestamps

### 23.10 Pinned Messages

- Hover message → `⋯` → **Pin**
- Pinned tab in the channel header shows all pinned messages
- Click to jump to pinned message in history

### 23.11 Starred Messages

- Hover message → `⋯` → **Save / Star** — message saved to your personal saved list
- Access starred messages from the `⋯` menu or via the channel details panel

### 23.12 Star a Channel

- Click the ⭐ icon in the channel header (top bar) to star/unstar
- Starred channels appear in the dedicated **Starred** section at the top of the sidebar

### 23.13 Notification Level per Channel

In the channel header → `⋯` → **Notification preferences**:
- **All messages** (default)
- **Mentions only**
- **Mute**
- **Keywords** — enter comma-separated keywords; get notified only when those words appear

### 23.14 Editing & Deleting Messages

- Edit: hover → `⋯` → **Edit** (available for a limited window); inline editor appears
- Delete: hover → `⋯` → **Delete**; removed for all users
- Edited messages show "(edited)" label

### 23.15 Scheduled Messages

- In the composer, click the clock icon → set date/time → **Schedule**
- Appears in **Drafts & Sent** until it sends
- Cancel or reschedule from Drafts & Sent

### 23.16 Message Search

- Search icon in the channel header (or mobile search button)
- Filter by: text query, sender, date from, date to
- **Save preset** — save a named search preset for reuse
- Click a search preset to re-run it instantly
- Edit preset name inline; delete presets

### 23.17 Jump to Unread

When entering a channel with unread messages, a yellow **"Jump to first unread"** banner appears at the top. Click to scroll to the first unread message.

### 23.18 New Message Count Banner

While scrolled up in history, a pill at the bottom shows how many new messages have arrived. Click to jump to the bottom.

### 23.19 File Sharing

- Drag & drop up to **5 attachments** per message into the composer
- Or click the paperclip icon to select files
- Images render inline; other files show as download cards
- Pending attachments shown as previews with a remove `×` button before sending

### 23.20 Channel Management

- **New channel** — click `+` next to Channels → name, description, public/private
- **Private channels** — invite-only; non-members cannot see or join
- **Add members** — channel header → 👥 icon → search team members → select → **Add**
- **Channel details panel** — click ℹ icon → "About" tab (topic, description, member count) and "Members" tab (searchable list of all members)
- **Archive** — Admin can archive; channel becomes read-only
- **Leave** — any member can leave via `⋯` → Leave channel

### 23.21 Direct Messages & Group DMs

- Click `+` next to Direct Messages → search and select one or more users (up to 8) → **Open DM**
- Group DMs show all participant avatars

### 23.22 Mention Autocomplete

While typing `@` in the composer, a popup shows matching team members. Arrow keys + Enter to select. The mention turns into a highlighted chip.

---

## 24. Calls — Audio & Video

### 24.1 Starting a Call

- In any DM or channel → click the **phone** (audio) or **camera** (video) icon in the channel header
- Caller hears a Web Audio API ringtone; callee sees an incoming call banner with caller name and avatar

### 24.2 In-Call Controls

| Control | Action |
|---------|--------|
| Microphone | Mute / unmute |
| Camera | Video on / off |
| Screen share | Share entire screen or window |
| Record | Start / stop recording (saved locally) |
| End call | Hang up |

### 24.3 Missed Calls

Missed calls appear as a system message in the chat: "📞 Missed call from [name]".

### 24.4 Technical Details

- **WebRTC** via simple-peer for peer-to-peer audio/video
- ICE signalling over the existing WebSocket connection
- Web Audio API for ringtones (no audio files needed)
- No third-party call service; runs within your deployment

---

## 25. Presence & Custom Status

### 25.1 Presence Indicators

| Indicator | Meaning |
|-----------|---------|
| Green dot | Online — active last 5 minutes |
| Yellow dot | Away — active last 30 minutes |
| Grey dot | Offline |

Presence is broadcast in real time over WebSocket (TeamPresenceConsumer) and updates on all sidebar avatars, DM list, and member roster.

### 25.2 Custom Status

Click your **avatar** in the sidebar (bottom) → Status popover:

1. Enter an emoji (e.g. 🎧) and text (e.g. "In deep focus")
2. Or pick a **quick preset**: In a meeting, Out sick, On vacation, Working remotely, Focusing — DMs only, Commuting
3. Set an optional **expiry** — status auto-clears after: 30 min, 1 hour, 4 hours, today, this week, or for a preset's built-in duration (e.g. "In a meeting" defaults to 1 hour)
4. Click **Save status** or **Clear status** to remove it

Status appears as `[emoji] [text]` next to your name in all channels and DMs.

### 25.3 Update via Slash Command

Type `/status` in any message composer → opens the status form inline.

---

## 26. Meetings

**Route:** `/meetings`, `/meetings/[id]`

### 26.1 Creating a Meeting

1. Click **New meeting**
2. Title, description, start time, end time
3. Select invitees from team members
4. Optional video link or built-in FlowTeam call
5. **Schedule**

### 26.2 Meeting List

- Lists upcoming and past meetings
- Filter by date range or team member

### 26.3 Meeting Detail Page (`/meetings/[id]`)

- Attendee list with accept/decline status
- Meeting notes editor (visible to all invitees)
- Link to call recording (if recorded)
- **Edit meeting** — opens edit dialog (title, time, attendees, link)

### 26.4 Notifications

Invitees receive an in-app notification and email (if enabled) when a meeting is scheduled or updated.

---

## 27. Calendar

**Route:** `/calendar`

- **Views**: Month / Week / Day
- **Events shown**: meetings, task due dates, sprint start/end, milestones
- Click an event → detail panel
- Click an empty slot → create meeting
- **Filters**: by project or sprint
- **ICS export** — download all calendar events as `.ics` for Google Calendar / Outlook / Apple Calendar (also available from Operations Hub → Reporting)

---

## 28. Search

Universal search: press **Cmd/Ctrl + K** or click the magnifying glass in the top bar (debounced, triggers after 2 characters, 300ms delay).

- Searches: tasks, projects, team members, channels
- Results grouped by type with icons
- Press **Enter** or click a result to navigate
- Navigate results with arrow keys

---

## 29. Notifications

### 29.1 In-App Notification Panel

Click the **bell icon** in the top bar:

- Unread badge count on the bell
- Categories: mentions, assignments, comments, approvals, calls
- Click a notification to navigate to the source
- **Mark all as read** button

### 29.2 Email Notifications

Configured in **Settings → Notifications**:

- Task Assigned, Task Completed, Project Updates, Member Joined, Weekly Digest (toggles)
- Saved locally to `localStorage`

### 29.3 Per-Project Rules

In **Operations Hub → Notifications → Notification Rules**:
- Create: project + event type + delivery (in-app / email / both)
- Rules override global defaults for that project

### 29.4 Offline Email Notifications

When you're offline and someone sends a message mentioning you, FlowTeam sends an email after a short delay (handled by the Notification WebSocket consumer + Celery background task).

---

## 30. Dark / Light Theme

### 30.1 Toggle

Click the **sun / moon icon** in the top-right of the top bar:
- In dark mode: shows sun icon → click to switch to light
- In light mode: shows moon icon → click to switch to dark

### 30.2 Persistence

- Saved to `localStorage` key `flowteam-theme`
- Applied as CSS class (`dark` or `light`) on the `<html>` element
- Default for new users: **dark**
- Persists across page reloads and browser restarts

---

## 31. Two-Factor Authentication (2FA)

Available in **Settings → Security → Two-Factor Authentication**.

### 31.1 Enable

1. Click **Enable 2FA**
2. Scan QR code with Google Authenticator / Authy / any TOTP app
3. Enter the 6-digit code to confirm
4. Save your backup codes in a secure location

### 31.2 Sign In with 2FA

After email + password, enter the 6-digit TOTP code from your authenticator app.

### 31.3 Disable

Enter current TOTP code → **Disable 2FA**.

Company Admins can enforce 2FA for all members at the company level.

---

## 32. Web Push Notifications

- From **Settings → Notifications** → browser notification toggle → browser asks for permission → click **Allow**
- Sent for: mentions, task assignments, incoming calls, approval requests
- Works when FlowTeam tab is closed (browser must be running)
- Revoke in browser notification settings or the Settings toggle

---

## 33. Audit Log

**Route:** `/settings/audit-log` (CEO / Admin only)

Every sensitive action logged with actor, timestamp, IP:

- User invited / role changed / deactivated
- 2FA enabled / disabled
- API token created / revoked
- Project created / deleted / archived
- Permission changes
- Login success / failure
- Data export

Filter by actor, action type, date range. Export as CSV.

---

## 34. Exports

| Data | Location | Format |
|------|----------|--------|
| Project board | Board header → Export dropdown | CSV / XLSX / PDF |
| Project report | Reports page → Export | CSV / PNG |
| Project billing | Billing page | CSV |
| Audit log | Admin → Audit Log | CSV |
| Calendar / milestones | Calendar or Operations Hub → Reporting | `.ics` |
| Client report | Operations Hub → Client Portal | PDF (AI) |

---

## 35. Client Portal

**Route:** Operations Hub → Client Portal (per project)

- **Generate AI client report** — AI writes a polished progress summary: milestones, risks, upcoming deliverables (requires AI plan)
- **Grant access** — enter client email; they get a read-only portal link
- **Portal links** — list all active links; copy URL or revoke access
- Clients see: project name, milestone status, key risks, upcoming work — no internal task details

---

## 36. Automation Rules

**Route:** Operations Hub → Automation

### 36.1 AI Rule Builder

Describe the rule in plain English → AI generates trigger + condition + action → review → **Save** (requires AI plan).

### 36.2 Manual Rules

- **Trigger**: Task created / Task moved to column / Due date reached / Task assigned
- **Condition**: Issue type / Priority / Assignee / Column
- **Action**: Assign user / Move to column / Set priority / Send notification

### 36.3 Managing Rules

Active rules are listed with:
- Trigger + condition + action summary
- Active / inactive toggle (pause without deleting)
- Delete button

---

## 37. AI Features (AI Plan)

AI requires the team to have AI enabled (Settings → AI → toggle). When disabled, AI buttons are visible but show a "not enabled" toast. AI is powered by Claude.

### 37.1 Daily Briefing (Dashboard)

Auto-generated morning summary on the dashboard: overdue count, due-today count, meeting count, and a narrative text. **Refresh** button to regenerate. Collapses/expands with a chevron.

### 37.2 Focus Recommendations (Dashboard)

Up to 6 ranked task recommendations with urgency badge (CRITICAL / HIGH / MEDIUM / LOW) and the reason each task was recommended. **Refresh** button to regenerate.

### 37.3 Sprint Scope Suggestion (Planning Hub)

Planning Hub → Sprint Planning → **AI: Suggest scope** → selects best-fit backlog tasks for the target sprint based on priority and capacity hours. Shows reasoning text.

### 37.4 AI Retrospective (Planning Hub)

Per sprint → **Generate retrospective** → AI analyses completed/blocked tasks and returns:
- What went well
- What didn't go well
- Action items

### 37.5 Task Generation (Project Board)

Board → AI button → **Generate tasks** → describe what you want to build → AI creates structured tasks with titles, descriptions, and priorities.

### 37.6 Risk Analysis (Project Board)

Board → AI → **Analyse risks** → AI reviews open tasks, due dates, and blockers → returns a prioritised risk list with mitigation suggestions.

### 37.7 Project Health Score (Board Header & Portfolio)

AI-powered health score (0–100) displayed as a badge on the board header and portfolio cards. Uses task completion rate, blocker count, and sprint velocity.

### 37.8 AI Automation Builder (Operations Hub)

Operations Hub → Automation → describe rule in plain English → AI generates the full trigger/condition/action.

### 37.9 Client Report (Operations Hub)

Operations Hub → Client Portal → **Generate AI client report** → client-ready narrative with milestone progress, risks, upcoming deliverables.

### 37.10 Team Performance Insights (Reports)

Project Reports → Team tab → **AI insights** → narrative performance summary with recommendations per team member.

### 37.11 Channel Catch-up (AI feature)

AI can summarise missed messages in a channel — triggered from the channel header AI button (requires AI plan).

### 37.12 Auto Label & Triage

On task creation, AI can suggest labels, issue type, and priority automatically.

### 37.13 Workload Balancer

AI detects overloaded team members and suggests task reassignments.

---

## 38. Super Admin

**Route:** `/super-admin/dashboard` (platform operator only — `is_superuser`)

Non-superusers are automatically redirected to `/dashboard`.

### 38.1 Stats Panel

Platform-wide counts: users, teams, projects, tasks, messages. Activity: new users in 7d / 30d, task activity 7d, messages 7d.

### 38.2 User Management

- **Search users** — live search by email / name
- **Create user** — email, full name, timezone, password, active/staff/superuser flags
- **Edit user** — update any field except email; reset password
- **Delete user** — confirmation dialog
- **Bulk delete** — select multiple users → bulk delete (select-all checkbox with indeterminate state)

### 38.3 Company Management Panel

Full drill-down company management:

- **Companies list** — all companies with status badges (active / paused / onboarding / trial / suspended)
- **Create company** — via the Onboarding Wizard (name, plan, domain, settings)
- **Company detail** — see all teams, members, pending invites; edit company settings JSON
- **Team members drill-down** — for any team within a company
- **Toggle company active/inactive**
- **Edit onboarding status**

---

## 39. Plan Limits

| Feature | Free | Pro | AI |
|---------|------|-----|----|
| Team members | 5 | Unlimited | Unlimited |
| Projects | 3 | Unlimited | Unlimited |
| Storage | 1 GB | 20 GB | 100 GB |
| Message history | 30 days | Unlimited | Unlimited |
| AI features | — | — | ✓ |
| Client portal | — | ✓ | ✓ |
| Custom fields | — | ✓ | ✓ |
| Automation rules | — | ✓ | ✓ |
| Audit log | — | ✓ | ✓ |
| 2FA enforcement | — | ✓ | ✓ |
| Priority support | — | ✓ | ✓ |

---

## 40. Quick Reference — Field Limits

| Field | Limit |
|-------|-------|
| Task title | 200 characters |
| Channel name | 80 characters |
| Message | 4000 characters |
| Custom status text | 100 characters |
| Sprint name | 100 characters |
| Milestone name | 100 characters |
| Template name | 80 characters |
| Document title | 200 characters |
| File upload (single) | 50 MB |
| Attachments per message | 5 |
| Poll options | 4 |
| Group DM participants | 8 |
| Recurring rule interval | 1–365 (days / weeks / months) |
| WebSocket rate limit | 60 events per 10 seconds |
| Search min characters | 2 |
| Search debounce | 300 ms |
| Focus recommendations shown | 6 (out of all returned) |

---

## Appendix A — Production Setup

### A.1 Environment Variables

**Backend (Django):**
```
SECRET_KEY=
DATABASE_URL=
REDIS_URL=
ALLOWED_HOSTS=
CORS_ALLOWED_ORIGINS=
EMAIL_HOST=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=
DJANGO_SUPERUSER_EMAIL=
DJANGO_SUPERUSER_PASSWORD=
DJANGO_SUPERUSER_USERNAME=
AI_API_KEY=          # Anthropic key for AI plan features
FRONTEND_URL=        # Used in email links
```

**Frontend (Next.js):**
```
NEXT_PUBLIC_API_URL=https://your-domain/api
NEXT_PUBLIC_WS_URL=wss://your-domain/ws
```

### A.2 Services Required

| Service | Role |
|---------|------|
| Django + Channels | REST API + WebSocket server |
| PostgreSQL | Primary database |
| Redis | WebSocket channel layer + task queue |
| Celery | Email sending, offline notifications, recurring rules, digests |
| Nginx | Reverse proxy, static files, WebSocket upgrade |

### A.3 Deploying Updates

```bash
python scripts/deploy_hetzner_paramiko.py --prune
```

`--prune` runs `docker system prune -af` on the server before uploading to reclaim disk space. File uploads use raw SSH exec stdin-piping (`cat > file.tmp`) — SFTP is not used.

### A.4 WebSocket Consumers

| Consumer | Path | Purpose |
|----------|------|---------|
| ChatConsumer | `/ws/chat/{team_id}/` | Real-time messaging |
| ChannelEventsConsumer | `/ws/channel-events/{team_id}/` | Board updates, task events |
| TeamPresenceConsumer | `/ws/presence/{team_id}/` | Online/away/offline presence |
| NotificationConsumer | `/ws/notifications/{user_id}/` | Per-user in-app notifications |

Rate limit: 60 events per 10 seconds per consumer.

### A.5 Authentication Flow

- JWT access tokens (15-minute expiry) + refresh tokens (7-day expiry)
- `ROTATE_REFRESH_TOKENS=True` — each refresh issues a new refresh token
- Concurrent 401s are serialised through a shared `refreshPromise` lock in `api.ts` to prevent token-invalidation race conditions
- WebSocket connections authenticate with the access token on connect
- Only a confirmed 401 clears the user session — network errors and 5xx responses do not log users out

---

*FlowTeam User Guide v4.0 — reflects full codebase as of May 2026*
