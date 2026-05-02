# FlowTeam - Detailed User Guide (with clear examples)

This guide explains how to use FlowTeam end-to-end: onboarding, roles (CEO/Admin/Manager/Employee), projects + tasks, Messages, Meetings, Calendar, Slack integration, and Security (2FA).

If something here doesn't match your UI exactly, check:
- Your role (permissions are enforced)
- Your team's plan limits (members/projects)
- Your deployed version/date

---

## 1) What FlowTeam is (in one minute)

FlowTeam combines:
- Projects + Tasks (Kanban workflow)
- Messages (channels + DMs, real-time)
- Meetings + Calendar (instant meetings + scheduled meetings)
- Security + Audit (company-style RBAC, 2FA, audit log)

The goal: keep work + communication + decisions in one place so teams can execute faster with fewer tools.

---

## 1.1 Demo setup (one command)

If you want a ready-to-demo workspace with sample projects, tasks, messages, meetings, and calendar items:

1. Start backend (Docker) and make sure migrations are applied.
2. Run the demo seed command:
   - `cd flowteam_backend`
   - `python manage.py seed_demo`
   - If your backend is running in Docker, run it inside the container instead:
     - `docker compose exec backend python manage.py seed_demo`

Default demo credentials created:
- demo (CEO): `demo@flowteam.local` / `Test@123` (no quotes)
- admin: `admin.demo@flowteam.local` / `Test@123`
- manager: `manager.demo@flowteam.local` / `Test@123`
- employee: `employee.demo@flowteam.local` / `Test@123`
- viewer: `viewer.demo@flowteam.local` / `Test@123`

Then open:
- `http://localhost:3000/dashboard`
- `http://localhost:3000/projects`
- `http://localhost:3000/messages`
- `http://localhost:3000/meetings`
- `http://localhost:3000/calendar`

Tip: you can re-run `python manage.py seed_demo` safely to refresh the demo data.

---

## 2) Quick start (15 minutes) - example walkthrough

We'll use an example company: Acme Studio.

### Step 1 - Register and sign in
1. Open `http://localhost:3000/register`
2. Create account:
   - Full name: `Ava CEO`
   - Email: `ava@acme.com`
   - Password: `StrongPassword123!`
3. If you aren't automatically logged in, sign in at `http://localhost:3000/login`.

### Step 2 - Create your workspace (team)
1. You'll be redirected to `/onboarding`
2. Team name: `Acme Studio`
3. Finish onboarding

Result: you now have a team/workspace, and you are the CEO of that team (owner role).

### Step 3 - Create a project
1. Open `/projects`
2. Click New Project
3. Create:
   - Name: `Website Redesign`
   - Description: `Sprint-based redesign for the marketing site`
4. Open the project

### Step 4 - Add tasks and run a Kanban workflow
Create these tasks:
- `Define brand colors and typography` (Owner: Design)
- `Build landing page hero section` (Owner: Frontend)
- `Set up analytics tracking` (Owner: Marketing)

Then:
1. Move `Build landing page hero section` from Backlog -> In Progress
2. Add a due date (example: Friday)
3. Add a comment: `ETA Friday EOD; blocked on final copy`

### Step 5 - Use Messages for coordination
1. Open `/messages`
2. Open `#general` (or your default channel)
3. Send:
   - `Kickoff at 3 PM. Please review the Website Redesign board before the meeting.`

### Step 6 - Create an instant meeting
1. Open `/meetings`
2. Create Instant meeting
3. Title: `Website redesign kickoff`
4. Select attendees (optional)
5. Open the meeting and click Start call / Join

---

## 3) Navigation map (where things live)

Common pages:
- `/` - landing page
- `/dashboard` - daily overview
- `/projects` - list of projects
- `/projects/<project_id>` - Kanban board + project workspace
- `/messages` - channels + DMs
- `/meetings` - meeting list
- `/meetings/<meeting_id>` - meeting details + join
- `/calendar` - tasks due dates + meetings
- `/settings` - profile, team, members, roles, integrations, security
- `/settings/audit` - audit log (if enabled and allowed for your role)

---

## 4) Roles and permissions (company-style RBAC)

FlowTeam uses team roles:
- CEO (owner)
- Admin
- Manager
- Employee (called `member` internally)
- Viewer

### 4.1 What each role can do (practical matrix)

Team-level actions:
- Create/edit team settings (name, etc.)
  - CEO: yes
  - Admin: yes
  - Manager: no
  - Employee: no
  - Viewer: no
- Invite new members
  - CEO: yes
  - Admin: yes
  - Manager: yes (but can only invite Employees/Viewers by default)
  - Employee: no
  - Viewer: no
- Change roles / remove members
  - CEO: yes (including CEO transfers)
  - Admin: yes (but cannot change/remove CEO)
  - Manager: no
  - Employee: no
  - Viewer: no
- Delete team
  - CEO: yes
  - Admin/Manager/Employee/Viewer: no

Important safety rules (to prevent lockouts):
- Only CEO can promote someone to CEO.
- Admin cannot remove/demote CEO.
- You cannot demote/remove the last CEO.

### 4.2 Example: recommended company setup
For Acme Studio, set:
- Ava (you): CEO
- Ben Ops: Admin
- Mia PM: Manager
- Dev team: Employees

This gives:
- Ben Ops can manage members and settings without taking ownership.
- Mia PM can invite employees and run delivery without security access.

---

## 5) Team members: inviting, changing roles, removing members

### 5.1 Invite someone by email (recommended)
1. Open `/settings`
2. Go to Members
3. Click Invite
4. Email: `mia@acme.com`
5. Role: Manager (or Employee)
6. Send invite

Invite link pattern:
- `/accept-invite/<token>`

Note:
- If the invitee has no account yet, they must register first (unless your build supports guest acceptance).

### 5.2 Change a member's role (CEO/Admin only)
1. Settings -> Members
2. Find the member
3. Click actions menu (three dots) -> Change role
4. Select new role -> Save

If you try to promote to CEO as Admin/Manager, you'll get Forbidden (backend-enforced).

### 5.3 Remove a member (CEO/Admin only)
1. Settings -> Members
2. Actions (three dots) -> Remove

CEO removal rules:
- Only CEO can remove a CEO
- You can't remove the last CEO

---

## 6) Projects (create, manage, scale)

### 6.1 Create a project
1. Open `/projects`
2. New Project
3. Example:
   - Name: `Release v1`
   - Description: `Launch checklist + rollout plan`

If you hit a plan limit error:
- The team hit its plan's max projects (or max members for invites).

### 6.2 Day-to-day project workflow (example)
Project: Website Redesign
- Backlog: ideas and unstarted work
- In Progress: active work
- Review: awaiting review
- Done: finished work

Suggested team habit:
- Daily: keep In Progress limited to work that is truly active.
- Weekly: prune backlog (archive stale tasks or re-scope them).

---

## 7) Kanban board and tasks (hands-on examples)

### 7.1 Create tasks that are easy to execute
Good task title examples:
- `Landing: implement hero section`
- `Auth: add 2FA settings copy`
- `QA: verify meeting creation flow`

Good task description template:
- Goal: outcome expected
- Context: links / screenshots / related messages
- Acceptance criteria: "done means..."

### 7.2 Assigning work and setting deadlines
Example:
1. Create: `Implement pricing section`
2. Assign to: Dev Employee
3. Due: `2026-05-01`
4. Comment: `Needed before product demo`

### 7.3 Comments that unblock teammates
Examples:
- `Status: blocked by API; waiting for backend endpoint`
- `Decision: use Slack webhooks for alerts`
- `Next: PR by Thu; review Fri`

---

## 8) Calendar (see work + meetings together)

URL: `/calendar`

You'll typically see:
- Task due dates
- Scheduled meetings

Example: sprint planning with calendar
1. Set due dates for sprint tasks to the sprint end date
2. Use the calendar to spot overloaded days
3. Move tasks earlier or redistribute ownership

---

## 9) Meetings (instant + scheduled) - end-to-end

URLs:
- Meetings list: `/meetings`
- Meeting details/join: `/meetings/<meeting_id>`

### 9.1 Instant meeting example (standup)
1. Meetings -> New meeting -> Instant
2. Title: `Daily standup`
3. Call type: Video (or Audio)
4. Select attendees (optional)
5. Create & open -> Start call

### 9.2 Scheduled meeting example (weekly planning)
1. Calendar -> New meeting -> Schedule
2. Title: `Weekly sprint planning`
3. Starts at: `2026-05-04 10:00`
4. Duration: `60 minutes`
5. Attendees: team leads
6. Schedule

At meeting time:
- Open the meeting from Calendar or Meetings list and click Join.

Backend API (authenticated; advanced users):
- `GET  /api/meetings/teams/<team_id>/meetings/?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/meetings/teams/<team_id>/meetings/` (scheduled)
- `POST /api/meetings/teams/<team_id>/meetings/instant/` (instant)
- `GET  /api/meetings/<meeting_id>/`

---

## 10) Messages (real-time chat) - best practices + examples

URL: `/messages`

FlowTeam Messages supports:
- Public channels (team-wide topics)
- Private channels / direct messages (DMs)
- Threads, reactions, pins, saved messages
- Scheduled messages (send later)
- Mark read/unread
- Mute/unmute
- Search (channels + messages)

### 10.1 Recommended channel structure (example company)
For Acme Studio:
- `#general` - announcements + broad updates
- `#engineering` - dev coordination
- `#design` - design reviews
- `#ops` - operations
- DMs - sensitive 1:1 conversations

### 10.2 Start a direct message (DM)
1. Messages -> click +
2. New direct message
3. Search teammate and click them

### 10.3 Use sidebar tools to stay focused
In the sidebar you can:
- Filter Unread only
- Hide/show muted conversations
- Use Ctrl+K to focus channel search

### 10.4 Message workflow example (decision -> action)
In `#engineering`, send:
- `Decision: ship the new landing page on Friday. @Mia please schedule a review meeting.`

Then:
1. Pin the decision message (so it stays visible)
2. Create tasks in the project board that match the decision

### 10.5 Mark unread / mute examples
If you want to "come back later":
- Mark a channel Unread

If a channel is noisy:
- Mute for 1 hour or indefinitely

### 10.6 Reliability: reconnect and message history
FlowTeam uses server-side per-channel sequence numbers (`seq`) and supports resumable message delivery in compatible clients.

---

## 11) Settings (profile, security, integrations)

URL: `/settings`

### 11.1 Profile
- Update your name and timezone
- Email is typically fixed (by design)

### 11.2 Two-Factor Authentication (2FA) - step-by-step
FlowTeam uses TOTP (Google Authenticator, 1Password, Authy, Microsoft Authenticator).

Enable 2FA (UI):
1. Settings -> Security
2. Two-factor authentication -> Set up 2FA
3. Scan QR code (or copy the secret) into your authenticator
4. Enter the 6-digit code -> Enable
5. Save backup codes (store securely)

Login with 2FA:
1. `/login`
2. Enter email/password
3. When prompted, enter `otp_code` from your authenticator (or a backup code)

Backend API fallback:
- `POST /api/auth/2fa/setup/`
- `POST /api/auth/2fa/enable/` with `{ otp_code }`
- `POST /api/auth/2fa/backup-codes/rotate/` with `{ otp_code }`
- `POST /api/auth/2fa/disable/` with `{ otp_code }` or `{ backup_code }`

### 11.3 Slack integration (webhooks)
Purpose: send alerts to Slack when events happen (messages, notifications, etc.).

Setup:
1. Create a Slack Incoming Webhook URL in Slack admin settings
2. Settings -> Integrations -> Slack Webhooks
3. Add webhook:
   - Name: `Acme Alerts`
   - Webhook URL: `https://hooks.slack.com/services/...`
4. Keep it enabled (disable to pause delivery)

API:
- `GET  /api/integrations/teams/<team_id>/slack-webhooks/`
- `POST /api/integrations/teams/<team_id>/slack-webhooks/`

Delivery notes:
- Slack delivery is handled by an outbox/worker with retries (run Celery + outbox processor in production).

---

## 12) Plan limits (Free vs Pro) - what errors mean

Common enforced limits:
- Max members (includes pending invites)
- Max active projects

If you see:
- "Team member limit reached": reduce members/invites or upgrade plan
- "Project limit reached": archive older projects or upgrade plan

---

## 13) Troubleshooting (common issues)

### "I can't invite / change roles"
- You are likely not CEO/Admin for this team, or you're trying to change a CEO role as Admin/Manager.

### "I can't delete a team"
- Only the CEO can delete a team.

### "Messages page stuck on Loading..."
Check:
- Backend reachable: `http://localhost:8000/api/health/`
- Frontend env: `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_WS_URL` if used)
- Redis running (if using Redis channel layer)

### "Login says OTP required"
- 2FA is enabled on the account; use authenticator code or backup code.

---

## 14) Known gaps + production checklist (as of 2026-04-25)

This section is intentionally blunt: these items matter for real production use. Some are fixed in this repo; others are roadmap items.

### 14.1 Fixed / improved in this build
- **Invite emails are dispatched** when you create a team invite (`POST /api/teams/<team_id>/invite/`). The API response also includes an `invite_link` you can copy/paste if your email backend isn’t configured.
- **Daily digest email is implemented** (Celery task `send_daily_digest`) for users who have email digests enabled; failures are logged and digests are retried.
- **Brute-force protection is enabled** via `django-axes` middleware and backend, and **rate limiting now applies to unauthenticated requests by IP** for key endpoint groups (not just authenticated users).

### 14.2 Still missing (roadmap)
Critical (would block many paid teams):
- **OAuth / SSO**: email+password only (no Google/GitHub/SAML).
- **Durable attachment storage**: default is local `media/` storage; production should use S3/Cloudflare R2 (not wired by default).
- **Billing / upgrades**: plan limits exist, but there’s no Stripe (or equivalent) upgrade flow.
- **Browser push notifications**: in-app notifications only; Web Push is not wired up.

Competitive disadvantage (commonly expected by teams):
- **Slack integration is output-only** (webhooks) — no `/commands` or interactive workflows.
- **No data import** (CSV/Jira/Trello/Asana), only export.
- **No GitHub/Jira linking** for tasks (commits/issues).
- **Automation is basic** (simple triggers/actions; no conditional or multi-step workflows).

### 14.3 Email setup (required for real invites/digests)
Local/dev defaults to console email output. For SMTP, configure backend env vars in the backend:
- `DEFAULT_FROM_EMAIL`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS` / `EMAIL_USE_SSL`
- `FRONTEND_BASE_URL` (used for invite links)

---

## Appendix A - Useful endpoints (operators / devs)

Health:
- `GET /api/health/`

Metrics (Prometheus):
- `GET /api/metrics/`

Team capabilities (used for RBAC gating in the UI):
- `GET /api/teams/<team_id>/capabilities/`
