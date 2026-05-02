# FlowTeam — Complete User Guide

**Version:** 2.2  
**Covers:** All features end-to-end with real examples, including AI features, Web Push Notifications, OAuth (Google Login + GitHub/GitLab/Bitbucket), Calendar external events, Rich Link Embeds, Project Timeline/Docs/Billing, and Meeting Recordings + AI transcripts

---

## Table of Contents

1. [What is FlowTeam?](#1-what-is-flowteam)
2. [Getting Started — Register & Sign In](#2-getting-started--register--sign-in)
3. [Onboarding — Create Your Workspace](#3-onboarding--create-your-workspace)
4. [Roles & Permissions](#4-roles--permissions)
5. [Team Management](#5-team-management)
6. [Dashboard](#6-dashboard)
7. [Projects](#7-projects)
8. [Tasks — Full Feature Breakdown](#8-tasks--full-feature-breakdown)
9. [Sprints & Capacity Planning](#9-sprints--capacity-planning)
10. [Milestones](#10-milestones)
11. [Messages — Real-Time Chat](#11-messages--real-time-chat)
12. [Meetings](#12-meetings)
13. [Calendar](#13-calendar)
14. [Search](#14-search)
15. [Notifications](#15-notifications)
16. [Settings](#16-settings)
17. [Two-Factor Authentication (2FA)](#17-two-factor-authentication-2fa)
18. [Web Push Notifications](#18-web-push-notifications)
19. [Audit Log](#19-audit-log)
20. [Export](#20-export)
21. [Client Portal](#21-client-portal)
22. [Automation Rules](#22-automation-rules)
23. [AI Features (AI Plan)](#23-ai-features-ai-plan)
24. [Super Admin](#24-super-admin)
25. [Plan Limits](#25-plan-limits)
26. [Quick Reference — Field Limits](#26-quick-reference--field-limits)

**New in Version 2.2:** Project Timeline/Docs/Billing pages · GitLab + Bitbucket integrations · Calendar external events (Google/Outlook) · Rich embeds (Figma/Google Drive/Miro) in tasks + chat · Meeting recordings upload + AI transcripts/action items (requires `OPENAI_API_KEY`)

---

## 1. What is FlowTeam?

FlowTeam is an all-in-one team workspace that combines:

- **Project management** — Kanban boards, sprints, milestones, task dependencies
- **Real-time messaging** — channels, direct messages, threads, reactions
- **Meetings & calls** — instant audio/video calls and scheduled meetings
- **Calendar** — task due dates and meetings in one view
- **Team security** — role-based access control, 2FA, full audit log
- **AI assistant** — daily briefings, auto task descriptions, sprint planning, health scores, and more (AI plan)
- **OAuth sign-in** — Continue with Google for one-click registration and login
- **Browser push notifications** — real-time alerts even when FlowTeam is not the active tab
- **GitHub integration** — link pull requests to tasks automatically per project

Everything lives in one place. You do not need Slack + Jira + Zoom separately.

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

---

### 2.2 Sign In

Open `http://localhost:3000/login`

**Option A — Email and password**

Enter your email and password. If your account has 2FA enabled, you will be prompted for a 6-digit code from your authenticator app (or a backup code).

**Option B — Continue with Google**

Click the **Continue with Google** button at the top of the login form. You are redirected to Google's sign-in page. After approving access, FlowTeam receives your name and email, creates or links your account automatically, and signs you in — no password needed.

- If no FlowTeam account exists for your Google email, one is created automatically with email pre-verified
- If a password account already exists with the same email, your Google identity is linked to it and you can use either method going forward

---

### 2.3 Register with Google

You can also register from scratch using Google:

1. On the register page, or on the login page, click **Continue with Google**
2. Google asks for consent once — approve it
3. FlowTeam creates your account and takes you directly to onboarding

No email verification step is needed — Google already confirmed your email.

---

### 2.4 Password Reset

1. On the login page click **Forgot password?**
2. Enter your email address
3. Check your inbox for a reset link
4. Click the link and enter a new password (min 8 characters)

> **Note:** If you signed up with Google and have no password set, use **Continue with Google** to sign in — the password reset flow requires an existing password.

---

## 3. Onboarding — Create Your Workspace

After registering, you land on `/onboarding`. This runs once per account.

### Step 1 — Create Your Team

Enter a **Team Name**. A URL-friendly slug is generated automatically.

```
Team name: Nova Agency
Slug:      nova-agency   ← auto-generated, shown as preview
```

Click **Create team** to continue.

### Step 2 — Invite Teammates

You can enter up to **5 email addresses** to invite immediately. Each gets a role of **Member** by default.

```
Teammate 1: alex@nova-agency.com
Teammate 2: priya@nova-agency.com
Teammate 3: (leave blank)
```

Click **Send invites** — or **Skip** if you want to invite people later from Settings.

> **What gets created:** Your team workspace, your CEO account (you are the owner), and invite records for each email you entered.

---

## 4. Roles & Permissions

FlowTeam uses two layers of permissions: **Team roles** and **Project roles**.

---

### 4.1 Team Roles

Every team member has one of five roles:

| Role | Who it's for |
|------|-------------|
| **CEO** | The workspace owner. Full control over everything. |
| **Admin** | Operations lead. Manages team, members, and settings. |
| **Manager** | Team lead. Invites members, creates and runs projects. |
| **Member** | Day-to-day contributor. Creates and works on tasks. |
| **Viewer** | Client or external observer. Read-only. |

#### What each role can do

| Action | CEO | Admin | Manager | Member | Viewer |
|--------|-----|-------|---------|--------|--------|
| Manage team settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite new members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete the team | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ | ❌ | ❌ |
| Enable/disable AI | ✅ | ✅ | ❌ | ❌ | ❌ |

**Safety rules that cannot be overridden:**
- You cannot remove the last CEO from the team
- You cannot demote yourself if you are the last CEO
- Only a CEO can promote someone else to CEO
- Admins cannot change or remove the CEO

**Example:**
> Sarah is the CEO of Nova Agency. She promotes Alex to Admin so Alex can manage member onboarding. Priya is a Manager who runs the development project. The rest of the team are Members. A client, Jordan, is added as a Viewer.

---

### 4.2 Project Roles

Within each project, members can have a more granular role that overrides their team role for that project:

| Project Role | View | Edit Tasks | Delete Tasks | Manage Project | Export | Comment |
|-------------|------|-----------|-------------|---------------|--------|---------|
| **Project Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Commenter** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Navigate to `/projects/{id}/settings/permissions` to configure project roles.

---

## 5. Team Management

### 5.1 Invite a Member by Email

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
→ Jordan joins Nova Agency with read-only access
```

---

### 5.2 Change a Member's Role

1. **Settings → Members**
2. Find the member, click the **⋯ (three dots)** menu
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

## 6. Dashboard

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

**Example use:**
> Every morning, Sarah opens the dashboard. The AI Daily Briefing tells her she has 2 overdue tasks and a meeting at 2 PM. The Focus Recommendation tells her to finish "API integration" first because it is blocking 3 other tasks.

---

## 7. Projects

### 7.1 Create a Project

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
- **Done** — completed work (this column is marked as the "done" column)

---

### 7.2 Add Custom Columns

Inside a project, click **+ Add column**:

| Field | Example |
|-------|---------|
| Name | `Review` |
| Color | `#f59e0b` |
| Mark as done column | Toggle on only for your final completion column |

Drag columns left/right to reorder them.

**Example board for Nova Agency's Website Redesign project:**
```
Backlog → In Progress → Design Review → Dev Review → Done
```

---

### 7.3 Project Views

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

### 7.5 Timeline View

URL: `/projects/{id}/timeline`

The Timeline view shows tasks as bars on a date range (2 weeks, 30/60/90 days). A task appears on the timeline when it has:
- `start_date`
- `due_date`

Click a bar to open the task detail panel.

---

### 7.6 Project Docs (Wiki)

URL: `/projects/{id}/docs`

Docs are project-scoped notes and wiki pages. You can:
- Create documents (Note/Spec/SOP/Meeting/Decision)
- Edit title + content (Markdown)
- Delete documents (managers only)

---

### 7.7 Project Billing (Invoices)

URL: `/projects/{id}/billing`

Create simple invoices per project:
- Draft an invoice with line items
- Save it to the workspace
- Use **Print / PDF** to export (opens an HTML invoice page; use your browser’s “Save as PDF”)

### 7.4 Project Reports

Navigate to `/projects/{id}/reports` for:

- **Velocity** — Tasks completed per sprint
- **Burndown** — Work remaining vs. time in current sprint
- **Member stats** — Tasks per team member
- **Project health** — Overdue count, completion rate, at-risk milestones
- **AI Health Score** — 0–100 score with risk factors and recommendations (AI plan only)

---

## 8. Tasks — Full Feature Breakdown

### 8.1 Create a Task

Inside a project, click **+ Add task** under any column, or click **New task** in the top toolbar.

**Core fields:**

| Field | Example | Notes |
|-------|---------|-------|
| Title | `Design hero section` | Required, max 255 chars |
| Description | `Use the new brand colors. Figma link: ...` | Optional, supports rich text |
| Issue Type | `Task` | Epic · Story · Task · Bug · Subtask |
| Priority | `High` | Urgent · High · Normal · Low |
| Assignee | `Priya` | One team member |
| Due Date | `2026-05-10` | Date field |
| Labels | `design`, `Q2` | Multiple labels |
| Estimated Hours | `4.5` | Decimal hours |

Click **Create task** to save.

> **AI tip (AI plan):** After typing the task title, click the **✦ Write description** button. AI will auto-generate a description, acceptance criteria, and suggested subtasks based on the title.

---

### 8.2 Issue Types

| Type | Use it for |
|------|-----------|
| **Epic** | Large feature that spans multiple sprints |
| **Story** | User-facing feature or improvement |
| **Task** | Standard unit of work |
| **Bug** | Something broken that needs fixing |
| **Subtask** | A step within a parent task |

---

### 8.3 Move Tasks (Kanban)

Drag a task card from one column to another. The task status updates instantly for all team members.

**Example:**
```
Priya finishes the hero section design.
She drags "Design hero section" from In Progress → Design Review.
Alex gets a notification that a task is ready to review.
```

---

### 8.4 Comments

Open a task and scroll to the **Comments** section.

- Type your comment and press **Send**
- Use `@name` to mention a teammate — they get notified
- **Edit** your own comment by clicking the pencil icon
- **Delete** removes the comment (a "deleted" placeholder remains in the thread)
- **Reply** to nest responses in a thread

**Example comment flow:**
```
Alex: @Priya can you add a mobile version of the hero?
Priya: Done! Check the updated Figma link above.
Alex: Looks great, moving to Dev Review.
```

---

### 8.5 Subtasks

Inside a task, click **+ Add subtask**:

| Field | Example |
|-------|---------|
| Title | `Write copy for hero headline` |

Each subtask has a checkbox. Progress shows as `2/5 subtasks` on the task card.

---

### 8.6 Attachments

Inside a task, click the **paperclip icon** or drag-and-drop a file:

- Supported types: images, videos, audio, PDFs, documents
- Images show inline preview; click to open a fullscreen lightbox
- PDFs render in an inline frame with an "Open PDF" link
- Videos play inline
- Other files show as a download card with filename and size
- Each attachment tracks filename, file size, and MIME type
- **Version history** — upload a new version of a file; previous versions are stored

---

### 8.7 Time Tracking

Inside a task, click **Log time**:

| Field | Example |
|-------|---------|
| Minutes | `90` (= 1.5 hours) |
| Date | `2026-05-08` |
| Note | `Initial implementation pass` |

Total logged hours appear on the task and in project reports.

---

### 8.8 Task Dependencies (Links)

Open a task → **Add link**:

| Link type | Meaning |
|-----------|---------|
| **Blocks** | This task must be done before the linked task can start |
| **Blocked by** | This task cannot start until the linked task is done |
| **Duplicates** | This task is a duplicate of the linked task |
| **Relates to** | General relationship, no strict ordering |

**Example:**
```
"Set up API endpoints" → blocks → "Build frontend data tables"
```

---

### 8.9 Approvals

Inside a task, click **Request approval**:

| Field | Example |
|-------|---------|
| Title | `Approve hero section design` |
| Description | `Please review and approve before dev handoff` |
| Required role | `Manager` |

The manager receives a notification. They can **Approve** or **Reject** with a decision note (max 300 chars). Status tracks as: `pending → approved / rejected`.

---

### 8.10 Watchers

Click **Watch** on any task to subscribe to all its updates. You'll get notified when:
- The task is moved to a new column
- A comment is added
- The task is completed
- The assignee changes

To stop watching, click **Unwatch**.

---

### 8.11 Recurring Tasks

Inside a task, click **Set recurrence**:

| Field | Options |
|-------|---------|
| Frequency | Daily · Weekly · Monthly |
| Interval | e.g., `2` = every 2 weeks |
| Assignee | Optional — who gets each new instance |

When a recurrence fires, a new task is automatically created with the same title and settings. The original task tracks `next_run_date`.

**Example:**
```
"Send weekly progress report"
Frequency: Weekly, Interval: 1
→ A new task is created every Monday morning
```

---

### 8.12 Custom Fields

Project admins can define custom fields per issue type (e.g., "Story Points", "Client", "Browser"). These appear on the task form and can be filled per task.

Navigate to **Project Settings → Issue Types** to define fields.

---

## 9. Sprints & Capacity Planning

Sprints let you timebox work into focused delivery cycles.

### 9.1 Create a Sprint

Inside a project, go to the **Planning** view → **New Sprint**:

| Field | Example |
|-------|---------|
| Name | `Sprint 3 — Hero & Nav` |
| Goal | `Complete all homepage above-the-fold work` |
| Start date | `2026-05-11` |
| End date | `2026-05-24` |
| Capacity hours | `80` (team's total available hours) |

Sprint statuses:
- **Planned** — not started yet
- **Active** — currently running (only one sprint active at a time)
- **Completed** — finished

---

### 9.2 Add Tasks to a Sprint

In the Planning view, drag tasks from the backlog into a sprint, or open a task and assign it to a sprint from the task detail panel.

> **AI tip (AI plan):** Click **✦ AI suggest scope** in the sprint planning view. AI will analyse the backlog tasks, their estimates, priorities, and your capacity setting, then highlight the recommended tasks to include. It shows the reasoning and total estimated hours so you can adjust before committing.

---

### 9.3 Capacity Planning per Member

Inside a sprint, click **Capacity** to set per-person availability:

| Member | Hours | Note |
|--------|-------|------|
| Priya | 30 | On holiday Wed-Thu |
| Alex | 40 | Full availability |

This feeds the burndown chart and helps catch overcommitment before the sprint starts.

---

### 9.4 Sprint Burndown

Go to **Project → Reports → Burndown** while a sprint is active. The chart shows:
- Ideal remaining work (diagonal line)
- Actual remaining work (live line)

If the actual line is above the ideal, the sprint is behind.

---

### 9.5 Sprint Retrospective (AI plan)

When a sprint is completed, click **✦ Generate retrospective** on the sprint card.

AI analyses completed vs. incomplete tasks, velocity, and sprint data and returns:

```
Went well:
  • Completed 12 of 15 planned tasks — best velocity in 3 sprints
  • Zero unplanned scope additions

Didn't go well:
  • 3 auth tasks blocked by external API delay
  • 2 days lost to unplanned meetings

Action items:
  • Confirm external dependencies before sprint start
  • Cap scheduled meetings at 45 minutes
```

---

## 10. Milestones

Milestones mark major delivery checkpoints.

### Create a Milestone

In a project, click **+ Milestone**:

| Field | Example |
|-------|---------|
| Name | `Public Beta Launch` |
| Description | `All core features shipped and tested` |
| Due date | `2026-06-01` |
| Status | `Planned` |

Milestone statuses:
- **Planned** — on track
- **At risk** — behind or blocked
- **Completed** — done

Milestones appear in the Calendar and project Reports.

---

## 11. Messages — Real-Time Chat

URL: `/messages`

### 11.1 Channel Types

| Type | Icon | Who can see it |
|------|------|---------------|
| **Public channel** | # | All team members |
| **Private channel** | 🔒 | Invited members only |
| **Direct Message (DM)** | 👤 | You and one other person |

> Meeting channels (prefix `mtg-`) are created automatically when a meeting starts. They are hidden from the sidebar unless you are in the meeting.

---

### 11.2 Create a Channel

Click the **+** button in the sidebar → **New channel**:

| Field | Example |
|-------|---------|
| Channel name | `engineering-updates` |
| Display name | `Engineering Updates` |
| Description | `Daily dev standups and technical decisions` |
| Private | Toggle on for private |

If private, you can select members to add immediately.

---

### 11.3 Start a Direct Message

Click **+** → **New direct message** → search for a teammate by name or email → click their name.

A DM thread opens instantly.

---

### 11.4 Send a Message

Click into the message box at the bottom of any channel and type. Press **Enter** to send. Press **Shift+Enter** for a new line.

**Mentions:** Type `@` followed by a name to mention someone. They receive a notification.

---

### 11.5 Message Actions

Hover over any message to reveal the action toolbar:

| Action | How to use |
|--------|-----------|
| **React** | Click 😊 → pick an emoji from the quick panel |
| **Reply in thread** | Click 💬 → opens a thread panel on the right |
| **Edit** | Click ✏️ → edit your own message inline |
| **Delete** | Click 🗑️ → removes your message (shown as "deleted") |
| **More (⋯)** | Opens the full actions menu (see below) |

**Full actions menu (⋯):**
- **Mark unread** — flags the channel as unread so you come back to it
- **Save** — bookmarks the message to your personal saved list
- **Pin** — pins the message to the channel (visible to all in that channel)
- **Copy link** — copies a deep link to that specific message
- **Quote reply** — starts a reply that quotes the original message
- **Forward** — sends the message to another channel or DM
- **Edit history** — view all previous versions of an edited message

---

### 11.6 Threads

Click the **reply** icon on any message to open a thread. Threads keep side conversations organised without cluttering the main channel.

The parent message shows a **"N replies"** count. Click it to re-open the thread.

---

### 11.7 Scheduled Messages

Click the **clock icon** in the composer → enter a date and time → write your message → **Schedule**.

The message is queued and delivered at the specified time. Scheduled messages appear in the **Scheduled** panel in the channel header.

---

### 11.8 Pins & Saved Messages

- **Pins** — channel-wide. Click **Pins** in the channel header to see all pinned messages.
- **Saved** — personal. Click **Saved** in the channel header to see messages you bookmarked.

---

### 11.9 Mute a Channel

Right-click a channel (or click ⋯) → **Mute**:

| Option | Duration |
|--------|---------|
| Mute 1 hour | 60 minutes |
| Mute indefinitely | Until you manually unmute |

Muted channels move to the bottom of the sidebar and do not show unread badges.

---

### 11.10 Notification Preferences per Channel

Click the **bell icon** in the channel header:

| Level | What triggers a notification |
|-------|------------------------------|
| **All messages** | Every new message |
| **Mentions only** | Only when someone @mentions you |
| **Mute** | Never |

---

### 11.11 Sidebar Filters

At the top of the Messages sidebar:

- **Unread** — shows only channels with unread messages, with a count badge
- **Muted on/off** — toggle to show or hide muted channels

Use **Ctrl+K** (Windows) to jump directly to the channel search box.

---

### 11.12 Search within Messages

Use the **Search** icon in the channel header to search messages within that channel. Filter by sender, date from, and date to. Save frequently used search filters as **presets**.

---

### 11.13 Channel Catch-Me-Up (AI plan)

When you return from a meeting, a holiday, or any absence, click **✦ Catch me up** in the channel header.

AI reads the last 48 hours (configurable) of messages and returns a structured summary:

```
Last 48 hours in #engineering:

📌 Decision: API v2 will use REST, not GraphQL (Alex, Tue 11:32)
🐛 Issue raised: Auth tokens expiring on mobile after 15 min (Jordan)
✅ Resolved: Staging deploy is back up (Sarah, Wed 09:14)
❓ Open question: Who owns Stripe webhook testing? (unanswered)

4 people · 28 messages · 3 decisions · 1 open item
```

**Time saved:** 10–20 minutes per catch-up session vs reading all messages manually.

---

### 11.14 Rich Link Embeds (Figma / Google Drive / Miro)

When you paste supported links into a **message** or a **task description**, FlowTeam automatically shows an inline preview card.

Supported providers:
- **Figma** (`figma.com`)
- **Google Drive / Docs / Sheets / Slides** (`drive.google.com`, `docs.google.com`)
- **Miro** (`miro.com`)

Tip: Keep the full URL on its own line for the cleanest preview.

---

## 12. Meetings

URL: `/meetings`

### 12.1 Meeting Types

| Type | Use case |
|------|---------|
| **Instant** | Start a call right now with no scheduling |
| **Scheduled** | Plan a future meeting with a set time and attendees |

### 12.2 Call Types

| Type | Use case |
|------|---------|
| **Audio** | Voice only — lower bandwidth |
| **Video** | Camera + voice — default |

---

### 12.3 Create an Instant Meeting

1. `/meetings` → **New Meeting** → **Instant**
2. Fill in:

| Field | Example |
|-------|---------|
| Title | `Quick design sync` |
| Call type | `Video` |
| Attendees | Select teammates (optional) |

3. Click **Create** → opens the meeting room immediately

---

### 12.4 Schedule a Meeting

1. `/meetings` → **New Meeting** → **Schedule**
2. Fill in:

| Field | Example |
|-------|---------|
| Title | `Weekly sprint review` |
| Description | `Review completed work and plan next sprint` |
| Starts at | `2026-05-12 10:00` |
| Duration | `60` minutes |
| Call type | `Video` |
| Attendees | Alex, Priya, Sarah |

3. Click **Schedule**

The meeting appears on everyone's Calendar. At the scheduled time, open the meeting and click **Join**.

---

### 12.5 Join a Meeting

Open the meeting from `/meetings` or from the Calendar. Click **Join** (or **Start call** if you're the host). The call opens in a dedicated meeting channel with audio/video.

---

### 12.6 Meeting Statuses

| Status | Meaning |
|--------|---------|
| **Scheduled** | Upcoming, not yet started |
| **Active** | Currently in progress |
| **Ended** | Call has finished |
| **Cancelled** | Meeting was cancelled |

---

### 12.7 Meeting Channel

Every meeting automatically creates a private messaging channel (`mtg-{id}`). Use it to share links, notes, and decisions during and after the call. It appears in your Messages sidebar while the meeting is active.

---

### 12.8 Meeting Action Items (AI plan)

After a meeting ends, paste the meeting notes or transcript into the **✦ Extract action items** panel in the meeting channel.

AI extracts:

```json
{
  "summary": "Sprint 3 review. Velocity improved. Two blockers discussed.",
  "decisions": ["API v2 ships Friday", "Nav redesign moves to Sprint 4"],
  "action_items": [
    { "title": "Update Figma with mobile breakpoints", "assignee_hint": "Priya" },
    { "title": "Send client updated timeline", "assignee_hint": "Sarah" }
  ],
  "open_questions": ["Who owns QA sign-off for the payment flow?"]
}
```

Click **Create tasks** to turn action items into real tasks in the project of your choice — assignees are pre-filled from the hints.

**Time saved:** 15–20 minutes of post-meeting admin per meeting.

---

### 12.9 Meeting Recordings + AI Transcript (Phase 4)

Inside an active call, click the **Record** button (red dot) in the call controls.

What happens:
1. FlowTeam records **audio** from the call (local + remote)
2. When you stop recording, the audio file is uploaded to the meeting
3. A background job transcribes the audio and generates action items + a short summary
4. A system message is posted into the meeting channel with the results

Where to find it:
- Open the meeting page (`/meetings/{id}`) → **Recordings** card
- Each recording shows: playback audio, status, AI summary, and full transcript (when ready)

> Admin note: transcription requires `OPENAI_API_KEY` in the backend environment.

## 13. Calendar

URL: `/calendar`

### 13.1 Views

Switch views using the buttons in the top toolbar:

| View | Shows |
|------|-------|
| **Month** | Full month grid with task pills and meeting indicators |
| **Week** | 7-day timeline with time slots |
| **List** | Chronological list of upcoming events |

---

### 13.2 What Appears on the Calendar

- **Task due dates** — shown as colored pills (color = project color)
- **Scheduled meetings** — shown with a video camera icon

---

### 13.3 Navigate the Calendar

| Control | Action |
|---------|--------|
| **◀** | Previous month/week |
| **Today** | Jump to today |
| **▶** | Next month/week |
| **Month/Week/List** | Switch view |

---

### 13.4 Drag and Drop to Reschedule

Drag a task pill to a new date to update its due date. Drag a meeting to reschedule it. Changes save instantly.

**Example:**
```
The "QA sign-off" task was due Friday.
Alex drags it to the following Monday — the due date updates for everyone.
```

---

### 13.5 External Calendar Events (Google / Outlook)

FlowTeam can display your external events alongside tasks + meetings.

1. Go to **Settings → Integrations → Calendar Sync**
2. Connect **Google Calendar** or **Outlook**
3. Enable **Show events** for that provider
4. In `/calendar`, open **Calendar filters** and toggle **Show external events**

External events appear as green calendar items. They are read-only in FlowTeam (two-way sync is planned).

---

### 13.5 Agenda Panel

The right side of the calendar shows an **Agenda panel** for the selected date:

- **Meetings** section — lists meetings with start time and duration
- **Tasks due** section — lists tasks due that day with project name and priority badge

Click any item to navigate to it.

---

### 13.6 Filters

Click **Filters** in the toolbar:

| Filter | Options |
|--------|---------|
| Search | Free text across tasks and meetings |
| Project | Filter to one project |
| Priority | Urgent · High · Normal · Low |
| Meeting status | All · Scheduled · Active · Ended · Cancelled |
| Mine only | Toggle — shows only your tasks and meetings |
| Show tasks | Toggle on/off |
| Show meetings | Toggle on/off |

Click **Reset** to clear all filters.

---

## 14. Search

### 14.1 Open Global Search

Press **Ctrl+K** anywhere in the app, or click the **Search** button in the top-right toolbar.

### 14.2 What it searches

Type at least **2 characters** to get results. Results are returned across:

| Category | What matches |
|----------|-------------|
| **Tasks** | Task title, project name |
| **Projects** | Project name |
| **Members** | Full name, email address |
| **Messages** | Message text (full-text search with snippets) |
| **Channels** | Channel name |

Results are ranked by relevance. Message results include a highlighted snippet showing the matching text in context.

### 14.3 Search limits

- Minimum 2 characters
- Rate limited to 30 searches per 60 seconds per user
- 300ms debounce (waits until you stop typing)

**Example:**
```
Search: "hero section"
Results:
  Tasks    → "Design hero section", "Review hero section copy"
  Messages → "...@Priya the hero section mockup is in Figma..."
```

---

## 15. Notifications

### 15.1 Notification Bell

The **bell icon** in the top-right toolbar shows your unread notification count. Click it to open the notification panel.

Each notification links directly to the relevant task, message, or meeting.

Click **Mark all read** to clear the unread count.

---

### 15.2 Notification Types

| Type | Triggered when |
|------|---------------|
| `task_assigned` | A task is assigned to you |
| `task_due` | A task's due date is approaching |
| `task_overdue` | A task is past its due date |
| `task_watched` | A task you're watching is updated |
| `task_moved` | A watched task is moved to a new column |
| `task_completed` | A watched task is marked done |
| `approval_requested` | Someone requests your approval on a task |
| `approval_decided` | An approval you submitted has been decided |
| `mentioned_message` | You are @mentioned in a message |
| `mentioned_comment` | You are @mentioned in a task comment |
| `automation_notice` | An automation rule has fired |
| `invite_accepted` | A team member accepted your invite |

---

### 15.3 Notification Preferences

Go to **Settings → Notifications**:

- Toggle individual notification types on/off
- Enable/disable **email notifications** globally
- Enable/disable **due date reminders**
- Enable/disable **overdue digest**
- Enable/disable **watch notifications**
- Enable/disable **approval notifications**
- Enable/disable **browser push notifications** (see [Section 18](#18-web-push-notifications))

---

## 16. Settings

URL: `/settings`

### 16.1 Profile

| Field | Notes |
|-------|-------|
| Full name | Editable |
| Email | Display only — cannot be changed |
| Avatar | Upload an image |
| Timezone | Select from list (UTC, US/Eastern, US/Central, US/Pacific, Europe/London, Europe/Paris, Asia/Kolkata, Asia/Tokyo, Australia/Sydney) |

---

### 16.2 Members Tab

View all team members with their roles, invite new members, change roles, and remove members. (See [Team Management](#5-team-management) for full details.)

---

### 16.3 Push Notifications

**Settings → Notifications → Browser push**

Toggle **Browser push notifications** on to receive FlowTeam notifications even when the app is not the active browser tab.

When you enable this:
1. Your browser asks for permission to show notifications — click **Allow**
2. FlowTeam registers your browser with the push service using VAPID keys
3. Future notifications (task assigned, @mention, approval, etc.) arrive as browser push alerts

Each browser/device registers separately. To stop push notifications on a specific browser, toggle the setting off — that subscription is unregistered from the server.

> **Browser support:** Chrome, Edge, Firefox, and Opera on desktop. Safari on macOS 13+ (Ventura) and iOS 16.4+ when the app is added to the home screen.

---

### 16.4 Slack Webhooks

Connect FlowTeam to a Slack workspace so events are posted to Slack channels.

**Setup:**
1. In Slack: go to your Slack workspace → **Apps → Incoming Webhooks** → create a new webhook → copy the URL
2. In FlowTeam: **Settings → Integrations → Slack Webhooks → Add webhook**

| Field | Example |
|-------|---------|
| Name | `Nova Alerts` |
| Webhook URL | `https://hooks.slack.com/services/T00/B00/xxxx` |
| Enabled | Toggle on |

You can add multiple webhooks (e.g., one per Slack channel). Disable a webhook to pause delivery without deleting it.

---

### 16.4.1 Calendar Sync (Google / Outlook)

**Settings → Integrations → Calendar Sync**

You can connect Google Calendar and/or Outlook to show external events inside FlowTeam’s Calendar.

- Click **Connect** (Google or Outlook) to complete OAuth
- Toggle **Show events** to allow FlowTeam to fetch and display events

This is read-only display in FlowTeam. Creating/editing events in external calendars is planned.

---

### 16.5 GitHub Integration (per project)

Connect a GitHub repository to a project so that pull requests and pushes are linked to FlowTeam tasks automatically.

**Setup:**

1. Open a project → **Settings → Permissions** tab
2. Click **Connect GitHub**
3. GitHub's OAuth consent screen opens — authorise FlowTeam to access your repositories (scope: `repo`)
4. After approval you return to the project settings page with `?github=connected` — the integration is created
5. Enter the repository in `owner/repo` format (e.g., `nova-agency/website`) and click **Save**

FlowTeam registers a webhook on the repository for `pull_request` and `push` events.

**Automatic task linking:**

When a pull request title or body contains a task reference such as `#42` or `#WEB-42`, FlowTeam links the PR to that task. Linked PRs appear in the task detail panel.

**Example:**
```
PR title: "feat: implement hero animation #42"
→ PR is linked to task #42 in the project
→ Task detail shows: "1 linked pull request"
```

---

### 16.5.1 GitLab + Bitbucket Integrations (per project)

FlowTeam supports linking merge requests / pull requests from **GitLab** and **Bitbucket** the same way as GitHub.

Setup:
1. Open a project → **Settings → Permissions**
2. Click **Connect GitLab** or **Connect Bitbucket**
3. After OAuth, enter the repository identifier and click **Save**
   - GitLab: `group/subgroup/repo`
   - Bitbucket: `workspace` + `repo-slug`

Once connected, FlowTeam registers webhooks and links MRs/PRs to tasks when the title/description contains a task reference like `#42` or `#WEB-42`.

### 16.6 Notification Preferences

(See [Notifications → Preferences](#153-notification-preferences))

---

### 16.7 AI Settings (AI plan)

**Settings → AI**

This tab is visible to CEO and Admin only.

| Control | Description |
|---------|-------------|
| **AI Features toggle** | Enable or disable all AI features for the entire workspace |
| **Feature grid** | Shows all 10 AI features and their current state (active / inactive) |

When AI is enabled, every team member in the workspace gains access to all AI features. When disabled, the AI Gate upgrade wall is shown instead.

**Example:**
```
Sarah (CEO) goes to Settings → AI → toggles AI Features ON.
All 10 team members now see the Daily Briefing card on the dashboard
and the ✦ Catch me up button in every channel.
```

---

## 17. Two-Factor Authentication (2FA)

2FA adds a second layer of security. After entering your password, you must also enter a 6-digit code from an authenticator app.

### 17.1 Enable 2FA

1. **Settings → Security → Set up 2FA**
2. Open your authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator)
3. Scan the QR code shown on screen — it registers **FlowTeam** as the issuer
4. Enter the **6-digit code** from your app to confirm
5. Click **Enable**
6. **Save your 10 backup codes** — store them somewhere safe (password manager recommended)

---

### 17.2 Sign In with 2FA

1. Enter email and password as normal
2. When prompted, enter the **6-digit code** from your authenticator app
3. Alternatively, enter one of your **backup codes** (one-time use — each code works only once)

---

### 17.3 Rotate Backup Codes

If you've used several backup codes or think they may be compromised:

1. **Settings → Security → Rotate backup codes**
2. Enter your current OTP code to confirm
3. A new set of 10 codes is generated — the old ones are invalidated immediately

---

### 17.4 Disable 2FA

1. **Settings → Security → Disable 2FA**
2. Enter your current OTP code **or** a backup code
3. 2FA is removed from your account

---

## 18. Web Push Notifications

Web Push lets FlowTeam send you real-time browser notifications even when the app is not the active tab — no separate app or email needed.

### 18.1 Enable Push in Your Browser

1. Go to **Settings → Notifications**
2. Toggle **Browser push notifications** on
3. Your browser shows a permission prompt — click **Allow**
4. FlowTeam confirms: "Push notifications enabled"

If you click **Block** by mistake, you need to re-enable in your browser's site settings (the lock icon in the address bar → Notifications → Allow).

---

### 18.2 What Triggers a Push Notification

Any notification type you have enabled (see [Section 15.3](#153-notification-preferences)) can also arrive as a browser push. Common triggers:

| Event | Push message example |
|-------|---------------------|
| Task assigned to you | "Design hero section assigned to you" |
| @mention in a message | "Alex mentioned you in #engineering" |
| Approval requested | "Approval needed: Hero section sign-off" |
| Task overdue | "API integration is overdue by 1 day" |
| Watched task moved | "QA sign-off moved to Done" |

---

### 18.3 Clicking a Push Notification

Clicking the notification opens FlowTeam in your browser and navigates directly to the relevant task, message, or meeting. If FlowTeam is already open in a tab, that tab is focused and navigated — no new tab opens.

---

### 18.4 Disable Push Notifications

1. **Settings → Notifications → Browser push** → toggle off
2. The subscription for this browser is removed from the server immediately

Or: deny notification permission in your browser settings at any time — no new pushes are delivered, even if the toggle appears enabled.

---

### 18.5 Multiple Devices

Each browser/device registers separately. If you use FlowTeam on a laptop and a desktop, enable push on each. You will receive notifications on whichever device(s) have it enabled.

---

## 19. Audit Log

URL: `/settings/audit`

**Who can access it:** CEO and Admin only.

The audit log is an immutable record of every significant action taken in the workspace.

### 19.1 What is logged

| Action | Example |
|--------|---------|
| `create` | New project created |
| `update` | Task priority changed |
| `delete` | Member removed |
| `permission_change` | Role changed from Member to Manager |
| `approval_change` | Approval approved or rejected |
| `automation_trigger` | Automation rule fired |
| `export` | Project exported to CSV |
| `login` | User signed in |
| `logout` | User signed out |
| `invite_sent` | Invite emailed to new member |
| `invite_accepted` | New member joined |
| `oauth_login` | User signed in via Google |

### 19.2 Each log entry shows

- **Who** — actor's name and avatar
- **What** — action type and description
- **Object** — which record was affected (task name, member name, etc.)
- **Changes** — field-level diff (old value → new value)
- **When** — exact timestamp
- **IP address** — where the request came from
- **User agent** — browser/device used

Logs are retained for **365 days**.

---

## 20. Export

Export a project's tasks for reporting or backup.

### 20.1 How to Export

1. Open a project
2. Click **⋯ → Export**
3. Choose format: **CSV**, **Excel (XLSX)**, or **PDF**
4. The file downloads immediately

**File name format:** `{ProjectName}_tasks.{format}`  
**Example:** `Website Redesign_tasks.xlsx`

### 20.2 What is exported

| Column | Example value |
|--------|---------------|
| Title | `Design hero section` |
| Column | `In Progress` |
| Priority | `High` |
| Assignee | `Priya Sharma` |
| Reporter | `Sarah Chen` |
| Due Date | `2026-05-10` |
| Completed | `No` |
| Labels | `design, Q2` |
| Subtasks | `2/5` |
| Hours Logged | `4.5` |
| Created At | `2026-04-28 09:14` |

Export is rate-limited to **5 exports per 60 seconds** and is recorded in the audit log.

---

## 21. Client Portal

The Client Portal lets you share a **read-only view** of a project with external stakeholders (e.g., a client) without giving them a FlowTeam account.

### 21.1 Create a Client Portal Link

1. Inside a project, go to **Settings → Client Portal**
2. Click **Create access link**
3. Configure:

| Field | Example |
|-------|---------|
| Display name | `Nova Client View` |
| Allowed statuses | `In Progress, Done` (only show these columns) |
| Allowed documents | Select specific project documents to share |

4. Copy the generated URL: `/client-portal/{token}`
5. Share it with your client

### 21.2 What the client sees

- Tasks filtered to the allowed columns only
- Project documents you've whitelisted
- Read-only — they cannot create, edit, or delete anything

### 21.3 AI Client Report (AI plan)

Inside the Client Portal settings, click **✦ Generate report**.

AI reads the project's recent activity and writes a client-ready progress report in plain English:

```
Project Update — Nova Agency Website Redesign
Week of May 5–9, 2026

We made strong progress this week. The homepage design is now complete and
has moved to development. The mobile navigation issue discovered last week
has been resolved and verified across iOS and Android.

This week we completed 12 deliverables. Eight items are currently in active
development, on track for the May 24 sprint deadline.

Two items need your attention:
  1. Payment flow integration is awaiting your Stripe API keys
  2. SEO metadata requires the final page copy to proceed

We remain on track for the June 1 launch.
```

Copy the report and paste it directly into an email or share it via the portal.

**Time saved:** 45–60 minutes of manual writing per report, per project.

### 21.4 Revoke Access

Go to **Settings → Client Portal → Revoke** to immediately invalidate the link. The client gets a "not found" error if they try to use it after revocation.

---

## 22. Automation Rules

Automation rules run actions automatically when conditions are met — no manual work needed.

### 22.1 Create an Automation Rule

Inside a project, go to **Settings → Automations → New Rule**:

| Field | Options |
|-------|---------|
| **Trigger** | Task moved to Done · Task overdue · Approval requested |
| **Conditions** | Priority = Urgent · Assignee is empty · etc. |
| **Action** | Assign user · Change priority · Add label · Post to Slack · Create related task |

**Example rule:**
```
Trigger:   Task moved to "Done"
Condition: Priority = "Urgent"
Action:    Post to Slack → #releases channel
```

This would automatically notify your Slack releases channel every time an urgent task is completed.

---

### 22.2 AI Automation Builder (AI plan)

Instead of configuring triggers, conditions, and actions manually, type what you want in plain English in the **✦ Describe a rule** box:

```
"When an urgent bug is created, assign it to Alex and post to #incidents"
```

AI translates this into the rule format automatically. Review the generated rule and click **Save** to activate it.

**More examples:**
```
"When a task is overdue by more than 2 days, change its priority to urgent"
"When any task moves to Done, notify the reporter"
"When a new story is created with no assignee, post to #triage"
```

---

### 22.3 Automation Notifications

When an automation fires, team members subscribed to `automation_notice` get an in-app notification. All automation triggers are recorded in the audit log.

---

## 23. AI Features (AI Plan)

AI features are powered by Claude (Anthropic). They are available exclusively on the **AI plan** and must be enabled by a CEO or Admin in **Settings → AI**.

When AI is not enabled, each AI feature location shows an upgrade prompt instead of the feature.

---

### 23.1 How to Enable AI

1. Go to **Settings → AI** (CEO or Admin only)
2. Toggle **AI Features** on
3. All team members gain access immediately — no per-user setup needed

---

### 23.2 AI Feature Overview

| Feature | Where to find it | Who saves time |
|---------|-----------------|---------------|
| Daily Briefing | Dashboard (top card) | Everyone |
| Focus Recommendations | Dashboard (second card) | Individual contributors |
| Auto Task Description | Task create dialog | All task creators |
| Auto Label & Triage | Task create dialog | All task creators |
| Task Summarizer | Task detail panel header | Everyone |
| Channel Catch-Me-Up | Channel header | Everyone |
| Sprint AI Planner | Sprint planning view | Managers |
| Sprint Retrospective | Completed sprint card | Managers |
| Workload Balancer | Sprint capacity panel | Managers |
| Project Health Score | Project Reports page | Managers / CEO |
| Weekly Status Report | Project ⋯ menu | Managers |
| Client Report Generator | Client Portal settings | Account managers |
| Meeting Action Items | Meeting channel | Team leads |
| AI Automation Builder | Settings → Automations | Admins / Managers |

---

### 23.3 Daily Briefing

**Where:** Dashboard → top card (AI plan)

Every time you open the dashboard, the Daily Briefing card shows a personalised morning summary for you:

- How many tasks are overdue and which ones
- How many tasks are due today
- Today's scheduled meetings with times
- A recommended focus for the day

Click **Refresh** to regenerate. Results are cached for 12 hours per user.

**Example output:**
```
Good morning, Sarah.

You have 2 overdue tasks — "API integration" (3 days late, blocking others)
and "Update staging docs" (1 day late).

3 tasks are due today: "QA sign-off", "Client proposal", "Deploy staging".

You have 1 meeting today: Weekly sprint review at 2:00 PM (60 min).

Recommended focus: Unblock the API integration first — it is preventing
Priya and Alex from completing their tasks this sprint.
```

---

### 23.4 Focus Recommendations

**Where:** Dashboard → second card (AI plan)

Shows a ranked list of up to 6 tasks you should work on next, with urgency level and the reason for the ranking.

| Rank | Task | Urgency | Reason |
|------|------|---------|--------|
| 1 | API integration | CRITICAL | Overdue 3 days, blocking 3 tasks |
| 2 | Design pricing page | HIGH | Due Wednesday, not started |
| 3 | Write changelog | LOW | Due Friday, low priority |

Click **Refresh** to update the recommendations.

---

### 23.5 Auto Task Description

**Where:** Task create dialog → **✦ Write description** button (appears after you type a title)

After typing a task title, click the button to auto-generate:

- **Description** — 2–3 sentences explaining the work
- **Acceptance criteria** — clear done conditions
- **Suggested subtasks** — concrete implementation steps

**Example:**

```
Title: "Fix mobile nav dropdown not closing on iOS"

Generated:
  Description: The mobile navigation dropdown fails to close when the user
  taps outside of it on iOS Safari 16+. This affects iPhone 12 and above.

  Acceptance criteria:
    ✓ Dropdown closes on outside tap on all iOS versions ≥ 14
    ✓ Dropdown closes on Android Chrome
    ✓ No regression on desktop nav
    ✓ Tested on real device

  Suggested subtasks:
    • Reproduce and document on specific iOS versions
    • Identify the touch event listener causing the issue
    • Implement fix with regression test
    • QA on iOS + Android real devices
```

You can edit or discard any generated content before saving.

**Time saved:** 5–10 minutes per task. For a team creating 20 tasks per week, that is 2–3 hours per week recovered.

---

### 23.6 Auto Label & Triage

**Where:** Task create dialog — runs alongside Auto Task Description

When you create a task, AI suggests:

- **Labels** — from your existing label library (e.g., `bug`, `backend`, `Q2`)
- **Issue type** — epic / story / task / bug / subtask
- **Priority** — urgent / high / normal / low
- **Confidence** — high / medium / low

You can accept, modify, or ignore each suggestion before saving.

---

### 23.7 Task Summarizer

**Where:** Task detail panel → **✦ Summarize** button in the header

Click to generate a summary of the entire task history — description, all comments, and activity log — condensed into a short paragraph.

**Example output:**
```
This task implements the hero section. Key decisions: use brand indigo,
mobile-first layout. Current status: in Design Review since Tuesday.
Open question: font size on mobile hasn't been confirmed. Last updated
by Priya 2 days ago. Next step: get sign-off from Alex before dev handoff.
```

**Time saved:** 5–10 minutes of reading long task threads, especially on tasks with 30+ comments.

---

### 23.8 Channel Catch-Me-Up

**Where:** Channel header → **✦ Catch me up** button (AI plan)

(Full details in [Section 11.13](#1113-channel-catch-me-up-ai-plan))

Summarises the last 48 hours of messages in any channel into decisions, blockers, action items, and open questions.

---

### 23.9 Sprint AI Planner

**Where:** Sprint planning view → **✦ AI suggest scope** button

(Full details in [Section 9.2](#92-add-tasks-to-a-sprint))

Analyses backlog tasks, estimates, priorities, and team capacity, then recommends which tasks to include in the sprint with a reasoning summary.

---

### 23.10 Sprint Retrospective Generator

**Where:** Completed sprint card → **✦ Generate retrospective**

(Full details in [Section 9.5](#95-sprint-retrospective-ai-plan))

Generates a structured retrospective with Went Well, Didn't Go Well, and Action Items based on actual sprint data.

---

### 23.11 Workload Balancer

**Where:** Sprint capacity panel → **✦ Balance workload** button

AI detects overloaded team members and suggests specific task reassignments:

```
Suggestions:
  Move "Write QA test plan" from Priya (140% capacity, 56h)
  to Alex (65% capacity, 26h).
  Reason: Priya is at risk of missing her sprint tasks.
  Alex has 14h available and the required QA skills.
```

Each suggestion has **Accept** and **Dismiss** buttons. Accepted suggestions update the task assignee immediately.

---

### 23.12 Project Health Score

**Where:** Project Reports page → Health Score card

AI scores the project's health from 0 to 100:

| Score | Label | Color |
|-------|-------|-------|
| 80–100 | Healthy | Green |
| 50–79 | Watch | Amber |
| 0–49 | At Risk | Red |

The card shows the factors driving the score and a recommended action:

```
Score: 62 — Watch

Factors:
  🔴 4 tasks overdue (high severity)
  🟡 Priya at 140% sprint capacity (high severity)
  🟡 Milestone due in 5 days, 30% complete (medium severity)

Recommendation:
  Reassign 2 tasks from Priya and push the nav redesign
  to Sprint 4 to protect the milestone.
```

The score is computed nightly and cached. Click **Refresh** to recompute immediately.

---

### 23.13 Weekly Status Report

**Where:** Project ⋯ menu → **✦ Generate weekly report**

AI generates a structured weekly project report:

```
Website Redesign — Week of May 5–9, 2026

✅ Completed (12 tasks)
   • Hero section design — Priya
   • Homepage copy — Alex
   • Mobile nav fix — Jordan

🔄 In Progress (8 tasks)
   • API integration (assigned Alex, due Tuesday)
   • Blog section design (on track)

⚠️ At Risk (2 tasks)
   • Payment flow — blocked, awaiting Stripe keys from client
   • SEO metadata — overdue 2 days

📊 Velocity: 12 tasks completed vs 15 planned (80%)

Next steps: Complete API integration, resolve payment flow blocker,
confirm SEO copy deadline with client.
```

**Time saved:** 30–45 minutes per manager per week.

---

### 23.14 AI Automation Builder

**Where:** Settings → Automations → **✦ Describe a rule** input

(Full details in [Section 22.2](#222-ai-automation-builder-ai-plan))

Type what you want in plain English. AI generates the trigger, conditions, and actions automatically.

---

### 23.15 AI Rate Limits & Fallbacks

All AI features include a graceful fallback: if the AI service is unavailable or returns an invalid response, a deterministic fallback result is shown based on actual data so the feature never shows a blank screen.

| Limit | Value |
|-------|-------|
| Daily briefing cache | 12 hours per user |
| Health score cache | 24 hours per project |
| Concurrent AI requests | No hard limit — queued via Celery |
| Model used | Claude Sonnet (claude-sonnet-4-6) |

---

## 24. Super Admin

Accessible only to users with `is_superuser = true`. URL: `/super-admin/dashboard`

This is for the platform operator (not a regular team admin).

### 24.1 What it shows

| Metric | Description |
|--------|-------------|
| Total users | All registered users across all teams |
| Total teams | All workspaces |
| Total projects | All projects |
| Total tasks | All tasks |
| Total messages | All messages sent |
| New users (7d / 30d) | Signups in the last 7 and 30 days |
| Task activity (7d) | Tasks created/updated in last 7 days |
| Messages (7d) | Messages sent in last 7 days |
| Recent users table | Latest registered accounts |

### 24.2 User Management

Super admins can:
- List all users across all teams
- Create a new user with email, name, password, timezone
- Set `is_active`, `is_staff`, `is_superuser` flags
- Edit or deactivate any user

### 24.3 Team & Project Management

Super admins can view and edit any team or project across the entire platform — useful for support and compliance.

---

## 25. Plan Limits

| Limit | Free Plan | Pro Plan | AI Plan |
|-------|-----------|----------|---------|
| Team members (including pending invites) | **5** | **50** | **50** |
| Active projects | **3** | **100** | **100** |
| AI features | ❌ | ❌ | ✅ |

If you hit a limit:
- **"Team member limit reached"** → remove a member or a pending invite, or upgrade
- **"Project limit reached"** → archive an existing project, or upgrade
- **"AI features require an AI-enabled plan"** → upgrade to AI plan in Settings → AI

### 25.1 Upgrading (Stripe billing — for operators)

FlowTeam connects to Stripe so teams can self-upgrade.

Backend endpoints:
- Create checkout session: `POST /api/billing/teams/<team_id>/checkout/`
- Stripe webhook: `POST /api/billing/stripe/webhook/`

Required backend env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_PRICE_ID_AI`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_BASE_URL`
- `ANTHROPIC_API_KEY` (required for AI plan features)

---

## 26. Quick Reference — Field Limits

| Feature | Field | Limit |
|---------|-------|-------|
| Registration | Password | Min 8 characters |
| Registration | Full name | Min 2 characters |
| Team | Name | Max 255 characters |
| Onboarding | Invites at once | 5 email fields |
| Project | Name | Max 255 characters |
| Project | Color | Hex format (#RRGGBB) |
| Project | Default icon | Emoji |
| Column | Name | Max 100 characters |
| Task | Title | Max 255 characters |
| Task | Priority | urgent / high / normal / low |
| Task | Issue type | epic / story / task / bug / subtask |
| Task | Estimated hours | Decimal (e.g. 4.5) |
| Task | Start date | Optional YYYY-MM-DD (used in Timeline) |
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
| Search | Minimum query | 2 characters |
| Search | Rate limit | 30 requests / 60 seconds |
| Export | Rate limit | 5 exports / 60 seconds |
| 2FA backup codes | Count | 10 codes (one-time use each) |
| Audit log | Retention | 365 days |
| Free plan | Members | 5 |
| Free plan | Projects | 3 |
| Pro plan | Members | 50 |
| Pro plan | Projects | 100 |
| AI plan | Members | 50 |
| AI plan | Projects | 100 |
| AI plan | AI features | All 14 features enabled |
| AI briefing cache | TTL | 12 hours per user |
| AI health score cache | TTL | 24 hours per project |
| AI model | Version | Claude Sonnet (claude-sonnet-4-6) |
| Push subscription | Fields | endpoint, p256dh, auth (per browser) |
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

Options:
- SMTP via Django email backend (default in production)
- Resend API
- SendGrid API

Backend env vars:
- `EMAIL_PROVIDER` = `django` | `resend` | `sendgrid`
- `DEFAULT_FROM_EMAIL`
- If `EMAIL_PROVIDER=django`: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` / `EMAIL_USE_SSL`
- If `EMAIL_PROVIDER=resend`: `RESEND_API_KEY`
- If `EMAIL_PROVIDER=sendgrid`: `SENDGRID_API_KEY`
- `FRONTEND_BASE_URL` (used for invite links in emails)

### A.2 Cloud File Storage (S3 / Cloudflare R2)

By default FlowTeam stores uploads in local `media/`. For production use S3-compatible storage.

Backend env vars:
- `USE_S3_STORAGE=True`
- `AWS_STORAGE_BUCKET_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- Optional: `AWS_S3_ENDPOINT_URL` (Cloudflare R2 / MinIO), `AWS_S3_REGION_NAME`

Note: enabling this requires installing `django-storages` + `boto3` in your production environment.

### A.3 CSV Import (Basic Task Migration)

You can import tasks into a project from a CSV file:
- `POST /api/projects/<project_id>/import/csv/` (multipart form with `file`)

Supported headers (case-insensitive):
- `title` (required), `description`, `column`, `assignee_email`, `due_date` (YYYY-MM-DD), `priority`, `issue_type`

### A.4 AI (Anthropic Claude)

The AI plan requires an Anthropic API key.

- Backend env var: `ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-6` (prompt caching enabled on all system prompts)
- All AI calls are synchronous at the view layer; heavy workloads (daily briefings, health scores) are pre-computed via Celery scheduled tasks and served from Redis cache

### A.5 Browser Push Notifications (VAPID + Service Worker)

Web Push is fully implemented. Users can enable browser push in **Settings → Notifications → Browser push**.

**How it works:**
1. Frontend fetches the VAPID public key from `GET /api/auth/push/vapid-key/`
2. The service worker (`/sw.js`) is registered in the browser
3. `PushManager.subscribe()` creates a push subscription using the VAPID public key
4. The subscription (`endpoint`, `p256dh`, `auth`) is posted to `POST /api/auth/push/subscribe/`
5. Backend stores the subscription in the `PushSubscription` model (keyed per endpoint, user-linked)
6. When a notification fires, the backend calls the push endpoint using the VAPID library (`pywebpush`)
7. The service worker receives the push event and calls `showNotification()`
8. Clicking the notification navigates to the relevant URL in FlowTeam

**To disable:** `DELETE /api/auth/push/subscribe/` with the endpoint — unregisters the subscription server-side. Browser-side `subscription.unsubscribe()` is also called.

Backend env vars required:
- `VAPID_PUBLIC_KEY` — the VAPID public key (base64url)
- `VAPID_PRIVATE_KEY` — the VAPID private key (base64url)
- `VAPID_CLAIMS_EMAIL` — the claim email shown to push services (e.g. `mailto:admin@yourapp.com`)

Generate a VAPID key pair:
```bash
python -c "from pywebpush import Vapid; v=Vapid(); v.generate_keys(); print(v.public_key, v.private_key)"
```

### A.6 OAuth + Integrations (Google / GitHub / GitLab / Bitbucket / Calendar Sync)

Both are fully implemented.

---

**Google OAuth (sign in / register with Google)**

Flow: `GET /api/auth/oauth/google/redirect/` → Google consent → `GET /api/auth/oauth/google/callback/` → `POST /frontend/auth/callback?access=...&refresh=...`

- On callback, the backend exchanges the auth code for a Google access token, fetches the user's profile (`email`, `name`, `sub`), and either creates a new user or links Google identity to an existing email
- Tokens are passed to the frontend via query params on the redirect to `/auth/callback`
- The frontend page at `/auth/callback` stores the tokens and calls `fetchMe()` before redirecting to `/dashboard`

Backend env vars required:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (e.g. `http://localhost:8000/api/auth/oauth/google/callback/`)

---

**GitHub OAuth (per-project repository integration)**

Flow: `GET /api/auth/oauth/github/redirect/?project_id={id}` → GitHub consent (scope: `repo`) → `GET /api/auth/oauth/github/callback/?code=...&state={project_id}` → creates `GitHubIntegration` record → redirects to project settings

- The `state` parameter carries the `project_id` through the OAuth flow
- On callback, the access token and GitHub username are stored in `GitHubIntegration`
- The project manager then sets the `owner/repo` target in project settings (`PATCH /api/integrations/projects/{id}/github/`)
- This PATCH also registers a GitHub webhook on the repo for `pull_request` and `push` events

**Webhook processing:** GitHub posts events to `POST /api/integrations/github/webhook/`. Requests are verified via HMAC SHA-256 (`X-Hub-Signature-256` header). PR titles and bodies are scanned for task references (`#42` or `#PROJ-42`) and linked to the corresponding task.

Backend env vars required:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI` (e.g. `http://localhost:8000/api/auth/oauth/github/callback/`)
- `GITHUB_WEBHOOK_SECRET` — random string used to sign webhook payloads

---

**GitLab OAuth (per-project repository integration)**

Flow: `GET /api/auth/oauth/gitlab/redirect/?project_id={id}` → GitLab consent → `GET /api/auth/oauth/gitlab/callback/?code=...&state={project_id}` → creates `GitLabIntegration` record → redirects to project settings

- After connecting, set `repo_full_path` (`group/subgroup/repo`) via `PATCH /api/integrations/projects/{id}/gitlab/`
- GitLab webhooks post to `POST /api/integrations/gitlab/webhook/` (verified via `X-Gitlab-Token`)

Backend env vars required:
- `GITLAB_CLIENT_ID`
- `GITLAB_CLIENT_SECRET`
- `GITLAB_REDIRECT_URI` (e.g. `http://localhost:8000/api/auth/oauth/gitlab/callback/`)
- `GITLAB_WEBHOOK_SECRET`

---

**Bitbucket OAuth (per-project repository integration)**

Flow: `GET /api/auth/oauth/bitbucket/redirect/?project_id={id}` → Bitbucket consent → `GET /api/auth/oauth/bitbucket/callback/?code=...&state={project_id}` → creates `BitbucketIntegration` record → redirects to project settings

- After connecting, set `workspace` + `repo_slug` via `PATCH /api/integrations/projects/{id}/bitbucket/`
- Bitbucket webhooks post to `POST /api/integrations/bitbucket/webhook/`

Backend env vars required:
- `BITBUCKET_CLIENT_ID`
- `BITBUCKET_CLIENT_SECRET`
- `BITBUCKET_REDIRECT_URI` (e.g. `http://localhost:8000/api/auth/oauth/bitbucket/callback/`)

---

**Calendar Sync (Google / Outlook external events)**

Flow:
- Frontend requests an auth URL: `POST /api/integrations/calendar/{provider}/start/` (body: `team_id`)
- Provider consent → callback: `GET /api/integrations/calendar/{provider}/callback/` → stores `ExternalCalendarAccount` → redirects back to Settings

External events are fetched via:
- `GET /api/dashboard/calendar/?team_id=...&start=YYYY-MM-DD&end=YYYY-MM-DD&external=true`

Backend env vars required:
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`
- Microsoft: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`

---

**Meeting recordings transcript**

Transcription requires:
- `OPENAI_API_KEY`
- Optional: `OPENAI_TRANSCRIBE_MODEL` (default: `gpt-4o-mini-transcribe`)

*End of FlowTeam User Guide — Version 2.2*
