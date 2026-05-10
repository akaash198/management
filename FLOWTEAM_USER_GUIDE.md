# FlowTeam — Complete User Guide

**Version:** 2.3  
**Covers:** All features end-to-end including Company hierarchy, Company Admin dashboard, Super Admin Company Management, CEO/invite onboarding, email domain auto-join, AI features, Web Push Notifications, OAuth (Google Login + GitHub/GitLab/Bitbucket), Calendar external events, Rich Link Embeds, Project Timeline/Docs/Billing, and Meeting Recordings + AI transcripts

---

## Table of Contents

1. [What is FlowTeam?](#1-what-is-flowteam)
2. [Getting Started — Register & Sign In](#2-getting-started--register--sign-in)
3. [Onboarding — Create Your Workspace](#3-onboarding--create-your-workspace)
4. [Company Structure & Roles](#4-company-structure--roles)
5. [Team Management (within a Team)](#5-team-management-within-a-team)
6. [Company Admin Dashboard](#6-company-admin-dashboard)
7. [Dashboard](#7-dashboard)
8. [Projects](#8-projects)
9. [Tasks — Full Feature Breakdown](#9-tasks--full-feature-breakdown)
10. [Sprints & Capacity Planning](#10-sprints--capacity-planning)
11. [Milestones](#11-milestones)
12. [Messages — Real-Time Chat](#12-messages--real-time-chat)
13. [Meetings](#13-meetings)
14. [Calendar](#14-calendar)
15. [Search](#15-search)
16. [Notifications](#16-notifications)
17. [Settings](#17-settings)
18. [Two-Factor Authentication (2FA)](#18-two-factor-authentication-2fa)
19. [Web Push Notifications](#19-web-push-notifications)
20. [Audit Log](#20-audit-log)
21. [Export](#21-export)
22. [Client Portal](#22-client-portal)
23. [Automation Rules](#23-automation-rules)
24. [AI Features (AI Plan)](#24-ai-features-ai-plan)
25. [Super Admin](#25-super-admin)
26. [Plan Limits](#26-plan-limits)
27. [Quick Reference — Field Limits](#27-quick-reference--field-limits)

**New in Version 2.3:** Full Company hierarchy (CEO → Admin → Manager → Member → Viewer) · Company Admin dashboard · Company invite flow with role-scoped permissions · Email domain auto-join on registration · Super Admin Company Management panel (5-step onboarding wizard, status filter chips, company cards, detail drill-down) · Company Settings per company (AI, notifications, plan, member cap, audit retention)

---

## 1. What is FlowTeam?

FlowTeam is an all-in-one team workspace that combines:

- **Company & team hierarchy** — multi-level roles (CEO → Admin → Manager → Member → Viewer), company-scoped invites, email domain auto-join
- **Project management** — Kanban boards, sprints, milestones, task dependencies
- **Real-time messaging** — channels, direct messages, threads, reactions
- **Meetings & calls** — instant audio/video calls and scheduled meetings
- **Calendar** — task due dates and meetings in one view
- **Team security** — role-based access control, 2FA, full audit log
- **AI assistant** — daily briefings, auto task descriptions, sprint planning, health scores, and more (AI plan)
- **OAuth sign-in** — Continue with Google for one-click registration and login
- **Browser push notifications** — real-time alerts even when FlowTeam is not the active tab
- **GitHub / GitLab / Bitbucket integration** — link pull requests to tasks automatically

Everything lives in one place.

**Example company used in this guide:** *Nova Agency* — a 10-person design and development studio.

---

## 2. Getting Started — Register & Sign In

### 2.1 Register a New Account

Open `http://localhost:3000/register`

Fill in:

| Field | Example | Rules |
|-------|---------|-------|
| Full name | `Sarah Chen` | Min 2 characters |
| Email | `sarah@nova-agency.com` | Must be a valid email |
| Password | `Launch2024!` | Min 8 characters |
| Confirm password | `Launch2024!` | Must match password |

Click **Create account**. You will be automatically signed in and redirected to onboarding.

> **Email domain auto-join:** If a company has a verified email domain that matches your registration email (e.g., `@nova-agency.com`), you will automatically be added as a **Member** of that company. No invite needed.

---

### 2.2 Sign In

Open `http://localhost:3000/login`

**Option A — Email and password**

Enter your email and password. If your account has 2FA enabled, you will be prompted for a 6-digit code from your authenticator app (or a backup code).

**Option B — Continue with Google**

Click the **Continue with Google** button. After approving access, FlowTeam creates or links your account automatically.

- If no FlowTeam account exists for your Google email, one is created automatically with email pre-verified
- If a password account already exists with the same email, your Google identity is linked to it

---

### 2.3 Register with Google

1. On the register or login page, click **Continue with Google**
2. Approve Google consent once
3. FlowTeam creates your account and takes you directly to onboarding

No email verification step is needed.

---

### 2.4 Password Reset

1. On the login page click **Forgot password?**
2. Enter your email address
3. Check your inbox for a reset link
4. Click the link and enter a new password (min 8 characters)

> **Note:** If you signed up with Google and have no password set, use **Continue with Google** to sign in.

---

## 3. Onboarding — Create Your Workspace

After registering, you land on `/onboarding`. This runs once per account.

### Step 1 — Create Your Team

Enter a **Team Name**. A URL-friendly slug is generated automatically.

```
Team name: Nova Agency
Slug:      nova-agency   ← auto-generated
```

Click **Create team** to continue.

### Step 2 — Invite Teammates

You can enter up to **5 email addresses** to invite immediately. Each gets a role of **Member** by default.

Click **Send invites** — or **Skip** to invite people later from Settings.

> **What gets created:** Your team workspace, your CEO account (you are the owner), and invite records for each email you entered.

---

## 4. Company Structure & Roles

FlowTeam uses a **Company** layer on top of Teams. A Company groups multiple Teams under one organisational structure with a defined leadership hierarchy.

> Companies are created and managed by **Super Admins** (platform operators) via the Super Admin dashboard. Once a company is active, its CEO and Admins manage it day-to-day from the Company Admin dashboard.

---

### 4.1 Company Roles

Every member of a company has one of five roles:

| Role | Who it's for |
|------|-------------|
| **CEO** | The company owner. Full control over the company, all teams, and all members. |
| **Admin** | Operations lead. Manages members, roles, invites, and company settings. |
| **Manager** | Team lead. Can invite Members and Viewers to teams. Sees own sent invites. |
| **Member** | Day-to-day contributor. Can view members and teams. |
| **Viewer** | External observer or client. Read-only access. |

---

### 4.2 What Each Role Can Do

| Action | CEO | Admin | Manager | Member | Viewer |
|--------|-----|-------|---------|--------|--------|
| Manage company settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite members to company | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invite roles (max level) | CEO | Admin | Member | — | — |
| Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create teams | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite to a specific team | ✅ | ✅ | ✅ | ❌ | ❌ |
| View members list | ✅ | ✅ | ✅ | ✅ | ✅ |
| View pending invites | ✅ all | ✅ all | ✅ own only | ❌ | ❌ |
| Revoke invites | ✅ any | ✅ any | ✅ own only | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |

**Safety rules that cannot be overridden:**
- The last CEO in a company cannot be removed or demoted
- Only a CEO can assign or change the CEO role
- Admins cannot change or remove the CEO's role
- Managers can only invite Members and Viewers (they cannot invite peers or above)

**Example:**
> Sarah is the CEO of Nova Agency. She promotes Alex to Admin so Alex can manage member onboarding. Priya is a Manager who runs the development project. The rest of the team are Members. A client, Jordan, is added as a Viewer.

---

### 4.3 Role Hierarchy for Invites

When sending a company invite, you can only assign roles at or below your own level:

| Your role | Roles you can invite |
|-----------|---------------------|
| CEO | CEO, Admin, Manager, Member, Viewer |
| Admin | Admin, Manager, Member, Viewer |
| Manager | Member, Viewer |
| Member | (cannot invite) |
| Viewer | (cannot invite) |

---

### 4.4 Project Roles (within a Project)

Within each project, members can have a more granular role that overrides their company/team role for that project:

| Project Role | View | Edit Tasks | Delete Tasks | Manage Project | Export | Comment |
|-------------|------|-----------|-------------|---------------|--------|---------|
| **Project Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Commenter** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Navigate to `/projects/{id}/settings/permissions` to configure project roles.

---

## 5. Team Management (within a Team)

> This section covers the **Team** layer — individual workspaces created by company Admins. For company-level member management, see [Section 6 — Company Admin Dashboard](#6-company-admin-dashboard).

### 5.1 Invite a Member to a Team

1. Go to **Settings → Members**
2. Click **Invite**
3. Enter the email address and select a role:
   - Admin / Manager / Member / Viewer
4. Click **Send invite**

The invitee receives a link to `/accept-invite/{token}`. If they don't have an account yet, they register first, then click the link to join.

**Example:**
```
Email:  jordan@client.com
Role:   Viewer
→ Jordan joins Nova Agency's team with read-only access
```

---

### 5.2 Change a Member's Role

1. **Settings → Members**
2. Find the member, click the **⋯** menu
3. Choose **Change role**
4. Select the new role and confirm

> Only CEO and Admin can do this. Admins cannot change the CEO's role.

---

### 5.3 Remove a Member

1. **Settings → Members**
2. Click **⋯** next to the member → **Remove**
3. Confirm the action

The member loses access immediately. Their past work (tasks, messages) remains.

---

### 5.4 Transfer CEO Ownership

Only the current CEO can do this:

1. **Settings → Members**
2. Find the person to promote
3. **Change role → CEO**
4. Confirm — you become an Admin, they become the new CEO

---

## 6. Company Admin Dashboard

URL: `/company-admin/dashboard`

This dashboard is available to all members of a company. What you can see and do depends on your role.

### 6.1 Overview Tab

Shows the company profile and your permissions:

| Section | What it shows |
|---------|--------------|
| **Company info** | Name, slug, website, industry, size, country, email domain (with verified/unverified badge) |
| **Your permissions** | A card showing which actions your role allows (6 permission flags with ✅/❌) |
| **Stats** | Member count, team count, pending invite count |

---

### 6.2 Members Tab

Visible to: **Member and above**

| Column | Example |
|--------|---------|
| Name | Priya Sharma |
| Email | priya@nova-agency.com |
| Role | Manager |
| Joined | May 1, 2026 |

**Actions (Admin/CEO only):**
- **Change role** — opens a dialog with roles you can assign
- **Remove member** — requires confirmation; member loses access immediately

---

### 6.3 Teams Tab

Visible to: **Member and above**

Lists all teams under the company with member counts and plan.

**Per team (Managers and above):**
- **Invite to team** button — sends a team-level invite to an email address

> Teams are created by company Admins and CEOs. Managers and Members cannot create teams — this is by design to keep team structure under Admin control.

---

### 6.4 Invites Tab

Visible to: **Manager and above**

Shows pending invites and lets you revoke them.

| Column | Notes |
|--------|-------|
| Email | Who the invite was sent to |
| Role | The role they'll receive on accepting |
| Expires | 7 days after send |

**Visibility rules:**
- **Managers** see only the invites they personally sent
- **Admins and CEOs** see all pending invites for the company

**Revoke rules:**
- **Managers** can only revoke their own invites
- **Admins and CEOs** can revoke any invite

---

### 6.5 Invite a Member (Company-Level)

Click the **Invite** button in the dashboard header (visible to Manager and above):

| Field | Notes |
|-------|-------|
| Email | The recipient's email address |
| Role | Limited to roles you can assign (see [Section 4.3](#43-role-hierarchy-for-invites)) |

Click **Send invite**. The recipient gets an email with a link to `/company-invite/{token}` (valid 7 days).

**Example:**
```
Admin Alex invites dana@nova-agency.com as Manager.
Dana receives: "You're invited to join Nova Agency on FlowTeam"
Dana clicks the link → sees company name + role → clicks Accept
→ Dana is added as Manager to Nova Agency
```

---

### 6.6 Accepting a Company Invite

When you receive an invite email:

1. Click the link in the email — it opens `/company-invite/{token}`
2. The page shows: company name, your assigned role, and who invited you
3. **If you're logged in:** Click **Accept invite** — you're added immediately
4. **If you're not logged in:** You're prompted to log in or register first, then the invite is accepted automatically after sign-in

> **Email mismatch:** You must be signed in as the email address the invite was sent to. If you try to accept an invite sent to a different email, you'll see an error.

> **Expired invites:** Invites expire after 7 days. If the link is expired, ask the inviter to re-send.

---

### 6.7 Email Domain Auto-Join

If a company has set and verified an email domain (e.g., `nova-agency.com`), anyone who registers with a matching email (`@nova-agency.com`) is **automatically added as a Member** of that company — no invite required.

This only works for **verified** domains. The Super Admin verifies the domain via a DNS TXT record during company onboarding.

---

### 6.8 New Team (Admin / CEO only)

From the Teams tab, click **New Team**:

| Field | Notes |
|-------|-------|
| Team name | Required |

The team is created under the company. The creating Admin/CEO is automatically added as Team Admin. The company CEO is also added automatically.

---

## 7. Dashboard

URL: `/dashboard`

The dashboard is your daily command center. It shows:

| Section | What it contains |
|---------|-----------------|
| **Welcome banner** | Greeting with your first name |
| **AI Daily Briefing** | AI-generated morning summary (AI plan only) |
| **AI Focus Recommendations** | Ranked list of what to work on next (AI plan only) |
| **My Tasks** | Tasks assigned to you, filterable by priority, project, and state |
| **Projects** | Quick-access cards to your active projects |
| **Activity Feed** | Recent team actions (task moves, comments, completions) |
| **Saved Views** | Your custom filtered task lists |

### My Tasks filters

- **State:** All · Overdue · Due Today · Upcoming
- **Priority:** Urgent · High · Normal · Low
- **Project:** Filter to one project

### Auto-refresh

Toggle the **Auto-refresh** switch in the top-right of the dashboard to poll for updates every 30 seconds.

---

## 8. Projects

### 8.1 Create a Project

1. Go to `/projects`
2. Click **New Project**
3. Fill in the form:

| Field | Example | Notes |
|-------|---------|-------|
| Name | `Website Redesign` | Required, max 255 chars |
| Description | `Full redesign for Q2 launch` | Optional |
| Color | `#6366f1` (indigo) | Hex color, used for task pills on calendar |
| Icon | `🚀` | Emoji, shown in project list |

4. Click **Create project**

**Default columns created automatically:**
- **Backlog** — ideas and unstarted work
- **In Progress** — active work
- **Done** — completed work (marked as the "done" column)

---

### 8.2 Add Custom Columns

Inside a project, click **+ Add column**:

| Field | Example |
|-------|---------|
| Name | `Review` |
| Color | `#f59e0b` |
| Mark as done column | Toggle on only for your final completion column |

Drag columns left/right to reorder them.

---

### 8.3 Project Views

From the project header, switch between:

- **Board** — Kanban drag-and-drop columns
- **Planning** — Sprint planning view
- **Issues** — Flat list of all tasks
- **Operations** — Workload overview by member
- **Reports** — Analytics: velocity, burndown, member stats, project health
- **Timeline** — Gantt-style timeline (tasks with start + due dates)
- **Docs** — Project wiki / notes (Markdown editor)
- **Billing** — Project invoices (print/export to PDF via browser)
- **Settings** — Permissions, labels, issue types

---

### 8.4 Timeline View

URL: `/projects/{id}/timeline`

Shows tasks as bars on a date range (2 weeks, 30/60/90 days). A task appears when it has both `start_date` and `due_date`. Click a bar to open the task detail panel.

---

### 8.5 Project Docs (Wiki)

URL: `/projects/{id}/docs`

Create project-scoped notes and wiki pages:
- Document types: Note / Spec / SOP / Meeting / Decision
- Edit title + content (Markdown)
- Delete documents (managers only)

---

### 8.6 Project Billing (Invoices)

URL: `/projects/{id}/billing`

Create simple invoices per project:
- Draft an invoice with line items
- Save it to the workspace
- Use **Print / PDF** to export via browser's "Save as PDF"

---

### 8.7 Project Reports

Navigate to `/projects/{id}/reports` for:

- **Velocity** — Tasks completed per sprint
- **Burndown** — Work remaining vs. time in current sprint
- **Member stats** — Tasks per team member
- **Project health** — Overdue count, completion rate, at-risk milestones
- **AI Health Score** — 0–100 score with risk factors and recommendations (AI plan only)

---

## 9. Tasks — Full Feature Breakdown

### 9.1 Create a Task

Inside a project, click **+ Add task** under any column, or click **New task** in the top toolbar.

**Core fields:**

| Field | Example | Notes |
|-------|---------|-------|
| Title | `Design hero section` | Required, max 255 chars |
| Description | `Use the new brand colors.` | Optional, supports rich text |
| Issue Type | `Task` | Epic · Story · Task · Bug · Subtask |
| Priority | `High` | Urgent · High · Normal · Low |
| Assignee | `Priya` | One team member |
| Due Date | `2026-05-10` | Date field |
| Labels | `design`, `Q2` | Multiple labels |
| Estimated Hours | `4.5` | Decimal hours |

Click **Create task** to save.

> **AI tip (AI plan):** After typing the task title, click the **✦ Write description** button to auto-generate a description, acceptance criteria, and suggested subtasks.

---

### 9.2 Issue Types

| Type | Use it for |
|------|-----------|
| **Epic** | Large feature that spans multiple sprints |
| **Story** | User-facing feature or improvement |
| **Task** | Standard unit of work |
| **Bug** | Something broken that needs fixing |
| **Subtask** | A step within a parent task |

---

### 9.3 Move Tasks (Kanban)

Drag a task card from one column to another. The task status updates instantly for all team members.

---

### 9.4 Comments

Open a task and scroll to the **Comments** section.

- Type your comment and press **Send**
- Use `@name` to mention a teammate — they get notified
- **Edit** your own comment by clicking the pencil icon
- **Delete** removes the comment (a "deleted" placeholder remains)
- **Reply** to nest responses in a thread

---

### 9.5 Subtasks

Inside a task, click **+ Add subtask**. Each subtask has a checkbox. Progress shows as `2/5 subtasks` on the task card.

---

### 9.6 Attachments

Inside a task, click the **paperclip icon** or drag-and-drop a file:

- Images show inline preview with fullscreen lightbox
- PDFs render in an inline frame
- Videos play inline
- Other files show as a download card
- **Version history** — upload a new version; previous versions are stored

---

### 9.7 Time Tracking

Inside a task, click **Log time**:

| Field | Example |
|-------|---------|
| Minutes | `90` (= 1.5 hours) |
| Date | `2026-05-08` |
| Note | `Initial implementation pass` |

Total logged hours appear on the task and in project reports.

---

### 9.8 Task Dependencies (Links)

Open a task → **Add link**:

| Link type | Meaning |
|-----------|---------|
| **Blocks** | This task must be done before the linked task can start |
| **Blocked by** | This task cannot start until the linked task is done |
| **Duplicates** | This task is a duplicate of the linked task |
| **Relates to** | General relationship, no strict ordering |

---

### 9.9 Approvals

Inside a task, click **Request approval**:

| Field | Example |
|-------|---------|
| Title | `Approve hero section design` |
| Description | `Please review before dev handoff` |
| Required role | `Manager` |

The manager can **Approve** or **Reject** with a decision note (max 300 chars).

---

### 9.10 Watchers

Click **Watch** on any task to subscribe to all updates. To stop watching, click **Unwatch**.

---

### 9.11 Recurring Tasks

Inside a task, click **Set recurrence**:

| Field | Options |
|-------|---------|
| Frequency | Daily · Weekly · Monthly |
| Interval | e.g., `2` = every 2 weeks |
| Assignee | Optional |

When a recurrence fires, a new task is automatically created with the same title and settings.

---

### 9.12 Custom Fields

Project admins can define custom fields per issue type (e.g., "Story Points", "Client", "Browser") in **Project Settings → Issue Types**.

---

## 10. Sprints & Capacity Planning

### 10.1 Create a Sprint

Inside a project, go to the **Planning** view → **New Sprint**:

| Field | Example |
|-------|---------|
| Name | `Sprint 3 — Hero & Nav` |
| Goal | `Complete all homepage above-the-fold work` |
| Start date | `2026-05-11` |
| End date | `2026-05-24` |
| Capacity hours | `80` |

---

### 10.2 Add Tasks to a Sprint

In the Planning view, drag tasks from the backlog into a sprint, or open a task and assign it to a sprint from the task detail panel.

> **AI tip (AI plan):** Click **✦ AI suggest scope** to get recommended tasks based on estimates, priorities, and capacity.

---

### 10.3 Capacity Planning per Member

Inside a sprint, click **Capacity** to set per-person availability in hours.

---

### 10.4 Sprint Burndown

Go to **Project → Reports → Burndown** while a sprint is active to see ideal vs. actual remaining work.

---

### 10.5 Sprint Retrospective (AI plan)

When a sprint is completed, click **✦ Generate retrospective** for an AI-generated summary of what went well, what didn't, and action items.

---

## 11. Milestones

### Create a Milestone

In a project, click **+ Milestone**:

| Field | Example |
|-------|---------|
| Name | `Public Beta Launch` |
| Description | `All core features shipped and tested` |
| Due date | `2026-06-01` |
| Status | `Planned` → `At risk` → `Completed` |

Milestones appear in the Calendar and project Reports.

---

## 12. Messages — Real-Time Chat

URL: `/messages`

### 12.1 Channel Types

| Type | Who can see it |
|------|---------------|
| **Public channel** (#) | All team members |
| **Private channel** (🔒) | Invited members only |
| **Direct Message** (👤) | You and one other person |

---

### 12.2 Create a Channel

Click **+** → **New channel**:

| Field | Example |
|-------|---------|
| Channel name | `engineering-updates` |
| Display name | `Engineering Updates` |
| Description | `Daily dev standups` |
| Private | Toggle for private |

---

### 12.3 Send a Message

Press **Enter** to send. Press **Shift+Enter** for a new line. Type `@name` to mention someone.

---

### 12.4 Message Actions

Hover over any message to reveal the action toolbar:

| Action | How |
|--------|-----|
| **React** | Pick an emoji |
| **Reply in thread** | Opens thread panel |
| **Edit** | Edit your own message |
| **Delete** | Removes your message |
| **More (⋯)** | Mark unread, Save, Pin, Copy link, Quote reply, Forward, Edit history |

---

### 12.5 Threads

Click the reply icon on any message to open a thread. The parent message shows a **"N replies"** count.

---

### 12.6 Scheduled Messages

Click the **clock icon** in the composer → set date and time → **Schedule**.

---

### 12.7 Pins & Saved Messages

- **Pins** — channel-wide; click **Pins** in the channel header
- **Saved** — personal bookmarks; click **Saved** in the channel header

---

### 12.8 Mute a Channel

Right-click a channel (or click ⋯) → **Mute** for 1 hour or indefinitely.

---

### 12.9 Notification Preferences per Channel

Click the **bell icon** in the channel header: **All messages** / **Mentions only** / **Mute**.

---

### 12.10 Sidebar Filters

- **Unread** — channels with unread messages only
- **Muted** toggle — show/hide muted channels
- **Ctrl+K** — jump to channel search

---

### 12.11 Search within Messages

Use the **Search** icon in the channel header. Filter by sender, date from, date to. Save as **presets**.

---

### 12.12 Channel Catch-Me-Up (AI plan)

Click **✦ Catch me up** in the channel header. AI summarises the last 48 hours of messages into decisions, blockers, action items, and open questions.

---

### 12.13 Rich Link Embeds (Figma / Google Drive / Miro)

Paste supported links into a message or task description to get an inline preview:

- **Figma** (`figma.com`)
- **Google Drive / Docs / Sheets / Slides** (`drive.google.com`, `docs.google.com`)
- **Miro** (`miro.com`)

---

## 13. Meetings

URL: `/meetings`

### 13.1 Meeting Types

| Type | Use case |
|------|---------|
| **Instant** | Start a call right now |
| **Scheduled** | Plan a future meeting |

### 13.2 Create an Instant Meeting

1. `/meetings` → **New Meeting** → **Instant**
2. Enter title, call type (audio/video), optional attendees
3. Click **Create** → meeting room opens immediately

---

### 13.3 Schedule a Meeting

1. `/meetings` → **New Meeting** → **Schedule**
2. Fill in title, description, start time, duration, call type, attendees
3. Click **Schedule** — appears on everyone's Calendar

---

### 13.4 Meeting Statuses

| Status | Meaning |
|--------|---------|
| **Scheduled** | Upcoming |
| **Active** | In progress |
| **Ended** | Finished |
| **Cancelled** | Cancelled |

---

### 13.5 Meeting Channel

Every meeting auto-creates a private messaging channel (`mtg-{id}`) for sharing links and notes during/after the call.

---

### 13.6 Meeting Action Items (AI plan)

After a meeting, paste notes into the **✦ Extract action items** panel. AI extracts decisions, action items (with assignee hints), and open questions. Click **Create tasks** to turn them into real tasks.

---

### 13.7 Meeting Recordings + AI Transcript

Inside an active call, click **Record** (red dot) to record audio.

After stopping:
1. Audio is uploaded to the meeting
2. A background job transcribes it and generates action items + summary
3. A system message is posted into the meeting channel with the results

Open the meeting page → **Recordings** card to see playback, status, AI summary, and full transcript.

> Transcription requires `OPENAI_API_KEY` in the backend environment.

---

## 14. Calendar

URL: `/calendar`

### 14.1 Views

| View | Shows |
|------|-------|
| **Month** | Full month grid |
| **Week** | 7-day timeline with time slots |
| **List** | Chronological list of upcoming events |

---

### 14.2 What Appears on the Calendar

- **Task due dates** — colored pills (color = project color)
- **Scheduled meetings** — video camera icon
- **External calendar events** — green items (when connected)

---

### 14.3 Drag and Drop to Reschedule

Drag a task pill or meeting to a new date. Changes save instantly.

---

### 14.4 External Calendar Events (Google / Outlook)

1. **Settings → Integrations → Calendar Sync**
2. Connect **Google Calendar** or **Outlook**
3. Toggle **Show events** for that provider
4. In `/calendar`, open **Calendar filters** → **Show external events**

External events are read-only in FlowTeam.

---

### 14.5 Agenda Panel

The right panel for the selected date shows:
- **Meetings** — with start time and duration
- **Tasks due** — with project name and priority badge

---

### 14.6 Filters

| Filter | Options |
|--------|---------|
| Search | Free text |
| Project | Filter to one project |
| Priority | Urgent · High · Normal · Low |
| Meeting status | All · Scheduled · Active · Ended · Cancelled |
| Mine only | Toggle |
| Show tasks / meetings | Toggle on/off |

---

## 15. Search

### 15.1 Open Global Search

Press **Ctrl+K** or click **Search** in the toolbar.

### 15.2 What it searches

| Category | What matches |
|----------|-------------|
| **Tasks** | Task title, project name |
| **Projects** | Project name |
| **Members** | Full name, email address |
| **Messages** | Message text (with snippets) |
| **Channels** | Channel name |

Min 2 characters · 300ms debounce · 30 requests / 60 seconds rate limit.

---

## 16. Notifications

### 16.1 Notification Bell

The **bell icon** in the toolbar shows unread count. Click **Mark all read** to clear.

---

### 16.2 Notification Types

| Type | Triggered when |
|------|---------------|
| `task_assigned` | A task is assigned to you |
| `task_due` | Due date approaching |
| `task_overdue` | Past due date |
| `task_watched` | A watched task is updated |
| `task_moved` | A watched task moves columns |
| `task_completed` | A watched task is done |
| `approval_requested` | Someone requests your approval |
| `approval_decided` | Your approval request is decided |
| `mentioned_message` | @mentioned in a message |
| `mentioned_comment` | @mentioned in a task comment |
| `automation_notice` | An automation rule fired |
| `invite_accepted` | A member accepted your invite |

---

### 16.3 Notification Preferences

**Settings → Notifications** — toggle individual types, email notifications, due date reminders, overdue digest, watch notifications, approval notifications, and browser push notifications.

---

## 17. Settings

URL: `/settings`

### 17.1 Profile

| Field | Notes |
|-------|-------|
| Full name | Editable |
| Email | Display only |
| Avatar | Upload image |
| Timezone | Select from list |

---

### 17.2 Members Tab

View all team members, invite new members, change roles, remove members. See [Team Management](#5-team-management-within-a-team).

---

### 17.3 Push Notifications

**Settings → Notifications → Browser push** — toggle on to receive FlowTeam notifications even when the app is not the active tab.

---

### 17.4 Slack Webhooks

**Settings → Integrations → Slack Webhooks → Add webhook:**

| Field | Example |
|-------|---------|
| Name | `Nova Alerts` |
| Webhook URL | `https://hooks.slack.com/services/...` |
| Enabled | Toggle on |

---

### 17.5 Calendar Sync (Google / Outlook)

**Settings → Integrations → Calendar Sync** — connect Google Calendar or Outlook to show external events in FlowTeam's Calendar.

---

### 17.6 GitHub Integration (per project)

1. Open a project → **Settings → Permissions**
2. Click **Connect GitHub** → OAuth consent → authorise FlowTeam
3. Enter the repository in `owner/repo` format → click **Save**

FlowTeam registers a webhook for `pull_request` and `push` events. When a PR title/body contains `#42` or `#PROJ-42`, it links to that task.

---

### 17.7 GitLab + Bitbucket Integrations

Same as GitHub setup:
1. **Connect GitLab** or **Connect Bitbucket** in project settings
2. After OAuth, set the repository identifier:
   - GitLab: `group/subgroup/repo`
   - Bitbucket: workspace + repo-slug

---

### 17.8 AI Settings (AI plan)

**Settings → AI** (CEO and Admin only)

| Control | Description |
|---------|-------------|
| **AI Features toggle** | Enable/disable all AI features for the workspace |
| **Feature grid** | Shows all AI features and their state |

---

## 18. Two-Factor Authentication (2FA)

### 18.1 Enable 2FA

1. **Settings → Security → Set up 2FA**
2. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password)
3. Enter the 6-digit code to confirm
4. Click **Enable**
5. **Save your 10 backup codes** somewhere safe

---

### 18.2 Sign In with 2FA

1. Enter email and password
2. When prompted, enter the **6-digit code** from your authenticator app
3. Or enter a **backup code** (one-time use)

---

### 18.3 Rotate Backup Codes

**Settings → Security → Rotate backup codes** → enter current OTP → new set of 10 codes generated.

---

### 18.4 Disable 2FA

**Settings → Security → Disable 2FA** → enter OTP or backup code.

---

## 19. Web Push Notifications

### 19.1 Enable Push

1. **Settings → Notifications → Browser push** → toggle on
2. Click **Allow** when your browser asks for permission

---

### 19.2 What Triggers a Push

| Event | Example push message |
|-------|---------------------|
| Task assigned | "Design hero section assigned to you" |
| @mention | "Alex mentioned you in #engineering" |
| Approval requested | "Approval needed: Hero section sign-off" |
| Task overdue | "API integration is overdue by 1 day" |
| Watched task moved | "QA sign-off moved to Done" |

---

### 19.3 Clicking a Push Notification

Opens FlowTeam and navigates directly to the relevant task, message, or meeting.

---

### 19.4 Disable Push

**Settings → Notifications → Browser push** → toggle off. Subscription is removed from the server immediately.

---

### 19.5 Multiple Devices

Each browser/device registers separately. Enable push on each device you want to receive notifications on.

---

## 20. Audit Log

URL: `/settings/audit`  
**Who can access:** CEO and Admin only.

Immutable record of every significant action in the workspace.

### 20.1 What is logged

| Action | Example |
|--------|---------|
| `create` | New project created |
| `update` | Task priority changed |
| `delete` | Member removed |
| `permission_change` | Role changed |
| `approval_change` | Approval approved or rejected |
| `automation_trigger` | Automation rule fired |
| `export` | Project exported to CSV |
| `login` / `logout` | User session |
| `invite_sent` | Invite emailed |
| `invite_accepted` | New member joined |
| `oauth_login` | Signed in via Google |

### 20.2 Each log entry shows

- **Who** — actor's name and avatar
- **What** — action type and description
- **Object** — which record was affected
- **Changes** — field-level diff (old → new)
- **When** — exact timestamp
- **IP address** and **User agent**

Logs are retained for **365 days** (configurable per company by Super Admin).

---

## 21. Export

### 21.1 How to Export

1. Open a project
2. Click **⋯ → Export**
3. Choose format: **CSV**, **Excel (XLSX)**, or **PDF**
4. File downloads immediately

**File name:** `{ProjectName}_tasks.{format}`

### 21.2 What is exported

Title, Column, Priority, Assignee, Reporter, Due Date, Completed, Labels, Subtasks, Hours Logged, Created At.

Export is rate-limited to **5 per 60 seconds** and recorded in the audit log.

---

## 22. Client Portal

### 22.1 Create a Link

1. Project → **Settings → Client Portal → Create access link**
2. Set display name and allowed columns/documents
3. Copy the URL: `/client-portal/{token}`

### 22.2 What the Client Sees

Tasks filtered to allowed columns, whitelisted documents — read-only.

### 22.3 AI Client Report (AI plan)

Inside Client Portal settings, click **✦ Generate report** for a client-ready plain-English progress report.

### 22.4 Revoke Access

**Settings → Client Portal → Revoke** — invalidates the link immediately.

---

## 23. Automation Rules

### 23.1 Create a Rule

Project → **Settings → Automations → New Rule**:

| Field | Options |
|-------|---------|
| **Trigger** | Task moved to Done · Task overdue · Approval requested |
| **Conditions** | Priority = Urgent · Assignee is empty · etc. |
| **Action** | Assign user · Change priority · Add label · Post to Slack · Create related task |

---

### 23.2 AI Automation Builder (AI plan)

Type a rule in plain English in the **✦ Describe a rule** box:

```
"When an urgent bug is created, assign it to Alex and post to #incidents"
```

AI generates the trigger, conditions, and actions automatically. Review and click **Save**.

---

### 23.3 Automation Notifications

When an automation fires, subscribed members get an in-app `automation_notice` notification. All triggers are recorded in the audit log.

---

## 24. AI Features (AI Plan)

AI features are powered by Claude (Anthropic). Available on the **AI plan** only. Enable in **Settings → AI** (CEO or Admin).

---

### 24.1 AI Feature Overview

| Feature | Where to find it |
|---------|-----------------|
| Daily Briefing | Dashboard top card |
| Focus Recommendations | Dashboard second card |
| Auto Task Description | Task create dialog |
| Auto Label & Triage | Task create dialog |
| Task Summarizer | Task detail panel header |
| Channel Catch-Me-Up | Channel header |
| Sprint AI Planner | Sprint planning view |
| Sprint Retrospective | Completed sprint card |
| Workload Balancer | Sprint capacity panel |
| Project Health Score | Project Reports page |
| Weekly Status Report | Project ⋯ menu |
| Client Report Generator | Client Portal settings |
| Meeting Action Items | Meeting channel |
| AI Automation Builder | Settings → Automations |

---

### 24.2 Daily Briefing

Every time you open the dashboard, shows: overdue tasks, tasks due today, today's meetings, and a recommended focus.

Results cached for **12 hours** per user. Click **Refresh** to regenerate.

---

### 24.3 Focus Recommendations

Ranked list of up to 6 tasks to work on next, with urgency level and reason.

---

### 24.4 Auto Task Description

After typing a task title, click **✦ Write description** to auto-generate:
- Description (2–3 sentences)
- Acceptance criteria
- Suggested subtasks

---

### 24.5 Auto Label & Triage

When creating a task, AI suggests labels, issue type, and priority. Accept, modify, or ignore.

---

### 24.6 Task Summarizer

Open a task → **✦ Summarize** — condenses the entire task history into a short paragraph.

---

### 24.7 Channel Catch-Me-Up

**✦ Catch me up** in channel header — summarises last 48 hours into decisions, blockers, action items, and open questions.

---

### 24.8 Sprint AI Planner

**✦ AI suggest scope** in sprint planning — recommends tasks based on estimates, priorities, and capacity.

---

### 24.9 Sprint Retrospective Generator

**✦ Generate retrospective** on completed sprint card — structured Went Well / Didn't Go Well / Action Items.

---

### 24.10 Workload Balancer

**✦ Balance workload** in sprint capacity panel — detects overloaded members and suggests specific task reassignments with Accept/Dismiss buttons.

---

### 24.11 Project Health Score

Project Reports → Health Score card — scores project 0–100 (Healthy / Watch / At Risk) with risk factors and recommendations.

---

### 24.12 Weekly Status Report

Project **⋯** menu → **✦ Generate weekly report** — structured completed / in-progress / at-risk report.

---

### 24.13 AI Rate Limits & Fallbacks

If the AI service is unavailable, a deterministic fallback result is shown based on actual data.

| Limit | Value |
|-------|-------|
| Daily briefing cache | 12 hours per user |
| Health score cache | 24 hours per project |
| Model used | Claude Sonnet (claude-sonnet-4-6) |

---

## 25. Super Admin

URL: `/super-admin/dashboard`  
Accessible only to users with `is_superuser = true`. This is for the **platform operator**, not a regular team admin.

---

### 25.1 Platform Stats

| Metric | Description |
|--------|-------------|
| Total users | All registered users across all companies |
| Total teams | All workspaces |
| Total projects | All projects |
| Total tasks | All tasks |
| Total messages | All messages sent |
| New users (7d / 30d) | Signups in the last 7 and 30 days |
| Task activity (7d) | Tasks created/updated in last 7 days |
| Messages (7d) | Messages sent in last 7 days |

---

### 25.2 User Management

Super admins can:
- List all users with search by name/email
- Create a new user (email, name, password, timezone, role flags)
- Set `is_active`, `is_staff`, `is_superuser` flags
- Edit or deactivate any user
- Bulk delete selected users

---

### 25.3 Company Management

The **Company Management** panel is the core of the Super Admin dashboard. It provides a full drill-down view of all companies on the platform.

#### Status Filter Chips

Four chips at the top of the panel let you filter the company list by status:

| Chip | Shows |
|------|-------|
| **All** | Every company (default) |
| **Active** | Companies with `onboarding_status = active` |
| **Onboarding** | Companies currently in progress (`in_progress`) |
| **Pending** | Companies not yet started (`pending`) |

Each chip shows its count. The active chip is highlighted. Click any chip to filter; combine with the search box to narrow further. Click **Clear filters** to reset.

---

#### Company Cards

Each company appears as a card with:

- **Status accent** — a colored left border: green = active, blue = in progress, amber = pending, red = suspended
- **Status badge** — dot indicator with the status label (the "In Progress" dot pulses)
- **Logo / icon** — company logo if set, otherwise a building icon tinted by status
- **Company name** and **slug**
- **Email domain** with a verified shield icon if domain is verified
- **CEO box** — amber background when a CEO is assigned; shows name and email. Muted when no CEO assigned
- **Stats** — team count, member count, pending invite count
- **Dropdown menu** (⋯) — View Details, Edit/Onboard, Mark Active, Suspend, Delete

Click the **View teams & members** footer to drill into the company detail view.

---

#### Company Detail View

Clicking a company opens a two-panel detail view:

**Left panel — Company info:**
- Company name, slug, logo
- Status badge
- CEO info (amber section)
- Website, industry, size, country, created date
- Email domain with Verified/Unverified badge
- Action buttons:
  - **Edit / continue onboarding** — reopens the wizard
  - **Company settings** — opens the settings dialog
  - **Mark Active** (green) — promotes status to active
  - **Suspend** (red) — suspends the company

**Right panel — Teams:**
- Lists all teams under the company
- Each row shows team name, member count, plan
- Click a row or the chevron to drill into **Team Members**
- Empty state says "Teams are created by the company Admin via the company dashboard"

---

#### Team Members View

Drill-down view showing all members of a specific team:

| Column | Example |
|--------|---------|
| Avatar | Role-colored initial |
| Name | Priya Sharma |
| Email | priya@nova-agency.com |
| Role badge | Manager (blue) |
| Joined | May 1, 2026 |

Read-only — the Super Admin cannot change roles here. Role changes happen via Company Member management endpoints or the company dashboard.

---

### 25.4 Company Onboarding Wizard (5-Step)

The Super Admin creates and onboards companies through a 5-step wizard. For new companies, all steps are submitted atomically on "Launch Company". For existing companies, each step saves immediately.

**How to open:**
- Click **Onboard Company** (new)
- Click **Edit / Onboard** from a company card or detail view (resume/edit)

---

#### Step 1 — Company Details

| Field | Example | Notes |
|-------|---------|-------|
| Company name | `Nova Agency` | Required |
| Website | `https://nova-agency.com` | Optional |
| Country | `United States` | Free text |
| Industry | `Consulting` | Dropdown: Technology, Finance, Healthcare, Education, Retail, Manufacturing, Media & Entertainment, Consulting, Real Estate, Other |
| Company size | `11-50` | Dropdown: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+ |
| Internal notes | `Referred by partner` | Super-admin only; not shown to company members |

---

#### Step 2 — CEO Assignment

Choose one of two modes:

**Mode A — Select existing user**
- Search by name or email
- Pick from results
- The user is immediately assigned as CEO with a `CompanyMember` CEO role

**Mode B — Invite new user**
- Enter a CEO email address
- An invite email is sent: *"You've been invited to lead {company} on FlowTeam"*
- The invite link is `/company-invite/{token}` (valid 7 days)
- Until accepted, the CEO slot shows the invited email

> If no CEO is assigned now, one can be added later by re-opening the wizard or editing the company.

---

#### Step 3 — Teams Setup

Two actions:

**Create new teams:**
- Type a team name → click **Add** → it appears in the list
- Add multiple teams in this step
- Each team created here is assigned to this company immediately

**Assign existing teams:**
- Teams already on the platform that have no company can be linked here
- Check the teams to assign
- Teams already linked to this company are shown as "Already linked"

> After launch, new teams must be created by company Admins from the Company Admin dashboard — not from the Super Admin.

---

#### Step 4 — Email Domain

| Field | Notes |
|-------|-------|
| Enable email domain toggle | Off by default — skip this step if not needed |
| Company email domain | e.g., `nova-agency.com` (without @) |

**How domain verification works:**
1. Click **Get DNS instructions** — FlowTeam generates a verification token
2. Add a DNS TXT record to your domain: `flowteam-verification={token}`
3. Click **I've added the DNS record — verify now**
4. Once verified, the domain shows a **Verified ✓** badge

**What verified domain auto-join does:**
- Any user who registers with `@nova-agency.com` email is automatically added as a **Member** of this company
- No invite required for matching-domain registrations
- This only works for **verified** domains; unverified domains do not trigger auto-join

---

#### Step 5 — Review & Launch

Shows a summary of everything configured:

| Section | Shows |
|---------|-------|
| **Company** | Name, website, industry, size, country |
| **CEO** | Selected user or invite email; status (Active / Invite pending) |
| **Teams** | Teams to create and teams to assign |
| **Email Domain** | Domain and verification status |

Click **Launch Company** to:
1. Create the company record (if new)
2. Submit all 5 steps sequentially
3. Set `onboarding_status = active`
4. Send any pending CEO invite emails
5. Create all teams and link them to the company

If resuming an existing company, clicking **Launch Company** submits only the remaining steps.

> **Progress bar:** Steps you've already passed show a green checkmark. You can click back to a completed step to review or edit it.

---

### 25.5 Company Settings Dialog

Click **Settings** (gear icon) in the Company Detail View to open the per-company settings dialog.

| Setting | Default | Notes |
|---------|---------|-------|
| **AI Features** | Off | Enable AI features for all members of this company |
| **Notifications** | On | Enable in-app and email notifications |
| **Default Team Plan** | Free | New teams created under this company use this plan (Free / Pro / AI) |
| **Max Members** | Unlimited | Leave blank for unlimited; set a number to cap membership |
| **Audit Log Retention (days)** | 365 | Minimum 30 days |

Click **Save Settings** to apply.

---

## 26. Plan Limits

| Limit | Free Plan | Pro Plan | AI Plan |
|-------|-----------|----------|---------|
| Team members (including pending invites) | **5** | **50** | **50** |
| Active projects | **3** | **100** | **100** |
| AI features | ❌ | ❌ | ✅ |

If you hit a limit:
- **"Team member limit reached"** → remove a member or pending invite, or upgrade
- **"Project limit reached"** → archive an existing project, or upgrade
- **"AI features require an AI-enabled plan"** → upgrade to AI plan in Settings → AI

### 26.1 Upgrading (Stripe billing — for operators)

Backend endpoints:
- Create checkout session: `POST /api/billing/teams/<team_id>/checkout/`
- Stripe webhook: `POST /api/billing/stripe/webhook/`

Required backend env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_AI`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_BASE_URL`, `ANTHROPIC_API_KEY`

---

## 27. Quick Reference — Field Limits

| Feature | Field | Limit |
|---------|-------|-------|
| Registration | Password | Min 8 characters |
| Registration | Full name | Min 2 characters |
| Team | Name | Max 255 characters |
| Onboarding | Invites at once | 5 email fields |
| Project | Name | Max 255 characters |
| Project | Color | Hex format (#RRGGBB) |
| Column | Name | Max 100 characters |
| Task | Title | Max 255 characters |
| Task | Priority | urgent / high / normal / low |
| Task | Issue type | epic / story / task / bug / subtask |
| Task | Estimated hours | Decimal (e.g. 4.5) |
| Sprint | Name | Max 150 characters |
| Sprint | Capacity | Decimal hours |
| Milestone | Name | Max 150 characters |
| Meeting | Title | Max 140 characters |
| Meeting | Duration | Minutes (default 30) |
| Meeting | Call type | audio / video |
| Approval | Title | Max 200 characters |
| Approval | Decision note | Max 300 characters |
| Recurring task | Frequency | daily / weekly / monthly |
| Time log | Note | Max 200 characters |
| Slack webhook | Name | Max 120 characters |
| Client portal | Display name | Max 120 characters |
| Company | Name | Max 255 characters |
| Company | Industry | technology / finance / healthcare / education / retail / manufacturing / media / consulting / real_estate / other |
| Company | Size | 1-10 / 11-50 / 51-200 / 201-500 / 501-1000 / 1000+ |
| Company | Onboarding status | pending / in_progress / active / suspended |
| Company | Notes | Internal (super-admin only) |
| Company invite | Expiry | 7 days |
| Company invite | Status | pending / accepted / expired |
| Company role | Levels | CEO / Admin / Manager / Member / Viewer |
| Search | Minimum query | 2 characters |
| Search | Rate limit | 30 requests / 60 seconds |
| Export | Rate limit | 5 exports / 60 seconds |
| 2FA backup codes | Count | 10 codes (one-time use each) |
| Audit log | Retention | 365 days (configurable per company, min 30) |
| Free plan | Members | 5 |
| Free plan | Projects | 3 |
| Pro plan | Members | 50 |
| Pro plan | Projects | 100 |
| AI plan | Members | 50 |
| AI plan | Projects | 100 |
| AI briefing cache | TTL | 12 hours per user |
| AI health score cache | TTL | 24 hours per project |
| AI model | Version | Claude Sonnet (claude-sonnet-4-6) |
| Push subscription | Storage | One row per browser/device per user |
| Google OAuth | Scope | openid email profile |
| GitHub OAuth | Scope | repo |
| GitLab OAuth | Scope | api read_api |
| Bitbucket OAuth | Scope | pullrequest repository |
| Google Calendar Sync | Scope | calendar.events.readonly |
| Microsoft Calendar Sync | Scope | Calendars.Read (offline_access) |
| GitHub webhook events | Types | pull_request, push |
| GitHub task reference | Format | #42 or #PROJ-42 in PR title/body |
| Meeting transcript | Provider | OpenAI audio transcriptions (`OPENAI_API_KEY`) |

---

## Appendix A — Production Integrations

### A.1 Transactional Email (Resend / SendGrid / SMTP)

Invite emails and notification digests require an email provider.

Backend env vars:
- `EMAIL_PROVIDER` = `django` | `resend` | `sendgrid`
- `DEFAULT_FROM_EMAIL`
- `FRONTEND_BASE_URL` (used for invite links)
- If `django`: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`
- If `resend`: `RESEND_API_KEY`
- If `sendgrid`: `SENDGRID_API_KEY`

### A.2 Cloud File Storage (S3 / Cloudflare R2)

Backend env vars:
- `USE_S3_STORAGE=True`
- `AWS_STORAGE_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Optional: `AWS_S3_ENDPOINT_URL`, `AWS_S3_REGION_NAME`

### A.3 CSV Import

`POST /api/projects/<project_id>/import/csv/` (multipart form with `file`)

Supported headers: `title` (required), `description`, `column`, `assignee_email`, `due_date` (YYYY-MM-DD), `priority`, `issue_type`

### A.4 AI (Anthropic Claude)

- Backend env var: `ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-6` (prompt caching enabled on all system prompts)
- Heavy workloads pre-computed via Celery and served from Redis cache

### A.5 Browser Push Notifications (VAPID)

Backend env vars:
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`

Generate a VAPID key pair:
```bash
python -c "from pywebpush import Vapid; v=Vapid(); v.generate_keys(); print(v.public_key, v.private_key)"
```

### A.6 OAuth + Integrations

**Google OAuth (sign-in)**  
Backend env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**GitHub OAuth (per-project)**  
Backend env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, `GITHUB_WEBHOOK_SECRET`

**GitLab OAuth (per-project)**  
Backend env vars: `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, `GITLAB_REDIRECT_URI`, `GITLAB_WEBHOOK_SECRET`

**Bitbucket OAuth (per-project)**  
Backend env vars: `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET`, `BITBUCKET_REDIRECT_URI`

**Calendar Sync (Google / Outlook)**  
Backend env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`

**Meeting transcript**  
Backend env vars: `OPENAI_API_KEY`, optional `OPENAI_TRANSCRIBE_MODEL` (default: `gpt-4o-mini-transcribe`)

---

*End of FlowTeam User Guide — Version 2.3*
