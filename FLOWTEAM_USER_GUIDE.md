# Cowrk — Complete User Guide

**Version:** 5.0
**Covers:** Every feature end-to-end — Authentication, Onboarding, Dashboard (all roles), Projects (all views), Tasks, Sprints, Epics, Issue Navigator, Planning, Timeline, Docs, Files, Billing, Reports, Meetings, Messaging, Calls, Calendar, Notifications, Automation, Approvals, Integrations (GitHub), Members & Roles, Audit Log, Client Portal, AI Features, Super Admin.

---

## Table of Contents

1. [What is Cowrk?](#1-what-is-flowteam)
2. [Getting Started](#2-getting-started)
   - 2.1 [Creating an Account](#21-creating-an-account)
   - 2.2 [Onboarding Your Workspace](#22-onboarding-your-workspace)
   - 2.3 [Accepting an Invitation](#23-accepting-an-invitation)
   - 2.4 [Two-Factor Authentication (2FA)](#24-two-factor-authentication-2fa)
3. [Navigation Overview](#3-navigation-overview)
4. [Dashboard](#4-dashboard)
   - 4.1 [Role-Based Dashboards](#41-role-based-dashboards)
   - 4.2 [Daily Briefing (AI)](#42-daily-briefing-ai)
   - 4.3 [Activity Feed](#43-activity-feed)
   - 4.4 [My Tasks (Dashboard Widget)](#44-my-tasks-dashboard-widget)
5. [Projects](#5-projects)
   - 5.1 [Creating a Project](#51-creating-a-project)
   - 5.2 [Projects List View](#52-projects-list-view)
   - 5.3 [Kanban Board](#53-kanban-board)
   - 5.4 [List View](#54-list-view)
   - 5.5 [Epics View](#55-epics-view)
   - 5.6 [Retrospectives View](#56-retrospectives-view)
   - 5.7 [Timeline View](#57-timeline-view)
   - 5.8 [Bugs View](#58-bugs-view)
   - 5.9 [Archiving and Restoring Projects](#59-archiving-and-restoring-projects)
   - 5.10 [Exporting a Project](#510-exporting-a-project)
6. [Tasks](#6-tasks)
   - 6.1 [Creating a Task](#61-creating-a-task)
   - 6.2 [Task Fields Reference](#62-task-fields-reference)
   - 6.3 [Editing a Task](#63-editing-a-task)
   - 6.4 [Assigning Tasks](#64-assigning-tasks)
   - 6.5 [Task Priority](#65-task-priority)
   - 6.6 [Labels](#66-labels)
   - 6.7 [Attachments](#67-attachments)
   - 6.8 [Comments and Threads](#68-comments-and-threads)
   - 6.9 [Task Links](#69-task-links)
   - 6.10 [Subtasks](#610-subtasks)
   - 6.11 [Time Logging](#611-time-logging)
   - 6.12 [Approvals](#612-approvals)
   - 6.13 [Task Activity Log](#613-task-activity-log)
7. [Issue Navigator](#7-issue-navigator)
   - 7.1 [Filtering Issues](#71-filtering-issues)
   - 7.2 [Grouping Issues](#72-grouping-issues)
   - 7.3 [Bulk Actions](#73-bulk-actions)
   - 7.4 [Saving Custom Views](#74-saving-custom-views)
   - 7.5 [Issue Stats Panel](#75-issue-stats-panel)
8. [Sprints and Planning](#8-sprints-and-planning)
   - 8.1 [Creating a Sprint](#81-creating-a-sprint)
   - 8.2 [Sprint Capacity Planning](#82-sprint-capacity-planning)
   - 8.3 [Moving Tasks into a Sprint](#83-moving-tasks-into-a-sprint)
   - 8.4 [Completing a Sprint](#84-completing-a-sprint)
   - 8.5 [Recurring Tasks](#85-recurring-tasks)
9. [Epics](#9-epics)
   - 9.1 [Creating an Epic](#91-creating-an-epic)
   - 9.2 [Epic Phases and Priorities](#92-epic-phases-and-priorities)
   - 9.3 [Linking Tasks to an Epic](#93-linking-tasks-to-an-epic)
10. [Calendar](#10-calendar)
    - 10.1 [Calendar Views](#101-calendar-views)
    - 10.2 [Filtering the Calendar](#102-filtering-the-calendar)
    - 10.3 [Drag-Drop Rescheduling](#103-drag-drop-rescheduling)
    - 10.4 [External Calendars](#104-external-calendars)
    - 10.5 [Exporting to ICS](#105-exporting-to-ics)
11. [Meetings](#11-meetings)
    - 11.1 [Scheduling a Meeting](#111-scheduling-a-meeting)
    - 11.2 [Starting an Instant Meeting](#112-starting-an-instant-meeting)
    - 11.3 [Joining and Running a Meeting](#113-joining-and-running-a-meeting)
    - 11.4 [Meeting Recordings and Transcription](#114-meeting-recordings-and-transcription)
    - 11.5 [AI Meeting Summaries and Action Items](#115-ai-meeting-summaries-and-action-items)
    - 11.6 [Cancelling a Meeting](#116-cancelling-a-meeting)
12. [Messaging](#12-messaging)
    - 12.1 [Channels](#121-channels)
    - 12.2 [Direct Messages](#122-direct-messages)
    - 12.3 [Message Threads and Drafts](#123-message-threads-and-drafts)
    - 12.4 [Online Presence](#124-online-presence)
    - 12.5 [Calls from Channels](#125-calls-from-channels)
13. [Members and Roles](#13-members-and-roles)
    - 13.1 [Team Roles](#131-team-roles)
    - 13.2 [Project Roles](#132-project-roles)
    - 13.3 [Inviting Members](#133-inviting-members)
    - 13.4 [Changing Roles](#134-changing-roles)
    - 13.5 [Custom Permissions](#135-custom-permissions)
    - 13.6 [Removing Members](#136-removing-members)
14. [Project Settings](#14-project-settings)
    - 14.1 [Docs](#141-docs)
    - 14.2 [Files](#142-files)
    - 14.3 [Reports](#143-reports)
    - 14.4 [Billing and Time Tracking](#144-billing-and-time-tracking)
    - 14.5 [Permissions](#145-permissions)
    - 14.6 [GitHub Webhooks](#146-github-webhooks)
15. [Notifications and Automation](#15-notifications-and-automation)
    - 15.1 [Notification Rules](#151-notification-rules)
    - 15.2 [Automation Rules](#152-automation-rules)
16. [Audit Log](#16-audit-log)
17. [Client Portal](#17-client-portal)
18. [AI Features](#18-ai-features)
19. [Super Admin](#19-super-admin)
20. [My Tasks Page](#20-my-tasks-page)
21. [Keyboard Shortcuts and Tips](#21-keyboard-shortcuts-and-tips)
22. [Workflow Examples (End-to-End)](#22-workflow-examples-end-to-end)
    - 22.1 [Launching a New Project from Zero](#221-launching-a-new-project-from-zero)
    - 22.2 [Running a Two-Week Sprint](#222-running-a-two-week-sprint)
    - 22.3 [Onboarding a New Team Member](#223-onboarding-a-new-team-member)
    - 22.4 [Triaging a Bug Report](#224-triaging-a-bug-report)
    - 22.5 [Planning and Running a Design Epic](#225-planning-and-running-a-design-epic)
    - 22.6 [Scheduling, Running, and Following Up on a Meeting](#226-scheduling-running-and-following-up-on-a-meeting)
    - 22.7 [Cross-Project Issue Triage Session](#227-cross-project-issue-triage-session)
    - 22.8 [Client Progress Review via Client Portal](#228-client-progress-review-via-client-portal)
    - 22.9 [Tracking and Invoicing Billable Hours](#229-tracking-and-invoicing-billable-hours)
    - 22.10 [Connecting GitHub PRs to Tasks](#2210-connecting-github-prs-to-tasks)

---

## 1. What is Cowrk?

Cowrk is an all-in-one project management and team collaboration platform. It combines structured task management (Kanban boards, sprints, epics, timelines), real-time communication (channels, direct messages, audio/video calls), scheduling (meetings, calendar), and analytics — all under one roof.

**Key principles:**

- **Everything in one place.** Tasks, docs, files, meetings, chat, and billing live together so your team never needs to context-switch between five different tools.
- **Role-aware.** Every page, stat, and action adapts to whether you are a CEO, Admin, Manager, Member, or Viewer.
- **Real-time.** Activity feeds, messaging, and call notifications update live via WebSocket without page refreshes.
- **AI-assisted (when enabled).** Daily briefings, meeting summaries, action items, and project health scoring are generated automatically.

---

## 2. Getting Started

### 2.1 Creating an Account

1. Open Cowrk in your browser and click **Sign up**.
2. Enter your **full name**, **email address**, and a **password** (minimum 8 characters), then click **Create account**.
3. Check your inbox for a **verification email** and click the link inside. Your account is now active.

**OAuth sign-up:** If your organisation uses Google or another OAuth provider, click the provider button on the login/register page. You will be redirected to the provider and then back to Cowrk via `/auth/callback`.

> If you already have an invite link from a team member, go to [Section 2.3](#23-accepting-an-invitation) instead of signing up from scratch.

---

### 2.2 Onboarding Your Workspace

After your first login, Cowrk walks you through workspace setup at `/onboarding`.

**Steps:**

1. **Name your workspace** — Enter a company or team name. Cowrk generates a unique URL slug for you (e.g., `acme-corp`).
2. **Describe your team** — Choose your industry and approximate team size.
3. **Invite teammates** — Enter email addresses for the people you want to add immediately. You can skip this and invite later from Settings.
4. **Create your first project** — Give it a name and optionally pick a colour and icon.
5. **Done.** You land on the Dashboard with your first project and columns ready to use.

---

### 2.3 Accepting an Invitation

When you receive an invite email:

1. Click **Accept invitation** in the email.
2. If you already have an account you are taken to `/accept-invite/[token]` and joined automatically.
3. If you are new, you are prompted to create a password first, then joined.

**Company-level invites** (sent by a CEO-role user) go to `/company-invite/[token]` and add you to the company _and_ its default team simultaneously.

---

### 2.4 Two-Factor Authentication (2FA)

2FA adds a one-time password (TOTP) requirement at every login.

**Enabling 2FA:**

1. Go to **Settings → Security** (in your profile/account settings).
2. Click **Enable two-factor authentication**.
3. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.).
4. Enter the 6-digit code to confirm.
5. Save your **backup codes** in a safe place — these let you log in if you lose your device.

**Logging in with 2FA enabled:**

1. Enter your email and password as usual.
2. You are prompted for a 6-digit code.
3. Open your authenticator app, copy the current code, and submit.

> If you lose access to your authenticator, use one of the backup codes. Each backup code can only be used once.

---

## 3. Navigation Overview

After login, the left sidebar is your primary navigation:

| Section | What you find there |
|---------|---------------------|
| **Dashboard** | Personal stats, activity feed, quick task overview |
| **My Tasks** | Every task assigned to you across all projects |
| **Projects** | All your projects (list + sub-pages per project) |
| **Issues** | Cross-project issue navigator |
| **Planning** | Sprint planner and roadmap |
| **Operations** | Operations management view |
| **Calendar** | Tasks and meetings on a visual calendar |
| **Meetings** | Schedule and join meetings |
| **Messages** | Channels and direct messages |
| **Settings** | Team members, roles, audit log |

The top-right corner contains:
- **Search** — full-text search across tasks, projects, and people
- **Notifications bell** — in-app notification centre
- **Your avatar** — profile settings, 2FA, logout

---

## 4. Dashboard

The Dashboard (`/dashboard`) is your home page after login. It is role-aware — the widgets and stats shown depend on your team role.

### 4.1 Role-Based Dashboards

| Role | What they see |
|------|---------------|
| **CEO** | Company-wide KPIs: total projects, open tasks, overdue items, team velocity, billing summary |
| **Admin** | Team-level project health, member utilisation, recent activity |
| **Manager** | Sprint progress, tasks due soon, assignee workload |
| **Member** | Tasks assigned to me, upcoming deadlines, recent comments |
| **Viewer** | Read-only snapshot of projects they can access |

### 4.2 Daily Briefing (AI)

If AI is enabled for your team, a **Daily Briefing** card appears at the top of the Dashboard each morning. It summarises:

- Overdue tasks that need attention
- Upcoming deadlines today and tomorrow
- Recent decisions and discussion highlights
- Suggested priorities for the day

The briefing is generated fresh each day. Click any item in the briefing to jump directly to the relevant task or meeting.

### 4.3 Activity Feed

The right panel of the Dashboard shows a live **Activity Feed** — a real-time stream of actions taken by your team:

- Task created / moved / assigned / completed
- Comments posted
- Meetings scheduled or started
- Files uploaded

The feed updates automatically without a page refresh (powered by WebSocket). Click any activity item to navigate to the source task or project.

### 4.4 My Tasks (Dashboard Widget)

A compact task list shows tasks assigned to you, sorted by due date. Click any task to open its full detail view. Click **View all** to go to the full [My Tasks page](#20-my-tasks-page).

---

## 5. Projects

Projects are the primary organisational unit. Every task, sprint, epic, doc, and file belongs to a project.

### 5.1 Creating a Project

1. From the sidebar, click **Projects**.
2. Click the **+ New project** button (top-right of the project list).
3. Fill in:
   - **Name** — required
   - **Description** — optional but recommended
   - **Icon** — choose an emoji icon
   - **Colour** — pick a colour for visual identification
4. Click **Create project**.

Cowrk creates a default set of columns (e.g., Backlog, In Progress, In Review, Done). You can customise columns immediately from the board view.

**Example:**

> You are starting a product redesign initiative. Click **+ New project**, name it "Website Redesign Q3", pick the palette icon and blue colour, add a short description ("Full redesign of marketing site"), and click Create.

---

### 5.2 Projects List View

At `/projects` you see all projects your team has access to.

**Switching view modes:**

- **Grid view** — card-style layout showing project icon, name, task counts, and team avatars
- **List view** — compact table with columns for status, task count, completion %, overdue count, team members

**Filtering and searching:**

- **Status filter** — All, Active, Archived
- **Search bar** — filter projects by name in real time

**Stats bar (top of page):**

| Stat | Meaning |
|------|---------|
| Active projects | Projects not archived |
| Overall completion | % of tasks in done columns across all projects |
| Team members | Unique members across all projects |
| Overdue tasks | Tasks past their due date |

---

### 5.3 Kanban Board

The Board is the default view for a project. Each column represents a workflow stage, and tasks appear as cards.

**Creating a column:**

1. Scroll to the rightmost column and click **+ Add column**.
2. Enter a column name.
3. Optionally mark it as the **Done column** (tasks moved here get a resolution timestamp).

**Marking a column as Done:**

Right-click a column header → **Mark as done column**. Only one column per project can be the Done column.

**Moving tasks:**

Drag a task card from one column and drop it into another. The task's status updates instantly. All watchers and the activity log are notified.

**Filtering the board:**

Use the filter toolbar above the board to narrow displayed cards:

| Filter | Options |
|--------|---------|
| Priority | Urgent, High, Normal, Low |
| Due date | Overdue, Due today, Due this week, No date |
| Assignee | Select one or more team members |

**Searching tasks:**

Type in the search box (top of board) to instantly filter cards by title.

---

### 5.4 List View

Click the **List** tab on the project page to switch from the Kanban board to a sortable table of all tasks.

Columns shown: Title, Assignee, Priority, Status, Due Date, Labels, Estimated Hours.

Click any column header to sort. Click a task row to open its detail panel.

---

### 5.5 Epics View

Click the **Epics** tab to see all epics for this project. Each epic is displayed with its phase, priority, owner, date range, and linked task count. See [Section 9](#9-epics) for full epic management.

---

### 5.6 Retrospectives View

Click the **Retrospectives** tab to access the sprint retro board for this project.

**Creating a retro entry:**

1. Click **+ Add item** under **Keep**, **Improve**, or **Discussion**.
2. Type your observation.
3. Press Enter or click the checkmark.

Retro items are stored per sprint and are visible to all project members. Use this after every sprint to capture what worked and what didn't.

---

### 5.7 Timeline View

Click the **Timeline** tab for a Gantt-style view of tasks with start and due dates.

- Each task appears as a horizontal bar spanning its start → due date.
- Bars are colour-coded by priority.
- Drag the edges of a bar to adjust dates.
- Click a bar to open the task detail panel.

**Ideal for:** Spotting deadline conflicts, visualising parallel work streams, and presenting roadmaps to stakeholders.

---

### 5.8 Bugs View

Click the **Bugs** tab to see a filtered view of all tasks with issue type **Bug** in this project. The layout is identical to the List view but pre-filtered. Quickly triage defects without scrolling through non-bug tasks.

---

### 5.9 Archiving and Restoring Projects

**Archiving** hides a project from the active list without deleting any data.

1. On the Projects list, hover a project card and click the **⋮ menu**.
2. Select **Archive project**.
3. Confirm the prompt.

The project disappears from the default list. Switch the Status filter to **Archived** to find it.

**Restoring:**

1. Set the Status filter to **Archived**.
2. Hover the archived project → **⋮ menu** → **Restore project**.

---

### 5.10 Exporting a Project

1. Inside a project, click the **⋮ menu** (top-right of the board).
2. Select **Export**.
3. Choose format: **CSV**, **Excel (.xlsx)**, or **PDF**.
4. The file downloads immediately.

The export includes all tasks with their fields (title, assignee, priority, status, due date, labels, estimated hours, time logged).

---

## 6. Tasks

Tasks are the core unit of work. They live inside projects and belong to a column (status).

### 6.1 Creating a Task

**From the board:**

Click the **+ Add task** button at the bottom of any column. Type a title and press Enter for a quick-create.

**Full create form:**

Click **+ New task** in the top bar of the project (or the "+" icon next to a column header) to open the full Create Task modal.

Fields available on creation:

- Title (required)
- Description (rich text)
- Assignees
- Priority
- Due date
- Labels
- Issue type (Epic, Story, Task, Bug, Subtask)
- Sprint
- Epic
- Parent task (if creating a subtask)
- Estimated hours

---

### 6.2 Task Fields Reference

| Field | Description |
|-------|-------------|
| **Title** | Short name of the work item |
| **Description** | Rich text with formatting, bullet lists, checklists, code blocks |
| **Issue type** | Epic, Story, Task, Bug, Subtask |
| **Priority** | Urgent (red), High (orange), Normal (blue), Low (grey) |
| **Status** | The column the task is in (reflects workflow stage) |
| **Assignees** | One or more team members responsible |
| **Reporter** | Who created the task (set automatically) |
| **Sprint** | Which sprint this task is planned for |
| **Epic** | The higher-level initiative this task belongs to |
| **Parent task** | For subtasks, the parent task |
| **Labels** | Colour-coded tags (customisable per project) |
| **Start date** | When work is expected to begin |
| **Due date** | Deadline — appears on the calendar |
| **Estimated hours** | Planned effort |
| **Time logged** | Actual hours tracked via time logs |
| **Watchers** | Users who receive notifications on all task updates |
| **Attachments** | Files attached to this task |
| **Linked tasks** | Blocks / Blocked by / Duplicates / Relates to |
| **GitHub PRs** | Pull requests linked to this task via GitHub integration |

---

### 6.3 Editing a Task

Click any task card to open the **Task Detail Panel** (slides in from the right, or opens as a modal). All fields are editable inline:

- Click a field value to edit it.
- Changes save automatically when you click away or press Enter.

To edit the task in a dedicated full-page view, click the **Open in full page** icon (arrow icon, top-right of the panel).

---

### 6.4 Assigning Tasks

Cowrk supports **multi-assignee** tasks.

1. Open the task detail panel.
2. Click the **Assignees** field.
3. Search for or click team member names to add them.
4. Click a member again to remove them.

Each assignee receives a notification and sees the task in their My Tasks list.

---

### 6.5 Task Priority

Priorities signal urgency:

| Priority | Colour | Meaning |
|----------|--------|---------|
| **Urgent** | Red | Drop everything — needs immediate attention |
| **High** | Orange | Important, complete this sprint |
| **Normal** | Blue | Standard priority (default) |
| **Low** | Grey | Nice to have, no immediate pressure |

Set priority from the task detail panel or directly on the card via the right-click context menu.

---

### 6.6 Labels

Labels are free-form colour tags scoped to a project.

**Creating a label:**

1. Inside a project, open any task → click **Labels**.
2. Click **+ Create label**.
3. Enter a name and pick a colour.
4. Click Save.

**Applying a label:**

Click **Labels** in the task detail panel and select one or more labels from the dropdown.

**Filtering by label:**

Use the board's filter toolbar → Labels dropdown to show only tasks with specific labels.

---

### 6.7 Attachments

You can attach files directly to tasks or to individual comments.

**Uploading:**

1. Open the task detail panel.
2. Scroll to the **Attachments** section.
3. Click **Upload file** or drag-and-drop files onto the panel.

**Versioning:** If you upload a file with the same name as an existing attachment, Cowrk prompts you to create a new version. Previous versions are retained and accessible.

**Actions per attachment:**

- **Preview** — opens an in-app viewer for images and PDFs
- **Rename** — change the display name
- **Replace** — upload a new version
- **Download** — save locally
- **Delete** — permanently removes the attachment (requires appropriate role)

---

### 6.8 Comments and Threads

Comments appear in the task detail panel below the description.

**Posting a comment:**

1. Click the comment box at the bottom of the task panel.
2. Type your message (supports basic markdown: **bold**, _italic_, `code`, bullet lists).
3. Use `@mention` to notify a specific team member.
4. Press **Cmd/Ctrl + Enter** or click **Comment**.

**Replying to a comment:**

Click **Reply** under any comment to start a thread. Threads keep discussions focused on a specific point.

**Editing / deleting your comment:**

Hover a comment → click the **pencil** icon to edit, or the **trash** icon to delete. An edit timestamp is shown after editing.

---

### 6.9 Task Links

Link related tasks to create dependencies and prevent blockers from going unnoticed.

**Link types:**

| Type | Meaning |
|------|---------|
| **Blocks** | This task must be completed before the linked task |
| **Blocked by** | This task cannot start until the linked task is done |
| **Duplicates** | This task is a duplicate of the linked task |
| **Relates to** | A loose relationship with no dependency implication |

**Adding a link:**

1. Open the task detail panel.
2. Scroll to **Linked tasks** → click **+ Add link**.
3. Select the link type, then search for the target task by title.
4. Click **Save**.

---

### 6.10 Subtasks

Subtasks are tasks nested under a parent task. They follow the same fields as regular tasks.

**Creating a subtask:**

1. Open the parent task detail panel.
2. Scroll to **Subtasks** → click **+ Add subtask**.
3. Enter a title. The subtask is created and linked.

Subtask progress is rolled up into the parent (shown as a progress bar on the parent card).

---

### 6.11 Time Logging

Track actual time spent on a task.

**Logging time:**

1. Open the task detail panel.
2. Click **Log time**.
3. Enter:
   - **Minutes** — actual time spent
   - **Date** — when the work was done (defaults to today)
   - **Note** — brief description of what was done
   - **Billable** — toggle if this time is client-billable
   - **Hourly rate** — used for invoicing calculations
4. Click **Save log**.

You can add multiple logs per task (one per work session). All logs are visible in the **Billing** view of the project and can be exported for invoicing.

---

### 6.12 Approvals

Certain tasks or releases require formal approval before proceeding.

**Requesting an approval:**

1. Open the task detail panel.
2. Click **Request approval**.
3. Enter:
   - **Title** — what is being approved
   - **Description** — context for the approver
   - **Target type** — Task or Release
4. Submit. The approval is created with status **Pending**.

**Approving or rejecting:**

Users with Manager role or above see a notification. They open the approval and click:

- **Approve** — with an optional decision note
- **Reject** — with a required reason note

The requestor is notified of the decision. The approval record is stored on the task permanently.

---

### 6.13 Task Activity Log

Every change to a task is recorded in the **Activity** section of the task detail panel:

- Created, moved between columns, priority changed, assignee updated, due date changed, commented, attachment uploaded, time logged, approval requested, status changed.

The activity log is append-only and cannot be deleted, providing a full audit trail per task.

---

## 7. Issue Navigator

The Issue Navigator (`/projects/issues`) is a cross-project table of all tasks. Use it for triage sessions, status reviews, and bulk updates across multiple projects.

### 7.1 Filtering Issues

Use the filter bar at the top to narrow results:

| Filter | Options |
|--------|---------|
| **Project** | One or more projects |
| **Status** | Column names (e.g., Backlog, In Progress, Done) |
| **Priority** | Urgent, High, Normal, Low |
| **Due date** | Overdue, Today, This week, This month, No date |
| **Sprint** | Specific sprint or "No sprint" |
| **Assignee** | One or more team members |

Filters stack — apply as many as needed. Active filters are shown as chips; click the × on any chip to remove it.

---

### 7.2 Grouping Issues

Click **Group by** to organise rows into collapsible sections:

| Group | Result |
|-------|--------|
| **None** | Flat list (default) |
| **Project** | Grouped by which project the task belongs to |
| **Priority** | Grouped by Urgent / High / Normal / Low |
| **Assignee** | Grouped by who the task is assigned to |
| **Sprint** | Grouped by sprint name |

Collapse or expand any group header to focus on specific areas.

---

### 7.3 Bulk Actions

1. Click the **checkbox** on any row to select it. A bulk action toolbar appears at the bottom.
2. Select more rows (or click the header checkbox to select all visible rows).
3. Available bulk actions:
   - **Change priority** — set priority for all selected tasks
   - **Assign sprint** — move tasks into a sprint
   - **Change status** — move tasks to a different column
   - **Assign member** — set assignee for all selected
   - **Delete** — delete selected tasks (requires Admin+)

> Bulk actions are irreversible for delete. For all others, you can undo via the task's activity log.

---

### 7.4 Saving Custom Views

After configuring filters and grouping, click **Save view**:

1. Give the view a name (e.g., "My high-priority bugs this week").
2. Toggle **Shared** to make it visible to all team members, or leave off for private use.
3. Click **Save**.

Saved views appear in the left panel of the Issue Navigator. Click one to instantly restore that filter and grouping configuration.

---

### 7.5 Issue Stats Panel

At the top of the Issue Navigator, a stats ribbon shows:

| Stat | What it measures |
|------|-----------------|
| **Resolution velocity** | Average time tasks spend in the system before moving to Done |
| **Priority spectrum** | Breakdown of open tasks by priority level |
| **Workstream breakdown** | Task count split by project |
| **Actionable bottlenecks** | Columns with the highest task accumulation |

Use these stats to identify where work is getting stuck and which priority areas need more attention.

---

## 8. Sprints and Planning

Sprints are time-boxed iterations (typically 1–2 weeks). The Planning view (`/projects/planning`) gives you a bird's-eye view of all sprints.

### 8.1 Creating a Sprint

1. Open a project and click the **Planning** tab, or go to `/projects/planning`.
2. Click **+ New sprint**.
3. Fill in:
   - **Sprint name** (e.g., "Sprint 12 — Auth Redesign")
   - **Goal** — one sentence describing what success looks like
   - **Start date** and **End date**
   - **Capacity hours** — total available team hours for the sprint
4. Click **Create sprint**.

---

### 8.2 Sprint Capacity Planning

Once a sprint is created, open it to access the capacity planner:

1. Each team member's available hours are shown (defaults to capacity ÷ number of members).
2. Adjust individual hours if someone has leave planned.
3. As you add tasks, the estimated hours sum is compared against each person's capacity. A progress bar turns red when over-allocated.

This prevents overcommitting before a sprint starts.

---

### 8.3 Moving Tasks into a Sprint

**From the board:**

Right-click a task card → **Move to sprint** → select the target sprint.

**From the task detail panel:**

Click the **Sprint** field → select the sprint from the dropdown.

**From the Issue Navigator:**

Select tasks via checkboxes → **Assign sprint** (bulk action).

---

### 8.4 Completing a Sprint

When the sprint end date arrives:

1. Open the sprint from the Planning view.
2. Click **Complete sprint**.
3. Cowrk shows a summary: tasks completed, tasks incomplete.
4. Choose what to do with incomplete tasks:
   - **Move to next sprint** — carry forward unfinished work
   - **Move to backlog** — return them to the unassigned pool
5. Confirm.

The sprint status changes to **Completed** and is preserved for retrospective reference.

---

### 8.5 Recurring Tasks

Some tasks repeat on a schedule (e.g., "Weekly status report", "Daily standup notes").

**Setting up a recurring task:**

1. Open a task detail panel.
2. Click **Recurrence**.
3. Choose:
   - **Frequency** — Daily, Weekly, Monthly
   - **Day/date** — which day of week or day of month
   - **End** — Never, On date, After N occurrences
4. Click **Save**.

When a recurring task is completed, Cowrk automatically creates the next instance with the same fields.

---

## 9. Epics

Epics are large initiatives that span multiple tasks and often multiple sprints. They sit above stories and tasks in the hierarchy.

### 9.1 Creating an Epic

1. Open a project and click the **Epics** tab.
2. Click **+ New epic**.
3. Fill in:
   - **Title** — the initiative name
   - **Description** — goals, background, acceptance criteria
   - **Owner** — the team member leading this epic
   - **Start date** and **End date**
   - **Phase** (see 9.2)
   - **Priority** (see 9.2)
4. Click **Create epic**.

---

### 9.2 Epic Phases and Priorities

**Phases** track the lifecycle of the epic:

| Phase | Meaning |
|-------|---------|
| **Backlog** | Identified but not yet started |
| **Discovery** | Research and scoping in progress |
| **WIP** | Active development |
| **Review** | In final review / QA |
| **Done** | Completed and shipped |

**Priorities** indicate business value:

| Priority | Meaning |
|----------|---------|
| **Critical** | Must ship — business-critical |
| **Must Have** | Important, no ship without this |
| **Nice to Have** | Valuable but not blocking |
| **Best Effort** | Do it if there's capacity |

---

### 9.3 Linking Tasks to an Epic

**From the task detail panel:**

Open a task → click the **Epic** field → select the target epic.

**From the Epics view:**

Click an epic to open it → click **+ Add task** → search and select tasks to link.

A progress bar on the epic card shows the % of linked tasks that are in Done columns.

---

## 10. Calendar

The Calendar (`/calendar`) visualises tasks (by due date) and meetings together on a single calendar.

### 10.1 Calendar Views

Use the view selector (top-right of calendar):

| View | Best for |
|------|---------|
| **Month** | Getting a high-level overview of the month |
| **Week** | Detailed planning — see every task and meeting for the week |
| **Day** | Hour-by-hour view of a single day |
| **List** | Scrollable list of upcoming items sorted by date |

---

### 10.2 Filtering the Calendar

Use the filter panel (left sidebar or top bar):

| Filter | Options |
|--------|---------|
| **Project** | Show items from specific projects |
| **Priority** | Urgent, High, Normal, Low |
| **Meeting status** | Upcoming, Live, Past, Cancelled |
| **Mine only** | Toggle to show only tasks assigned to you |

---

### 10.3 Drag-Drop Rescheduling

In Month and Week views, drag a task or meeting to a different date to reschedule it. The task's due date (or meeting start time) updates automatically, and all assignees/attendees are notified.

---

### 10.4 External Calendars

If Google Calendar or Outlook is connected, external events appear on your Cowrk calendar as read-only items (shown in a lighter shade). This lets you see work deadlines alongside personal commitments without double-booking.

To connect:

1. Go to **Settings → Integrations** (or the Calendar settings panel).
2. Click **Connect Google Calendar** (or Outlook).
3. Authorise the OAuth prompt.
4. External events appear within minutes.

---

### 10.5 Exporting to ICS

Click the **Export** button (top-right of calendar) → **Download ICS**.

The ICS file can be imported into any calendar app (Google Calendar, Apple Calendar, Outlook) to see Cowrk tasks and meetings alongside your other events.

---

## 11. Meetings

The Meetings section (`/meetings`) is the hub for all scheduled and instant audio/video meetings.

### 11.1 Scheduling a Meeting

1. Click **+ Schedule meeting**.
2. Fill in:
   - **Title** — what the meeting is about
   - **Description** — optional agenda
   - **Date and time** — when it starts
   - **Duration** — in minutes
   - **Call type** — Audio or Video
   - **Attendees** — search and select team members
3. Click **Schedule**.

Cowrk automatically:
- Creates a dedicated **channel** for the meeting (attendees are added).
- Sends a notification to all attendees.
- Adds the meeting to attendees' calendars.

The meeting appears in the **Meetings list** with status **Scheduled**.

---

### 11.2 Starting an Instant Meeting

For impromptu calls:

1. Click **Start instant meeting**.
2. Choose call type (Audio / Video).
3. Optionally add attendees.
4. Click **Start**.

The meeting goes live immediately with status **Active**. A notification (with ringtone) is sent to invited attendees — they can accept or decline from the notification.

---

### 11.3 Joining and Running a Meeting

**From the Meetings list:**

- If the meeting is **Live**, a **Join** button is shown. Click it to enter the call.
- If you are an attendee and the meeting is upcoming, a countdown shows the time to start.

**In the meeting call:**

- Toggle audio mute / unmute
- Toggle video on / off
- View the attendee list
- Use the integrated chat (via the meeting's auto-created channel)

**Week strip:** The top of the Meetings page shows a horizontal week strip with coloured dots indicating scheduled/live meetings. Click a day to jump to meetings on that day.

---

### 11.4 Meeting Recordings and Transcription

If recording is enabled (requires appropriate permissions and storage configured):

1. During the meeting, click **Start recording**.
2. After the meeting ends, the recording is uploaded and processed.
3. Status progresses: **Uploaded → Transcribing → Transcribed**.
4. Once transcribed, the meeting detail page shows a full text transcript, searchable by keyword.

---

### 11.5 AI Meeting Summaries and Action Items

When AI is enabled and the recording is transcribed, Cowrk automatically generates:

- **Summary** — 3–5 bullet points capturing the key discussion points and decisions
- **Action items** — a JSON-formatted list of agreed next steps with (when mentioned) responsible owner and deadline

Both appear on the meeting detail page and in the meeting's channel. Action items can be clicked to create tasks directly from them.

---

### 11.6 Cancelling a Meeting

From the Meetings list, hover the meeting → click **⋮ menu** → **Cancel meeting**. All attendees receive a cancellation notification. The meeting status changes to **Cancelled** and it moves to the Past/Cancelled filter.

---

## 12. Messaging

The Messages section (`/messages`) provides real-time team communication through channels and direct messages.

### 12.1 Channels

Channels are topic-based group conversations.

**Creating a channel:**

1. In the Messages sidebar, click **+ New channel**.
2. Enter a channel name (no spaces — use dashes, e.g., `design-team`).
3. Choose **Public** (anyone on the team can join) or **Private** (invite-only).
4. Add initial members.
5. Click **Create**.

**Joining an existing channel:**

In the sidebar, click **Browse channels** to see all public channels. Click **Join** next to any channel.

**Channel types:**

| Type | Access |
|------|--------|
| **Public** | Any team member can view and join |
| **Private** | Only members explicitly added can see or join |
| **Meeting channel** | Auto-created when a meeting is scheduled. Named after the meeting. |

---

### 12.2 Direct Messages

To start a direct message with a team member:

1. In the sidebar under **Direct Messages**, click the **+** icon.
2. Search for the person by name.
3. Click their name to open or create the DM thread.

DMs are always private and only visible to the two parties.

---

### 12.3 Message Threads and Drafts

**Threads:**

Reply to a specific message to start a thread (keeps the main channel clean):
1. Hover a message → click **Reply in thread**.
2. The thread panel opens on the right.
3. All replies stay attached to the original message.

Access all your active threads from the **Threads** tab in the sidebar.

**Drafts:**

If you start typing a message and navigate away, Cowrk saves it as a draft. Access drafts from the **Drafts** tab. Click a draft to resume editing.

**Unread messages:**

The **Unreads** tab shows all channels and DMs with unread messages, sorted by most recent. Click any item to jump to the first unread message.

---

### 12.4 Online Presence

User presence (online / offline) is displayed next to avatars throughout the messaging UI:

- **Green dot** — online and active
- **Grey dot** — offline or inactive

Presence updates in real time. Cowrk detects inactivity and updates your status automatically.

---

### 12.5 Calls from Channels

You can start an audio or video call directly from any channel without scheduling it:

1. Open a channel.
2. Click the **phone** or **video camera** icon in the channel header.
3. An instant call is created for the channel.
4. All channel members receive a call notification with a ringtone.
5. Members click **Accept** to join or **Decline** to dismiss.

The active call indicator shows in the channel sidebar until the call ends.

---

## 13. Members and Roles

### 13.1 Team Roles

Cowrk uses five team-level roles:

| Role | Typical use | Key capabilities |
|------|-------------|-----------------|
| **CEO** | Company/team owner | Full access, delete team, manage billing, all settings |
| **Admin** | Senior manager | Create/manage projects, manage members (not CEO), access audit log |
| **Manager** | Team lead | Create projects, manage sprints, invite limited roles, export reports |
| **Member** | Individual contributor | Create/edit tasks, comment, message, join meetings |
| **Viewer** | Stakeholder/client | Read-only access to permitted projects |

---

### 13.2 Project Roles

Within a project, members can be granted a project-level role that overrides their team role for that project:

| Project Role | Can do |
|-------------|--------|
| **Project Admin** | Full project management, delete project |
| **Editor** | Create/edit all tasks, manage columns |
| **Commenter** | View everything, comment on tasks, cannot edit tasks |
| **Viewer** | View only, no comments, no edits |

Project roles are set per-member per-project in **Project Settings → Permissions**.

---

### 13.3 Inviting Members

1. Go to **Settings → Members**.
2. Click **+ Invite member**.
3. Enter the email address.
4. Select a **Role** (CEO, Admin, Manager, Member, Viewer).
5. Click **Send invite**.

The invitee receives an email with an accept link. Once accepted, they appear in the Members list with the assigned role.

**Auto-join by domain:** If your organisation's email domain is configured, anyone who signs up with a matching email automatically joins the team with the default role (usually Member).

---

### 13.4 Changing Roles

1. Go to **Settings → Members**.
2. Find the member in the list.
3. Click their current role badge.
4. Select the new role from the dropdown.
5. The change takes effect immediately.

> Only CEOs can promote someone to CEO. Only Admins+ can change roles. Managers can only assign Member or Viewer roles.

---

### 13.5 Custom Permissions

For fine-grained control, you can override specific capabilities per member:

1. Go to **Settings → Members** → click the member's name.
2. Click **Custom permissions**.
3. Toggle individual capabilities on or off (e.g., "Can export data", "Can manage integrations").
4. Click **Save**.

Custom permissions layer on top of the member's base role. If a capability is off in their role but toggled on in custom permissions, they gain it.

---

### 13.6 Removing Members

1. Go to **Settings → Members**.
2. Find the member → click **⋮ menu** → **Remove from team**.
3. Confirm.

Removed members lose access immediately. Their tasks and comments remain intact (data is not deleted).

---

## 14. Project Settings

Access project-specific settings by opening a project and navigating to the sub-pages or clicking the Settings gear in the project header.

### 14.1 Docs

The **Docs** tab stores project documentation.

**Creating a document:**

1. Click **+ New doc**.
2. Enter a **Title**.
3. Select **Doc type**: SOP, Spec, Meeting Note, Decision Log, or Note.
4. Select **Category**: PPT, Use Case, Documentation, Excel, or Other.
5. Write content in the rich-text editor.
6. Click **Save**.

Documents are versioned — each save creates a new version. Open a document → **Version history** to review or restore previous versions.

---

### 14.2 Files

The **Files** tab is a file repository for the project (separate from task-specific attachments).

**Uploading a file:**

1. Click **Upload file** or drag files onto the page.
2. Add an optional description.
3. Click **Upload**.

Files can be previewed (images, PDFs), downloaded, renamed, versioned, or deleted. Organise files into folders by clicking **+ New folder**.

---

### 14.3 Reports

The **Reports** tab provides project analytics:

| Report | What it shows |
|--------|--------------|
| **Task completion over time** | Line chart of tasks moved to Done per day/week |
| **Overdue tasks** | Count and list of tasks past their due date |
| **Team velocity** | Average tasks completed per sprint |
| **Workload distribution** | Tasks per assignee |
| **Burndown chart** | Sprint progress vs ideal completion rate |
| **Priority breakdown** | Open task count by priority |

Use the date range picker to adjust the reporting window. Click **Export** to download any report as PDF or CSV.

---

### 14.4 Billing and Time Tracking

The **Billing** tab aggregates all time logs for the project.

**Viewing time logs:**

Logs are shown in a table: Task, Member, Date, Minutes, Billable, Hourly Rate, Amount.

**Generating an invoice:**

1. Filter logs to the desired date range.
2. Toggle **Billable only** to exclude non-billable time.
3. Click **Generate invoice**.
4. Add client name, address, and payment terms.
5. Download as PDF.

**Bulk marking as billable/non-billable:**

Select time log rows → bulk action → **Mark billable** or **Mark non-billable**.

---

### 14.5 Permissions

**Project Permissions** (`/projects/[id]/settings/permissions`) lets you control who can access this project and at what level.

1. Click **+ Add member**.
2. Search for a team member.
3. Assign a **Project Role** (Project Admin, Editor, Commenter, Viewer).
4. Optionally set a **Validity window** (access from date / until date) for contractors or temporary access.
5. Click **Save**.

---

### 14.6 GitHub Webhooks

**GitHub integration** lets you link Pull Requests to tasks.

**Setup:**

1. Open **Project Settings → GitHub Webhooks**.
2. Copy the **Webhook URL** shown on the page.
3. In your GitHub repository, go to **Settings → Webhooks → Add webhook**.
4. Paste the URL, set Content-Type to `application/json`, and select events: **Pull requests**.
5. Click **Add webhook**.

**How it works:**

When a PR is opened, merged, or closed in the linked repository, Cowrk matches it to a task (by task ID in the PR title or branch name, e.g., `TASK-123`) and displays:

- PR number, title, URL
- Status: Open / Merged / Closed
- Author, base/head branches
- Review state and check status
- Reviewers and labels

PRs appear in the task detail panel under **GitHub Pull Requests**.

---

## 15. Notifications and Automation

### 15.1 Notification Rules

Notification Rules let you define when Cowrk sends alerts — beyond the defaults.

**Creating a rule:**

1. Go to **Project Settings → Notification Rules** (or **Settings → Notifications** for team-wide rules).
2. Click **+ New rule**.
3. Configure:
   - **Trigger** — e.g., "Task overdue", "Task moved to Done", "New comment"
   - **Filters** — e.g., "Only for high priority tasks", "Only in Sprint 12"
   - **Delivery** — In-app, Email, or Both
4. Toggle **Active** and click **Save**.

---

### 15.2 Automation Rules

Automation Rules execute actions automatically when conditions are met.

**Examples:**

- When a task is moved to "Done" → send a Slack message (if integrated)
- When a task becomes overdue → automatically increase priority to High
- When an approval is requested → notify all Managers

**Creating an automation:**

1. Go to **Project Settings → Automation**.
2. Click **+ New rule**.
3. Define:
   - **Trigger** — the event that starts the rule (task done, task overdue, approval requested, etc.)
   - **Conditions** — optional filters (e.g., "only if priority is Urgent")
   - **Actions** — what happens (send notification, change field, assign member, etc.)
4. Toggle **Active** and click **Save**.

Automation rules are per-project. Admins and above can create and manage them.

---

## 16. Audit Log

The Audit Log (`/settings/audit-log`) records every significant action taken in the workspace:

| Event category | Examples |
|----------------|---------|
| **Authentication** | Login, logout, 2FA enabled, password changed |
| **Members** | Invited, role changed, removed |
| **Projects** | Created, archived, restored, deleted |
| **Tasks** | Created, moved, deleted, bulk updated |
| **Settings** | Permissions changed, integrations connected |
| **Exports** | Data exported (by whom, when, what) |

**Filtering the log:**

- Date range picker
- Actor filter (who performed the action)
- Event type filter
- Search by keyword

**Exporting:**

Click **Export log** to download the filtered log as CSV. Only CEOs and Admins can access the Audit Log.

---

## 17. Client Portal

The Client Portal gives external clients read-only access to specific project data without needing a full Cowrk account.

**Creating a portal access link:**

1. Open a project → **Project Settings → Client Portal**.
2. Click **+ Create access link**.
3. Enter:
   - **Client email** — for identification purposes
   - **Display name** — how they appear in the portal
   - **Allowed statuses** — which task columns they can see
   - **Allowed documents** — which doc categories they can access
4. Click **Create**.
5. Copy and share the generated link.

**What clients can see:**

- Tasks in permitted columns (read-only — no editing, no comments)
- Documents in permitted categories
- Basic project progress metrics

**Revoking access:**

Find the access entry → **⋮ menu** → **Revoke access**. The link becomes immediately invalid.

---

## 18. AI Features

Cowrk's AI features are enabled per-team. Ask your Admin or CEO to enable AI in Team Settings.

| Feature | Where | What it does |
|---------|-------|-------------|
| **Daily Briefing** | Dashboard | Morning summary of priorities, overdue items, upcoming deadlines |
| **Meeting Summary** | Meeting detail page | Auto-summary of recording transcripts |
| **Action Items** | Meeting detail page | Extracted to-do list from meeting transcript |
| **Project Health Score** | Project board | AI-calculated score (0–100) based on overdue %, task velocity, and sprint completion rate |
| **Description suggestions** | Task create/edit | Suggests a task description based on the title (shown as a ghost text hint) |

**AI data handling:** AI features process data within your organisation's security boundary. No task or meeting data is used to train third-party models.

---

## 19. Super Admin

The Super Admin dashboard (`/super-admin/dashboard`) is only accessible to Cowrk system administrators — not regular team users.

**Capabilities:**

- View all companies and teams registered in the system
- Enable or disable AI features per team
- Manage system-wide settings
- Access global audit logs
- Impersonate a team for debugging (with audit trail)

> This section is not relevant for standard team users. Contact your Cowrk instance administrator if you need system-level changes.

---

## 20. My Tasks Page

The My Tasks page (`/dashboard/my-tasks`) shows every task assigned to you across all projects in one place.

**Filters available:**

| Filter | Options |
|--------|---------|
| **Status** | All, Active (not done), Completed |
| **Priority** | All, Urgent, High, Normal, Low |
| **Project** | Filter by specific project |
| **Due date** | Overdue, Today, This week, No date |

**Sorting:**

Click any column header (Title, Priority, Due Date, Project) to sort ascending/descending.

**Opening a task:**

Click any row to open the task detail panel. Edit the task directly without leaving My Tasks.

**Marking complete:**

Click the circle/checkbox on the left of a task row to mark it done instantly. The task moves to the Completed filter.

---

## 21. Keyboard Shortcuts and Tips

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette / global search |
| `Cmd/Ctrl + Enter` | Submit a comment |
| `Escape` | Close a modal or panel |
| `?` | Show all available shortcuts (on most pages) |
| `N` (on board) | Quick-create a new task in focused column |
| `F` (on board) | Open filter panel |

**Pro tips:**

- Use `@mention` in comments and descriptions to notify teammates directly.
- Star important projects by hovering the project card and clicking the star icon — starred projects appear at the top of the list.
- The **command palette** (`Cmd/Ctrl + K`) lets you jump to any project, task, or page without using the sidebar.
- Pin your most-used saved views in the Issue Navigator for one-click access.
- On the board, right-click a task card for a context menu with quick actions (change priority, assign sprint, move column, copy link).

---

## 22. Workflow Examples (End-to-End)

This section walks through realistic, complete workflows from first click to finished outcome.

---

### 22.1 Launching a New Project from Zero

**Scenario:** Your team needs to build a new customer portal. You are the Manager.

**Step 1 — Create the project**

1. Sidebar → Projects → **+ New project**.
2. Name: `Customer Portal`, icon: 🌐, colour: Teal.
3. Description: "Self-service portal for enterprise clients to manage their accounts."
4. Click **Create project**.

**Step 2 — Customise columns**

Cowrk creates default columns. For this project you want a QA stage:

1. On the board, click **+ Add column** → name it `QA`.
2. Drag the `QA` column to sit between `In Review` and `Done`.
3. Right-click `Done` → **Mark as done column**.

**Step 3 — Create the first epic**

1. Click the **Epics** tab → **+ New epic**.
2. Title: `User Authentication`, phase: Discovery, priority: Must Have.
3. Owner: assign to the lead developer.
4. Start date: today, End date: end of next sprint.
5. Click **Create epic**.

**Step 4 — Add tasks to the epic**

1. Click **+ New task** → Title: `Design login UI mockups`.
2. Set: Epic = `User Authentication`, Priority = High, Assignee = Designer.
3. Due date: end of this week.
4. Repeat for `Implement OAuth integration`, `Write login API tests`, `QA login flow`.

**Step 5 — Create the first sprint**

1. Planning tab → **+ New sprint**.
2. Name: `Sprint 1 — Auth MVP`, goal: "Ship a working login with OAuth".
3. Dates: next two weeks, capacity: 80 hours.
4. Click **Create sprint**.

**Step 6 — Move tasks into the sprint**

1. Open each task → Sprint field → select `Sprint 1 — Auth MVP`.
2. Or: Issue Navigator → filter by project → select all tasks → bulk action → Assign sprint.

**Step 7 — Invite the team**

1. Settings → Members → **+ Invite member**.
2. Invite designer (Member role), developer (Member role), QA lead (Member role).
3. Each accepts the invite and gains access to the project.

**Project is live.** Your team can now pick up tasks, move them across the board, log time, and track progress in Reports.

---

### 22.2 Running a Two-Week Sprint

**Scenario:** Sprint 1 is starting Monday. You are the Manager.

**Sprint kick-off (Monday morning):**

1. Planning → open `Sprint 1 — Auth MVP` → click **Start sprint**.
2. Sprint status changes to **Active**.
3. Post a message in the team channel: "Sprint 1 starts today! Goal: ship OAuth login. Board: [project link]."

**During the sprint (daily):**

1. Dashboard → check the Activity Feed for overnight updates.
2. My Tasks → review your assigned tasks and priorities.
3. Board → look for tasks stuck in a column for more than 2 days (these are candidates for a blocker conversation).
4. Use the Issue Navigator to quickly find overdue tasks across the sprint (filter: Sprint = Sprint 1, Due date = Overdue).

**Mid-sprint (end of week 1):**

1. Reports tab → open Burndown chart. Are you on track?
2. If behind: hold a 15-min sync (Meetings → Start instant meeting, invite relevant devs).
3. Adjust: drag lower-priority tasks out of the sprint to protect the core goal.

**Sprint end (Friday of week 2):**

1. Planning → `Sprint 1` → **Complete sprint**.
2. Review summary: 14/16 tasks completed.
3. Move 2 incomplete tasks to Sprint 2.
4. Epics tab → `User Authentication` epic shows 87.5% progress.

**Retrospective:**

1. Board → Retrospectives tab.
2. Team adds items:
   - Keep: "Daily async updates in the channel worked great."
   - Improve: "QA column was a bottleneck — QA lead needs tasks earlier."
   - Discussion: "Should we split auth into two epics?"

---

### 22.3 Onboarding a New Team Member

**Scenario:** A new developer, Sam, joins the team next Monday. You are the Admin.

**Before Sam arrives:**

1. Settings → Members → **+ Invite member**.
2. Email: `sam@company.com`, Role: Member.
3. Click **Send invite**.
4. Sam receives an email and creates their account.

**Sam's first day:**

1. Sam logs in and lands on the Onboarding flow (if first account) or directly on the Dashboard.
2. Sam goes to Settings → Security → **Enable 2FA** (company policy).
3. Sam sets their timezone in profile settings.

**Granting project access:**

1. Open the `Customer Portal` project → **Project Settings → Permissions**.
2. **+ Add member** → select Sam → Project Role: Editor.
3. Sam now sees the project in their sidebar and My Tasks shows their assigned tasks.

**Orientation meeting:**

1. Meetings → **+ Schedule meeting**.
2. Title: "Sam Onboarding - Project Overview".
3. Add Sam and the team lead as attendees. Duration: 45 min.
4. Run the meeting, record it.
5. After the meeting: AI summary and action items (e.g., "Sam to set up local dev environment") appear on the meeting page.
6. Click an action item → **Create task** → it appears in the project backlog assigned to Sam.

---

### 22.4 Triaging a Bug Report

**Scenario:** A user reports a critical bug: "Payment fails on checkout." You are a Member.

**Step 1 — Create the bug task**

1. Open the `E-Commerce Platform` project → **+ New task**.
2. Title: `[BUG] Payment fails on checkout`.
3. Issue type: **Bug**, Priority: **Urgent**.
4. Description: paste the error log and steps to reproduce.
5. Assignee: backend developer.
6. Due date: today (critical bug).
7. Click **Create**.

**Step 2 — Link to other tasks**

1. Open the bug task → **Linked tasks → + Add link**.
2. Link type: **Blocks**, target: `Release v2.4.0` task.
3. The release is now visibly blocked.

**Step 3 — Notify the team**

1. In the project's channel, type: "🚨 Critical bug reported: payment fails on checkout. Task: [link]. Dev on it now."
2. `@mention` the CTO for visibility.

**Step 4 — Track progress**

1. Dev investigates, moves task to `In Progress`, logs time.
2. Dev pushes a fix branch → opens a PR on GitHub (branch name: `fix/TASK-123-payment-checkout`).
3. PR auto-links to the task via the webhook. Task detail shows PR status: **Open**.
4. PR is reviewed → merged → task PR status: **Merged**.
5. Dev moves task to `QA`.
6. QA verifies fix → moves task to `Done`.
7. Resolution timestamp is set. Bug closed.

**Step 5 — Post-mortem**

1. Create a doc in the project: type = Decision Log, title = "Checkout Bug Post-Mortem".
2. Document root cause, fix, and prevention steps.

---

### 22.5 Planning and Running a Design Epic

**Scenario:** Your team is redesigning the onboarding flow. You are the Manager.

**Step 1 — Define the epic**

1. Projects → `Mobile App` → Epics → **+ New epic**.
2. Title: `Onboarding Redesign`.
3. Phase: Discovery, Priority: Must Have.
4. Owner: Lead Designer.
5. Dates: next 6 weeks.

**Step 2 — Populate discovery tasks**

Create tasks under the epic:
- `User research: 5 interviews with churned users` (Assignee: UX Researcher)
- `Analyse drop-off funnel in analytics` (Assignee: Product Analyst)
- `Competitive analysis: 3 competitor onboarding flows` (Assignee: Lead Designer)

**Step 3 — Move to WIP**

After discovery:
1. Epics → `Onboarding Redesign` → change Phase to **WIP**.
2. Create design tasks:
   - `Design wireframes for 5-step onboarding` 
   - `Design high-fidelity mockups`
   - `Prototype in Figma`
3. Add each to Sprint 3.

**Step 4 — Review**

1. Epic phase → **Review**.
2. Create task: `Design review session with stakeholders`.
3. Schedule a meeting (Meetings → Schedule), invite stakeholders.
4. After meeting: review AI action items, create follow-up tasks.

**Step 5 — Done**

1. All tasks complete → epic phase → **Done**.
2. Epic progress bar: 100%.
3. Export project report as PDF for stakeholder summary.

---

### 22.6 Scheduling, Running, and Following Up on a Meeting

**Scenario:** Weekly team standup, every Monday 9am. You are the Manager.

**One-time setup — Schedule recurring:**

1. Meetings → **+ Schedule meeting**.
2. Title: "Weekly Team Standup".
3. Date: next Monday 9:00am, Duration: 30 min, Type: Video.
4. Attendees: full team.
5. Click **Schedule**.

*(For recurring meetings, re-schedule each week after the prior one completes, or use a Calendar block.)*

**Monday 9am — Running the meeting:**

1. Meetings list → "Weekly Team Standup" is **Live** → click **Join**.
2. Meeting opens in the video call interface.
3. Screen share or discuss items.
4. Click **Start recording** at the beginning.

**After the meeting:**

1. Meeting detail page → Status: **Ended**.
2. Recording processes: Uploaded → Transcribing → Transcribed (takes a few minutes).
3. AI Summary appears: key decisions and blockers.
4. Action items appear: "Alex to finish auth PR by Wednesday", "Sam to set up staging environment by Thursday".
5. Click each action item → **Create task** → tasks appear in the project backlog.
6. Assign tasks to the responsible people, set due dates.
7. Post the meeting summary to the team channel: paste the AI summary.

---

### 22.7 Cross-Project Issue Triage Session

**Scenario:** End-of-week team triage: 30 minutes to clear high-priority issues across all projects. You are the Admin.

**Step 1 — Open Issue Navigator**

Sidebar → **Issues**.

**Step 2 — Set up the triage filter**

1. Filter: Priority = Urgent, High.
2. Filter: Due date = Overdue + Today.
3. Filter: Status = Backlog, In Progress (not Done).
4. Group by: **Project**.

Result: all high-priority, overdue or due-today tasks, grouped by project.

**Step 3 — Work through each group**

For each project group:
- Is this task assigned? If not → bulk action → Assign member.
- Is the due date realistic? If not → click task → update due date.
- Should this be in the current sprint? If not → bulk action → Assign sprint.

**Step 4 — Save the view for next week**

1. Click **Save view**.
2. Name: "Weekly Triage — High Priority Overdue".
3. Toggle **Shared** so all managers can use it.
4. Click **Save**.

Next Friday: click the saved view → immediately get the same filtered, grouped list.

**Step 5 — Record the session**

1. Copy the triage summary (which tasks were reassigned, what decisions made).
2. Create a doc: Project = General → Type = Meeting Note → paste summary.

---

### 22.8 Client Progress Review via Client Portal

**Scenario:** A client wants weekly visibility into their project's progress. You are the Admin.

**Step 1 — Create a client portal link**

1. Open the `Client X Website` project → **Project Settings → Client Portal**.
2. **+ Create access link**.
3. Client email: `jane.client@clientco.com`, Display name: "Jane (Client Co)".
4. Allowed statuses: "In Review", "QA", "Done" (client sees completed and near-complete work only).
5. Allowed documents: "Documentation" (they can see specs but not internal notes).
6. Click **Create**.
7. Copy the portal link and email it to Jane.

**Each week:**

1. Jane visits the portal link (no Cowrk account needed).
2. She sees tasks in the permitted columns and progress %.
3. She reviews approved documentation.
4. She emails you with questions → you update tasks with her feedback in the internal board.

**Revoking at project end:**

Project Settings → Client Portal → find Jane's entry → **Revoke access**.

---

### 22.9 Tracking and Invoicing Billable Hours

**Scenario:** Your agency tracks time on client projects and invoices monthly. You are the Admin.

**Daily — Developers log time:**

1. After working on a task, open the task detail panel.
2. Click **Log time**.
3. Enter: 90 minutes, date: today, note: "Implemented auth endpoints".
4. Toggle **Billable**: on.
5. Hourly rate: $150/hr.
6. Click **Save log**.

**Monthly — Generate invoice:**

1. Open the project → **Billing** tab.
2. Date range: first to last day of last month.
3. Toggle **Billable only**: on.
4. Review the list: confirm correct rates and hours.
5. Click **Generate invoice**.
6. Fill in: client name, address, payment terms (e.g., Net 30).
7. Download as PDF.
8. Send to client.

**Tip:** Bulk-mark all logs for a sprint as billable by selecting them in the Billing table → **Mark billable**.

---

### 22.10 Connecting GitHub PRs to Tasks

**Scenario:** Your dev team wants PR status visible directly on tasks. You are the Admin.

**Step 1 — Configure the webhook (once per project)**

1. Open the project → **Project Settings → GitHub Webhooks**.
2. Copy the **Webhook URL**.
3. On GitHub: repository → Settings → Webhooks → **Add webhook**.
4. Paste the URL. Content-Type: `application/json`. Events: **Pull requests**.
5. Click **Add webhook**.

**Step 2 — Developers name branches correctly**

When opening a PR, the title or branch name must reference the task ID:

- Branch: `feature/TASK-456-user-auth`
- PR title: `[TASK-456] Implement user authentication`

Cowrk parses the task ID and links the PR automatically.

**Step 3 — Visible in task detail**

Open the task → scroll to **GitHub Pull Requests**. You see:

- PR #47 — "Implement user authentication" — **Open** — Review: Pending
- Reviewers: @alice, @bob
- Checks: ✅ CI passing

When the PR is merged on GitHub, the task shows: **Merged**. You know the code is in. The QA team knows to start testing.

**Step 4 — Using PR status in triage**

In the Issue Navigator, filter by tasks with open PRs to identify work that is "in code review" but not yet moving to QA — a common bottleneck.

---

*End of Cowrk User Guide — Version 5.0*

*For support, contact your Cowrk administrator or submit an issue at the team's designated support channel.*
