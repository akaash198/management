# FlowTeam — Complete User Guide

> **Platform:** FlowTeam — full-stack team project management  
> **Stack:** Next.js 15 (frontend) · Django REST Framework (backend) · PostgreSQL · WebSockets  
> **Last updated:** 2026-04-19

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Projects](#3-projects)
4. [Kanban Board](#4-kanban-board)
5. [Task Detail Panel](#5-task-detail-panel)
6. [Issue Navigator](#6-issue-navigator)
7. [Planning Hub](#7-planning-hub)
8. [Operations Hub](#8-operations-hub)
9. [Calendar](#9-calendar)
10. [Messages](#10-messages)
11. [Notifications](#11-notifications)
12. [Settings](#12-settings)
13. [Super-Admin Dashboard](#13-super-admin-dashboard)
14. [Roles & Permissions](#14-roles--permissions)
15. [Tips & Keyboard Shortcuts](#15-tips--keyboard-shortcuts)

---

## 1. Getting Started

### 1.1 Registration

Navigate to `/register`.

| Field | Notes |
|---|---|
| Full name | Displayed on cards and avatars |
| Email | Used as login credential (unique) |
| Password | Min 8 characters |

After submitting you are redirected to the **Onboarding** flow.

```
┌─────────────────────────────────────────┐
│  Create your account                    │
│  ┌──────────────────────────────────┐   │
│  │ Full name  [________________]    │   │
│  │ Email      [________________]    │   │
│  │ Password   [________________]    │   │
│  │            [  Create account  ]  │   │
│  └──────────────────────────────────┘   │
│  Already have an account? Sign in       │
└─────────────────────────────────────────┘
```

### 1.2 Onboarding

First-time users land at `/onboarding`:
- **Create a new team** — enter a team name; a URL-friendly slug is auto-generated.
- **Join via invite** — if someone emailed you an invite link, follow it instead (see §1.4).

### 1.3 Login

Navigate to `/login`. Enter email + password. On success you land on the **Dashboard**.

> Super-admin accounts are automatically redirected to `/super-admin/dashboard`.

### 1.4 Accepting a Team Invite

Invite links follow the pattern `/accept-invite/<token>`. Clicking the link will:
1. Prompt you to log in or register if not authenticated.
2. Add you to the team with the role pre-set by the inviter.

---

## 2. Dashboard

**URL:** `/dashboard`

Your personal command center. Shows everything happening across your team at a glance.

```
┌────────────────────────────────────────────────────────────┐
│  Good morning, Akaash 👋                    [Refresh][All]  │
│  Here's what's happening with your projects today.         │
├────────────────────────────────────────────────────────────┤
│  WORKSPACE LENS                                            │
│  [Search tasks or projects…] [Priority▾] [Project▾] [Due▾]│
│  Saved views: [My urgent bugs ×]  [Live off] [Save view]   │
├──────────────────────────────┬─────────────────────────────┤
│  Lead the day with clarity.  │  Focus queue    3 items     │
│  Due this week:    4         ├─────────────────────────────┤
│  Visible projects: 6         │  Execution health   18%     │
│  Delivery velocity: 72%      │                             │
│  Team signal: Alice Smith    │                             │
├──────────┬──────────┬────────┴──────────────────────────── │
│ Open: 12 │ Overdue:2│ Due today: 3 │ Completed this wk: 8  │
├──────────┴──────────┴─────────────────────────────────────-┤
│  Smart Focus (top 4 tasks)   │  Quick Actions              │
│  ┌──────────────────────┐    │  + Create project           │
│  │ Fix login redirect   │    │  ☑ Open task queue          │
│  │ Alpha · Backlog      │    │  📅 Plan schedule           │
│  │ 🔴 URGENT  Due 4/20  │    │  → Review all projects      │
│  └──────────────────────┘    │                             │
├──────────────────────────────┤  Priority Radar             │
│  My Recent Tasks  (View all) │  Urgent ████░░░  2          │
│  Fix login redirect          │  High   ██████░  5          │
│  Alpha · Backlog · 4/20 🔴   │  Normal █████░░  4          │
│  Write unit tests            │  Low    ██░░░░░  1          │
│  Beta · In Progress          │                             │
├──────────────────────────────┤  Performance Pulse          │
│  Active Projects             │  Created: 12  Completed: 8  │
│  ┌───────────┐ ┌───────────┐ │  Rate: 72%    Members: 5   │
│  │ 🚀 Alpha  │ │ 📋 Beta   │ │                             │
│  │ ████░ 72% │ │ ████░ 45% │ │  Team Activity              │
│  │ 18t · 4👥 │ │ 12t · 2👥 │ │  Alice moved Fix auth       │
│  └───────────┘ └───────────┘ │  Bob commented · 10m ago   │
└──────────────────────────────┴─────────────────────────────┘
```

### 2.1 Workspace Lens (Global Filters)

Four filters at the top control every section on the dashboard simultaneously:

| Filter | Options |
|---|---|
| Search | Free text — matches task title, project name, column |
| Priority | All / Urgent / High / Normal / Low |
| Project | All / any active project |
| Due state | All / Overdue / Due today / No due date |

**Saving a view** — configure your filters, click **Save view**, enter a name. Up to 6 saved views per team stored in your browser. Click a saved view to restore; click `×` to remove.

**Live refresh** — toggle **Live off → Live 30s** for automatic 30-second polling.

### 2.2 Stat Tiles (Top Row)

| Tile | Links to |
|---|---|
| Open tasks | `/dashboard/my-tasks` |
| Overdue | `/dashboard/my-tasks?due=overdue` |
| Due today | `/dashboard/my-tasks?due=today` |
| Completed this week | Display only |

### 2.3 Insight Cards

| Card | What it shows |
|---|---|
| **Focus queue** | Count of your top-priority tasks needing attention |
| **Execution health** | % of open workload that is overdue or due today |

### 2.4 Smart Focus

Top 4 tasks sorted by urgency (overdue first, then nearest due date). Each card shows title, project, column, priority badge, and due date. Click to open the project board.

### 2.5 My Recent Tasks

Full task list filtered by the active lens. Rows show: title · project · column · due date badge (red when overdue).

### 2.6 Active Projects

Grid of project cards with color-coded progress bars, member avatar stack, and task counts.

### 2.7 Quick Actions (Sidebar)

Shortcuts to: Create project · Open task queue · Plan schedule · Review all projects.

### 2.8 Priority Radar

Bar chart of your open task counts broken down by priority level.

### 2.9 Performance Pulse

Mini metrics: tasks created this week, completed, delivery rate, and active team member count.

### 2.10 Team Activity Feed

Chronological log of recent task events across the whole team (created, moved, assigned, commented) with relative timestamps.

### 2.11 Reporting To

If the team hierarchy places you below a manager or CEO, a card at the bottom of the sidebar shows who you report to and their role badge.

---

## 3. Projects

**URL:** `/projects`

```
┌───────────────────────────────────────────────────────────┐
│  Projects              [Operations] [Planning] [Issues] [+]│
│  Manage your team's workflows and deliverables.           │
├──────────┬──────────┬──────────────┬──────────────────────┤
│ Total: 5 │Tasks: 42 │ Completion78%│ Overdue: 3           │
├──────────┴──────────┴──────────────┴──────────────────────┤
│  [🔍 Search projects…]  [Status: Active ▾]  [Sort ▾]      │
├───────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ ●●● (color bar)  │  │ ●●● (color bar)  │               │
│  │ 🚀 Alpha Project │  │ 📋 Beta Release  │               │
│  │ ACTIVE           │  │ ACTIVE           │               │
│  │ Updated 4/19     │  │ Updated 4/18     │               │
│  │ Two-line desc…   │  │ Two-line desc…   │               │
│  │ Progress: ████72%│  │ Progress: ████45%│               │
│  │ 18 tasks · 4 👥  │  │ 12 tasks · 2 👥  │               │
│  │ ✓ On track       │  │ ⚠ 2 overdue      │               │
│  │ [Reports]   [⋮]  │  │ [Reports]   [⋮]  │               │
│  └──────────────────┘  └──────────────────┘               │
└───────────────────────────────────────────────────────────┘
```

### 3.1 Creating a Project

Click **+ New project** (visible to CEO / Admin / Manager). The modal asks for:

| Field | Required | Notes |
|---|---|---|
| Name | Yes | Unique within the team |
| Description | No | Shown on the card |
| Color | No | Hex color for the card accent |
| Icon | No | Emoji displayed on the card |
| Template | No | Pre-populates columns, labels, and issue types |

### 3.2 Project Card Menu (⋮)

| Option | Notes |
|---|---|
| Open board | Go to the Kanban board |
| Permissions | Manage project-level member roles |
| Export CSV | Download all tasks as CSV |
| Export Excel | Download as `.xlsx` |
| Export PDF | Download as PDF report |
| Archive project | Soft-delete; all tasks preserved |
| Restore project | Re-activate an archived project |

### 3.3 Filter & Sort Bar

| Control | Options |
|---|---|
| Search | Matches project name or description |
| Status | All / Active / Archived |
| Sort | Recently updated · Name A–Z · Most tasks · Highest completion |

---

## 4. Kanban Board

**URL:** `/projects/<project-id>`

The primary workspace for a project. Tasks live in draggable columns.

```
┌──────────────────────────────────────────────────────────────┐
│  🚀 Alpha Project                           [+ Add column]    │
│  ← Back to Projects   Members · Reports · Settings           │
├──────────────┬───────────────┬──────────────┬────────────────┤
│  Backlog     │  In Progress  │  Review      │  Done ✓        │
│  ─────────── │  ──────────── │  ──────────  │  ──────────    │
│  ┌─────────┐ │  ┌─────────┐  │  ┌─────────┐ │  ┌─────────┐  │
│  │BUG      │ │  │STORY    │  │  │TASK     │ │  │EPIC     │  │
│  │Fix login│ │  │Auth flow│  │  │Write doc│ │  │User auth│  │
│  │🔴 URGENT│ │  │🟡 HIGH  │  │  │🔵 NORM  │ │  │✅ done  │  │
│  │Due 4/20 │ │  │@Alice   │  │  │@Bob     │ │  │         │  │
│  │2/4 ✓    │ │  │auth     │  │  │         │ │  │         │  │
│  └─────────┘ │  └─────────┘  │  └─────────┘ │  └─────────┘  │
│  [+ Add task]│  [+ Add task] │  [+ Add task]│  [+ Add task]  │
└──────────────┴───────────────┴──────────────┴────────────────┘
```

### 4.1 Columns

- Represent workflow stages (Backlog, In Progress, Review, Done, etc.).
- **Drag tasks** between columns to change their status.
- One column can be flagged as the **done column** — tasks moved here are auto-completed.
- Click **+ Add column** to create a new stage; enter name, optional color.
- Columns can be reordered by dragging.

### 4.2 Task Cards

Each card displays:

| Element | Description |
|---|---|
| Issue type badge | Epic / Story / Task / Bug / Subtask |
| Title | Truncated to 2 lines |
| Priority pill | 🔴 Urgent · 🟡 High · 🔵 Normal · 🟢 Low |
| Assignee avatar | Hoverable to show name |
| Due date | Red background when overdue |
| Labels | Color chips |
| Subtask progress | `2/4 ✓` — completed / total |

**Click a card** to open the [Task Detail Panel](#5-task-detail-panel).

### 4.3 Creating a Task

Click **+ Add task** inside any column (quick add with just a title), or use **New task** for the full form.

| Field | Required | Notes |
|---|---|---|
| Title | Yes | |
| Issue type | No | Default: Task |
| Priority | No | Default: Normal |
| Assignee | No | Team members |
| Due date | No | Date picker |
| Labels | No | Multi-select |
| Sprint | No | Assign immediately to a sprint |
| Estimated hours | No | Decimal, e.g., 4.5 |
| Parent task | No | Makes this a subtask of another task |
| Description | No | Rich text |

---

## 5. Task Detail Panel

Clicking any task card opens a slide-over panel on the right side.

```
┌────────────────────────────────────────────────────────────┐
│  [BUG] Fix login redirect                [Edit] [⋮]  [✕]  │
│  Column: In Progress   Project: Alpha                       │
├────────────────────────────────────────────────────────────┤
│  Priority   🔴 Urgent      Assignee   Alice Smith          │
│  Reporter   Bob Lee         Due date   Apr 20, 2026        │
│  Sprint     Sprint 3        Labels     auth  backend       │
│  Est hours  4h              Watchers   [+ Watch]           │
├────────────────────────────────────────────────────────────┤
│  Description                                               │
│  Users are redirected to /404 after successful login on    │
│  Safari 17. Affects all roles.                             │
├────────────────────────────────────────────────────────────┤
│  Subtasks (2/4)                                           │
│  ☑  Reproduce the bug          ☑  Identify root cause     │
│  ☐  Write the fix              ☐  Add regression test      │
│  [+ Add subtask]                                           │
├────────────────────────────────────────────────────────────┤
│  Task Links                                                │
│  Blocks →  [Deploy v2]     Relates to →  [Safari audit]   │
│  [+ Add link]                                              │
├────────────────────────────────────────────────────────────┤
│  Attachments                                               │
│  📎 screenshot.png  v2  456 KB   [Upload new version]      │
│  [+ Attach file]                                           │
├────────────────────────────────────────────────────────────┤
│  Time Tracker          [▶ Start timer]   Logged: 1h 20m    │
│  [+ Log time manually]                                     │
├────────────────────────────────────────────────────────────┤
│  Approval                                                  │
│  "QA sign-off"  🟡 PENDING   requested by Bob             │
├────────────────────────────────────────────────────────────┤
│  Comments                            [Sort: Newest ▾]      │
│  Alice  "Reproduced on Safari 17."   2h ago  [Reply][😊]  │
│    └─ Bob  "Confirmed. PR incoming." 1h ago                │
│  [Write a comment… @mention supported]   [Submit]          │
├────────────────────────────────────────────────────────────┤
│  Activity                                                  │
│  Alice moved Backlog → In Progress  ·  2h ago             │
│  Bob assigned to Alice              ·  3h ago             │
│  Bob created this task              ·  5h ago             │
└────────────────────────────────────────────────────────────┘
```

### 5.1 Editing Fields

All fields (title, description, priority, assignee, due date, sprint, labels, estimated hours, column) are editable inline. Changes save on blur or pressing Enter.

### 5.2 Subtasks

- Add inline checklist items using **+ Add subtask**.
- Check/uncheck to mark completion; progress is shown on the parent card.
- Tasks of type **Subtask** also appear as full tasks in the Issue Navigator.

### 5.3 Task Links

| Link type | Meaning |
|---|---|
| Blocks | This task must complete before the linked task can start |
| Blocked by | This task is waiting on another task |
| Duplicates | Duplicate of the linked task |
| Relates to | General association |

### 5.4 Attachments & Versioning

- Upload any file type directly to a task.
- Click **Upload new version** on an existing attachment to replace it while preserving all prior versions.
- Version history shows version number, uploader, file size, and timestamp.

### 5.5 Time Tracker

- **Start timer** — records start time; click **Stop** to log the elapsed minutes automatically.
- **Log time manually** — enter minutes, date, and an optional note.
- Total logged time shown in hours and minutes.

### 5.6 Comments & Mentions

- Write plain text or use **@name** to mention a team member (autocomplete pops up after `@`).
- **Reply** to any comment to create a nested thread.
- Edit or soft-delete your own comments (edited label appears; content is preserved in history).
- React to any comment with an emoji.
- Mentioned users receive a **mentioned_comment** notification.

### 5.7 Watchers

Click **+ Watch** to subscribe to all activity notifications for this task. Click again to unwatch.

### 5.8 Approvals

If someone requested a formal approval on this task, it appears with its status. Authorised users can click **Approve** or **Reject** and add a decision note.

---

## 6. Issue Navigator

**URL:** `/projects/issues`

A flat, filterable list of all tasks across every project in the active team — perfect for cross-project triage, bulk updates, and saved team views.

```
┌────────────────────────────────────────────────────────────┐
│  Issue Navigator                         [Save view] [+ New]│
│  [🔍 Search…] [Project▾] [Status▾] [Priority▾] [Due▾]     │
│               [Assignee▾] [Sprint▾]                        │
│  Saved Views: [My bugs ×]  [Overdue sprint 3 ×]            │
├─────┬──────────────────────┬─────────┬────────┬────┬───────┤
│  ☐  │ Title                │ Project │Priority│ Due│Status │
├─────┼──────────────────────┼─────────┼────────┼────┼───────┤
│  ☑  │ Fix login redirect   │ Alpha   │🔴 Urg  │4/20│ Open  │
│  ☑  │ Write unit tests     │ Beta    │🟡 High │4/25│ Open  │
│  ☐  │ Deploy v2            │ Alpha   │🟡 High │4/30│ Open  │
├─────┴──────────────────────┴─────────┴────────┴────┴───────┤
│  Bulk (2 selected): [Sprint▾] [Priority▾] [Move column▾]   │
└────────────────────────────────────────────────────────────┘
```

### 6.1 Filters

| Filter | Options |
|---|---|
| Search | Task title (full-text) |
| Project | Any active project |
| Status | All / Open / Done |
| Priority | All / Urgent / High / Normal / Low |
| Due | All / Overdue / Today / This week |
| Assignee | Any team member |
| Sprint | Any sprint |

### 6.2 Bulk Actions

Select tasks with checkboxes, then choose a bulk action:
- **Move to sprint** — assign all selected to a sprint
- **Change priority** — update priority on all selected
- **Move column** — move all selected to a different column

### 6.3 Saved Issue Views

Click **Save view** to store the current filter set as a named view. Views can be marked shared (team-visible) or private. They appear in the views bar for one-click recall.

---

## 7. Planning Hub

**URL:** `/projects/planning`

Central hub for sprint planning, roadmaps, workload analysis, and automation templates.

```
┌──────────────────────────────────────────────────────────┐
│  Planning Hub                                            │
│  Tabs: [Backlog][Sprints][Roadmap][Milestones]           │
│        [Workload][Templates][Recurring rules]            │
└──────────────────────────────────────────────────────────┘
```

### 7.1 Backlog Tab

Lists all open tasks not yet assigned to a sprint.
- Select tasks using checkboxes.
- Choose a target sprint from the dropdown.
- Click **Add to sprint** to bulk-assign.

### 7.2 Sprints Tab

Create and manage time-boxed sprints for projects.

| Field | Notes |
|---|---|
| Project | Which project this sprint belongs to |
| Name | e.g., "Sprint 3" |
| Goal | One-sentence sprint objective |
| Start date | ISO date |
| End date | ISO date |
| Capacity hours | Team's total available hours for this sprint |
| Status | Planned → Active → Completed |

**Per-member capacity** — once created, you can set individual capacity hours and notes per team member (visible in the Sprints table).

### 7.3 Roadmap Tab

Visual timeline of all active projects, showing sprint date ranges and milestone markers. Color-coded by sprint status:
- Planned (grey) · Active (blue) · Completed (green) · At Risk (amber)

### 7.4 Milestones Tab

Create delivery checkpoints for projects.

| Field | Notes |
|---|---|
| Project | Target project |
| Name | e.g., "Public beta launch" |
| Description | Optional |
| Due date | Target date |
| Status | Planned / At Risk / Completed |

Milestones appear as markers in the Calendar and Roadmap views.

### 7.5 Workload Tab

Table showing every team member with their open task count broken down by project. Use before sprint planning to avoid over-committing members.

### 7.6 Templates Tab

Save a project's structure as a reusable template.
- Template captures: column names, labels, issue types, and default roles.
- When creating a new project, select a template to pre-fill the board structure.

To create a template: enter a name, pick a source project, and save. Templates are team-scoped.

### 7.7 Recurring Rules Tab

Auto-generate tasks on a schedule.

| Field | Options |
|---|---|
| Project & Column | Where the task will appear |
| Title / Description | Task template text |
| Issue type & Priority | Defaults for generated tasks |
| Frequency | Daily / Weekly / Monthly |
| Interval | Every N periods |
| Next run date | First generation date |
| Assignee | Optional default assignee |
| Active | Toggle on/off without deleting |

Click **Run now** to trigger a rule immediately (useful for testing without waiting for the scheduled date).

---

## 8. Operations Hub

**URL:** `/projects/operations`

Advanced operational management: approvals, documents, automation, notifications, and client access.

```
┌──────────────────────────────────────────────────────────┐
│  Operations Hub                                          │
│  Tabs: [Approvals][Activity][Reporting][Documents]       │
│        [Notif. Rules][Automation][Client Portal]         │
│        [Issue Fields][Notif. Preferences]                │
└──────────────────────────────────────────────────────────┘
```

### 8.1 Approvals Tab

Formal approval workflows for tasks or releases.

| Column | Meaning |
|---|---|
| Title | Name of the approval |
| Type | Task approval or Release approval |
| Status | 🟡 Pending / ✅ Approved / ❌ Rejected |
| Requested by | Who created the request |
| Decided by | Who approved or rejected |
| Decision note | Optional reason text |

**Create:** select project, optional task, title, description, target type, and required role.  
**Decide:** click Approve or Reject on a Pending item; add an optional note.

### 8.2 Activity Feed Tab

Paginated real-time log of all task events across the team: who did what, on which task, in which project, and when.

### 8.3 Reporting Tab

Advanced analytics:
- Tasks created vs completed over custom date ranges
- Overdue task trends
- Per-member performance summaries
- Sprint burn-down data

### 8.4 Documents Tab

Attach structured documents to projects or tasks.

| Type | Use case |
|---|---|
| SOP | Standard operating procedure |
| Spec | Technical specification |
| Meeting Note | Meeting record |
| Decision Log | Formal decision record |
| Note | Freeform notes |

Documents support version history — uploading a replacement keeps all prior versions accessible.

### 8.5 Notification Rules Tab

Project-level automation for notifications (supplements personal preferences).

| Field | Options |
|---|---|
| Name | Descriptive label |
| Trigger | Task overdue / Task done / Approval requested |
| Delivery | In-app / Email / Both |
| Filters | Optional JSON conditions |
| Active | Toggle without deleting |

### 8.6 Automation Rules Tab

No-code automations triggered by task events.

| Trigger | When it fires |
|---|---|
| `task_done` | Task moves to a done-column |
| `task_overdue` | Task passes its due date |
| `approval_requested` | An approval is created |

Each rule has **conditions** (JSON filter) and **actions** (JSON array).

### 8.7 Client Portal Tab

Grant external clients read-only access to selected project data without a full account.

| Field | Notes |
|---|---|
| Email | Client's email address |
| Display name | Friendly label |
| Allowed statuses | Which columns the client can see |
| Allowed document IDs | Which documents are shared |
| Status | Active / Revoked |

Each entry generates a unique token. Share the portal URL with the client; revoke at any time.

### 8.8 Issue Type Field Definitions Tab

Define custom fields per issue type within a project.

| Field type | Example use |
|---|---|
| Text | "Browser" on Bug type |
| Number | "Story points" on Story type |
| Date | "Deployment target" on Epic |
| Select | "Environment" with options |

Mark `is_required` to enforce the field during task creation for that issue type.

### 8.9 Notification Preferences Tab

Personal settings for notification delivery.

| Setting | Default |
|---|---|
| Email enabled | Off |
| Due date reminders | On |
| Overdue digest | On |
| Watch notifications | On |
| Approval notifications | On |

**Digest preview** — shows what your next overdue-task digest email would contain before it is actually sent.

---

## 9. Calendar

**URL:** `/calendar`

Full-page calendar showing task due dates and project milestones.

```
┌──────────────────────────────────────────────────────────┐
│  ◀ April 2026 ▶    [Month][Week][Day][List]  [Mine only] │
├────┬─────┬─────┬─────┬─────┬─────┬──────────────────────┤
│ Mon│ Tue │ Wed │ Thu │ Fri │ Sat │ Sun                   │
├────┼─────┼─────┼─────┼─────┼─────┼──────────────────────┤
│    │     │     │     │     │     │                       │
│    │ 🔵  │     │ 🔴  │ 🟡  │     │                       │
│    │Fix  │     │Dep  │Rev  │     │                       │
│    │log  │     │loy  │iew  │     │                       │
│    │     │     │ ◆   │     │     │  ◆ = Milestone        │
└────┴─────┴─────┴─────┴─────┴─────┴──────────────────────┘
```

### Views

| View | Description |
|---|---|
| Month | All due-date events as colored dots per day |
| Week | Time-grid layout by week |
| Day | Hour-by-hour single day view |
| List | Scrollable agenda sorted by date |

### Filters

- **Mine only** — toggle to show only your assigned tasks (off = all team tasks visible)

### Interactions

| Action | Result |
|---|---|
| Click a task event | Opens the Task Detail Panel |
| Drag a task to a new date | Updates the task's due date in real time |
| Click an empty date cell | Creates a new task pre-filled with that due date |

### Milestones

Diamond markers (`◆`) appear on milestone due dates, color-coded by status: grey (Planned), amber (At Risk), green (Completed).

---

## 10. Messages

**URL:** `/messages`

Real-time team messaging with channels, threads, reactions, calls, and file sharing.

```
┌─────────────────────┬────────────────────────────────────┐
│  Channels           │  # general                          │
│  ──────────────     │  ────────────────────────────────── │
│  # general    ● 3   │  Alice  "Sprint 3 kickoff at 3pm"  │
│  # engineering      │    👍 2   [+ React]  [Reply]        │
│  # design     2     │                                     │
│  [+ New channel]    │  Bob  "Will be there 👋"            │
│  ──────────────     │    ↳ Carol  "Same, running 5min late│
│  Direct Messages    │  ────────────────────────────────── │
│  Bob Jones    ●     │  📎  mockup_v3.fig  2.1 MB         │
│  Carol Smith        │  ────────────────────────────────── │
│                     │  [📎] [@ Mention] [⏰ Schedule]     │
│                     │  [Type a message…]          [Send]  │
└─────────────────────┴────────────────────────────────────┘
```

### 10.1 Channels

- **Public** — visible and joinable by all team members.
- **Private** — invite-only; not visible to non-members.
- Unread badge on channel name.
- Create a channel: **+ New channel**, enter name and description.

### 10.2 Sending Messages

- Type and press Enter or click **Send**.
- Use `@name` for mentions — autocomplete shows after `@`.
- Attach files via the **📎** icon.
- **Schedule** — click ⏰ to pick a future send date/time; message queues until then.

### 10.3 Threads

Click **Reply** on any message to open a thread. Replies appear indented under the parent.

### 10.4 Reactions

Hover a message → click the emoji button → pick an emoji. Multiple users reacting with the same emoji are aggregated into a count badge.

### 10.5 Pinned Messages

Use the message action menu (hover → `···`) to **Pin** important messages. View all pins from the channel header.

### 10.6 Saved Messages

Click the bookmark icon on a message to save it for later. Saved messages are accessible from your profile.

### 10.7 Edit History

Edited messages show an "edited" label. The full edit history (old text → new text) is preserved.

### 10.8 Calls

Click **📞 Start call** in a channel to initiate a voice/video call. Other channel members can join from a banner notification. The call panel shows active participants, join times, and a leave button.

### 10.9 Per-Channel Notification Level

Right-click a channel name → **Notifications**:

| Level | Behavior |
|---|---|
| All messages | Notify on every message |
| Mentions only | Notify only on @mentions or keyword matches |
| Muted | No notifications |

---

## 11. Notifications

The **bell icon** (🔔) in the top nav bar shows your unread count.

```
┌──────────────────────────────────────────┐
│  Notifications                 Mark all ✓│
│  ──────────────────────────────────────  │
│  🔵 Alice assigned "Fix auth bug" to you │
│     Alpha Project  ·  5 minutes ago      │
│  ──────────────────────────────────────  │
│  🟡 Task "Deploy v2" is now overdue      │
│     Beta Release  ·  2 hours ago         │
│  ──────────────────────────────────────  │
│  ✅ Approval "QA sign-off" was Approved  │
│     Decided by Bob Lee  ·  1 day ago     │
└──────────────────────────────────────────┘
```

### Notification Types

| Type | Triggered when |
|---|---|
| `task_assigned` | Someone assigns a task to you |
| `task_due` | Task due date is approaching |
| `task_overdue` | Task has passed its due date |
| `task_watched` | Activity occurs on a task you watch |
| `approval_requested` | An approval needs your action |
| `approval_decided` | An approval you requested was decided |
| `automation_notice` | An automation rule fired |
| `mentioned_message` | You were @mentioned in chat |
| `mentioned_comment` | You were @mentioned in a task comment |
| `task_moved` | A watched task changed columns |
| `task_completed` | A watched task was completed |
| `invite_accepted` | Someone accepted your team invite |

### Actions

- Click a notification to navigate to the relevant task, message, or approval.
- **Mark all read** clears the badge counter.
- Individual notifications are marked read automatically when clicked.

---

## 12. Settings

**URL:** `/settings`

### 12.1 Profile Tab

| Setting | Notes |
|---|---|
| Full name | Update your display name |
| Avatar | Upload a profile picture (any image format) |
| Timezone | Select from a global timezone list for correct due-date display |

Click **Save profile** to persist changes.

### 12.2 Password Tab

Enter current password, new password, and confirmation. Click **Change password**.

### 12.3 Team Members Tab

Visible to Admin and CEO roles.

- Lists all members with name, email, avatar, role badge, and join date.
- **Change role** — click the role dropdown next to a member.
- **Remove member** — removes them from the team (their account is not deleted).
- **Invite member** — enter email + role; an invitation email is sent.
- Pending invites are listed below with an option to revoke.

### Team Roles

| Role | Description |
|---|---|
| CEO | Full access to everything; top of the hierarchy |
| Admin | Manage members, projects, and all settings |
| Manager | Create projects, manage sprints and planning |
| Member | Work on assigned tasks; no admin rights |
| Viewer | Read-only access to all content |

### 12.4 Permissions Tab

Fine-grained capability overrides per member per project. Each capability can be toggled on/off:

| Capability | Description |
|---|---|
| can_view | See the project |
| can_edit_tasks | Create and edit tasks |
| can_delete_tasks | Delete tasks |
| can_manage_project | Edit project name, description, settings |
| can_delete_project | Archive or permanently delete the project |
| can_edit_columns | Add, rename, or reorder columns |
| can_export | Export tasks to CSV / Excel / PDF |
| can_comment | Add comments to tasks |
| can_manage_members | Invite or remove project members |

### 12.5 Audit Log

**URL:** `/settings/audit`

Immutable record of every significant action across the team.

| Column | Description |
|---|---|
| Timestamp | UTC date + time |
| Actor | Who performed the action |
| Action | create / update / delete / permission_change / approval_change / automation_trigger / export / login / logout / invite_sent / invite_accepted |
| Object | Model name and object representation |
| Changes | Before/after diff in JSON |
| IP address | Request origin IP |

Read-only. Filterable by actor and time range. Retained indefinitely.

---

## 13. Super-Admin Dashboard

**URL:** `/super-admin/dashboard`

Only accessible to accounts with `is_superuser = true`. Super-admins are automatically redirected here on login.

```
┌──────────────────────────────────────────────────────────┐
│  Super-Admin Dashboard                                   │
│  Tabs: [Users][Teams][Projects][Activity]                │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ Users:48 │ Teams: 6 │Projects: │ Tasks: 312              │
│          │          │   24     │ Messages: 1,840         │
├──────────┴──────────┴──────────┴─────────────────────────┤
│  7-day Activity                                          │
│  New users: 3    Task events: 89    Messages: 214        │
└──────────────────────────────────────────────────────────┘
```

### 13.1 Users Tab

- List all registered users: email, name, join date, staff/superuser flags.
- **Create user** — name, email, password.
- **Edit user** — change name, toggle staff/superuser status.
- **Delete user** — permanent removal from the platform.

### 13.2 Teams Tab

- List all teams with member and project counts.
- **Create team** — enter name; slug auto-generated.
- **Edit team** — rename.
- **Delete team** — removes team and all associated data (irreversible).
- **Manage members** — view/change roles, invite, remove.

### 13.3 Projects (within a Team)

Within a team's detail view, admins can create, edit, or delete projects across any team without being a team member.

### 13.4 Activity Tab

Platform-wide 30-day summary:
- New users registered (7d and 30d)
- Task events in 7 days
- Messages sent in 7 days

---

## 14. Roles & Permissions

### 14.1 Team Role Hierarchy

```
CEO
 └─ Admin
     └─ Manager
         └─ Member
             └─ Viewer
```

| Capability | CEO | Admin | Manager | Member | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Invite / remove team members | ✓ | ✓ | — | — | — |
| Create projects | ✓ | ✓ | ✓ | — | — |
| Manage sprints & milestones | ✓ | ✓ | ✓ | — | — |
| Create & edit tasks | ✓ | ✓ | ✓ | ✓ | — |
| Comment on tasks | ✓ | ✓ | ✓ | ✓ | — |
| View all content | ✓ | ✓ | ✓ | ✓ | ✓ |
| View audit log | ✓ | ✓ | — | — | — |

### 14.2 Project Roles

Project roles override team roles within a specific project:

| Role | Default capabilities |
|---|---|
| Project Admin | Full control (all capabilities on) |
| Editor | View, edit tasks, export, comment |
| Commenter | View + comment only |
| Viewer | Read-only |

Capabilities can be individually overridden in **Settings → Permissions**.

### 14.3 Time-Limited Roles

Project roles support optional `valid_from` and `valid_until` timestamps. Outside that window the role is treated as inactive — useful for contractors or time-limited access without manual revocation.

---

## 15. Tips & Keyboard Shortcuts

### Global Search

Press `⌘K` (Mac) or `Ctrl+K` (Windows) anywhere to open the search modal. Searches across tasks, projects, messages, and team members.

### Navigation Shortcuts

| Shortcut | Destination |
|---|---|
| `⌘K` / `Ctrl+K` | Global search |
| Click sidebar icon | Dashboard / Projects / Calendar / Messages |

### Best Practices

1. **Save dashboard views** — create named lenses like "My urgent bugs" or "Sprint 3 tasks" once and recall them with one click.

2. **Use task links** — adding Blocks/Blocked-by relationships before sprint planning makes dependency chains visible on the board.

3. **Set up recurring rules** for repetitive work (weekly standups, monthly reviews) so tasks are generated automatically.

4. **Client Portal** — grant external stakeholders access to specific columns and documents without giving them a full account.

5. **Attachment versions** — always upload a new version rather than deleting and re-uploading; the history is preserved and auditable.

6. **Sprint capacity planning** — set per-member available hours before dragging backlog items into a sprint to prevent over-commitment.

7. **Audit log** — filter by `export` action to see who downloaded project data; filter by `permission_change` to audit access changes.

8. **Issue type custom fields** — add type-specific metadata (e.g., "Browser" for Bug, "Story points" for Story) without cluttering all task types.

9. **Auto-refresh on the dashboard** (Live 30s) is ideal during standups — toggle it on before the meeting so the board updates in real time for everyone watching.

10. **Notification rules** at the project level are separate from personal preferences — use them to ensure the right people are always alerted regardless of their individual settings.

---

*End of FlowTeam User Guide*
