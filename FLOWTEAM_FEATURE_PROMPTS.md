# FlowTeam — AI Implementation Prompts
# Next-Level Feature Roadmap

**How to use this file:**
Each section is a self-contained prompt. Paste it directly into Claude (or any AI coding assistant) as the full context for that feature. Each prompt references the real file paths, patterns, models, and conventions already in the FlowTeam codebase.

**Stack reference (always true across all prompts):**
- Backend: Django 5.0.4, DRF 3.15.1, SimpleJWT, Channels 4, Celery 5.3.6, Redis, PostgreSQL, django-guardian
- Frontend: Next.js 16.2.3, React 19, Tailwind CSS v4, Zustand, React Query v5, shadcn/ui (Radix), dnd-kit, Zod, react-hook-form, Recharts
- AI: Anthropic Claude SDK (`apps/ai/client.py`, `apps/ai/prompts.py`, `apps/ai/tasks.py`)
- Auth: JWT access + refresh tokens stored in localStorage via `src/lib/auth.ts`, API calls via `src/lib/api.ts`
- Response format: all API responses use `config/utils.py → standardize_response(data, success, error, status)`
- Permissions: team-level roles (ceo/admin/manager/member) in `apps/teams/rbac.py`, project-level roles in `apps/projects/permissions.py`

---

---

## FEATURE 1 — Custom Fields on Tasks

### Context
FlowTeam already has tasks in `apps/projects/models.py` with fixed fields (title, description, priority, status, due_date, assignee, labels, estimated_hours). We need to allow teams to define their own custom fields (Text, Number, Date, Select, Multi-select, URL, Checkbox) at the project level, and store values per task. The frontend Kanban board is in `src/components/projects/KanbanBoard.tsx`, task detail in `src/components/projects/TaskDetailPanel.tsx`, and task creation in `src/components/projects/CreateTaskModal.tsx`.

### Prompt

You are implementing **Custom Fields** for the FlowTeam project management platform.

**Backend — Django (`apps/projects/`)**

1. Create two new models in `apps/projects/models.py`:

```python
class CustomField(models.Model):
    FIELD_TYPES = [
        ("text", "Text"),
        ("number", "Number"),
        ("date", "Date"),
        ("select", "Select"),
        ("multi_select", "Multi-select"),
        ("url", "URL"),
        ("checkbox", "Checkbox"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey("Project", on_delete=models.CASCADE, related_name="custom_fields")
    name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    options = models.JSONField(default=list, blank=True)  # for select/multi_select choices
    required = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position"]
        unique_together = [("project", "name")]

class CustomFieldValue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey("Task", on_delete=models.CASCADE, related_name="custom_field_values")
    field = models.ForeignKey(CustomField, on_delete=models.CASCADE, related_name="values")
    value = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("task", "field")]
```

2. Create `CustomFieldSerializer` and `CustomFieldValueSerializer` in `apps/projects/serializers.py`. Nest `custom_field_values` into the existing `TaskSerializer` so every task response includes its custom field values. Include the `CustomField` definition (name, type, options) in the nested value so the frontend does not need a second request.

3. Add views in `apps/projects/views.py`:
   - `CustomFieldListCreateView` — `GET /api/projects/{project_id}/custom-fields/` (list) and `POST` (create). Requires manager role or above.
   - `CustomFieldDetailView` — `PATCH` (update name/options/position) and `DELETE`. Requires manager role.
   - `TaskCustomFieldValueView` — `PATCH /api/projects/{project_id}/tasks/{task_id}/custom-fields/` — accepts `{field_id: value}` dict, upserts `CustomFieldValue` records. Any project member can update values.

4. Register routes in `apps/projects/task_urls.py` and `apps/projects/urls.py`.

5. Log all custom field schema changes (create/delete field) to the audit log using the existing mixin in `apps/audit/mixins.py`.

**Frontend — Next.js (`src/`)**

1. Add types to `src/types/task.ts`:
```typescript
export interface CustomField {
  id: string;
  name: string;
  field_type: "text" | "number" | "date" | "select" | "multi_select" | "url" | "checkbox";
  options: string[];
  required: boolean;
  position: number;
}
export interface CustomFieldValue {
  field: CustomField;
  value: string | number | boolean | string[] | null;
}
```

2. In `src/components/projects/TaskDetailPanel.tsx`, add a **Custom Fields** section below the description. Render each field with the appropriate input:
   - `text` → `<Input />`
   - `number` → `<Input type="number" />`
   - `date` → `<react-day-picker>` popover
   - `select` → `<Select />` (shadcn)
   - `multi_select` → multi-select with badge chips
   - `url` → `<Input type="url" />` with external link icon
   - `checkbox` → `<Switch />`
   On blur/change, call `PATCH /api/projects/{project_id}/tasks/{task_id}/custom-fields/` via the existing `api` client in `src/lib/api.ts`. Debounce text/number inputs by 600ms.

3. In `src/components/projects/TaskCard.tsx`, show up to 2 custom field values as small badges under the task title if they have a value set.

4. Add a **Custom Fields** management tab in the project settings page at `src/app/(app)/projects/[id]/settings/permissions/page.tsx`. Show existing fields with drag-to-reorder (use `dnd-kit` already in the project), inline edit of name/options, and a "Add field" button that opens a small form (name, type, options for select types).

5. Update `src/hooks/useTasks.ts` to invalidate task queries after custom field value updates.

**Filtering & grouping:**
- Add a "Group by" dropdown to the Kanban toolbar in `src/components/projects/KanbanBoard.tsx`. When a `select`-type custom field is selected, dynamically group tasks into columns by that field's value, in addition to the default status grouping.

---

---

## FEATURE 2 — My Work View (Cross-project task view)

### Context
Currently users can only see tasks within a single project. The frontend has `src/app/(app)/dashboard/my-tasks/page.tsx` but it is limited. We need a full cross-project "My Work" view. The backend's `Task` model in `apps/projects/models.py` has an `assignee` FK to User and a `project` FK to Project.

### Prompt

You are implementing the **My Work** cross-project task view for FlowTeam.

**Backend — Django**

1. Add a new view `MyWorkView` in `apps/projects/views.py`:

```python
class MyWorkView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.filter(
            assignee=user,
            project__team__members__user=user,
        ).select_related("project", "project__team", "assignee").order_by("due_date", "priority")

        # Filters
        status = self.request.query_params.get("status")
        project_id = self.request.query_params.get("project_id")
        overdue = self.request.query_params.get("overdue")
        due_today = self.request.query_params.get("due_today")

        if status:
            qs = qs.filter(status=status)
        if project_id:
            qs = qs.filter(project_id=project_id)
        if overdue == "true":
            qs = qs.filter(due_date__lt=date.today(), status__in=["todo", "in_progress"])
        if due_today == "true":
            qs = qs.filter(due_date=date.today())
        return qs
```

Include `project_name` and `project_color` in the serialized output by adding them as `SerializerMethodField` on `TaskSerializer` (or a lightweight `MyWorkTaskSerializer`).

2. Register at `GET /api/projects/my-work/` in `apps/projects/urls.py`.

**Frontend — Next.js**

Fully rewrite `src/app/(app)/dashboard/my-tasks/page.tsx` as a rich **My Work** page:

1. **Header:** Page title "My Work", subtitle showing counts: "5 due today · 2 overdue · 12 in progress"

2. **Filter bar:**
   - Status filter: All / Todo / In Progress / In Review / Done (pill tabs)
   - Project filter: dropdown listing all user's projects with colour dot
   - Due filter: All / Due today / Overdue / This week
   - View toggle: List / Board (grouped by project)

3. **List view** (default): Group tasks by project. Each group header shows the project name, colour, and task count. Each task row shows:
   - Priority colour indicator (left border)
   - Task title (click opens `TaskDetailPanel` in a slide-over sheet)
   - Project name badge
   - Due date (red if overdue, amber if today)
   - Status badge
   - Estimated hours remaining

4. **Board view**: Columns are "Todo", "In Progress", "In Review", "Done". Tasks show project badge and due date. Use `dnd-kit` for drag between columns; on drop, call `PATCH /api/projects/{project_id}/tasks/{task_id}/` to update status.

5. **Empty state**: If no tasks assigned, show a clean illustration with "Nothing assigned to you right now" and a "Browse your projects" link.

6. Add "My Work" to the sidebar navigation in `src/components/layout/Sidebar.tsx` under the Dashboard section with a `ClipboardList` icon from lucide-react.

7. Create `src/hooks/useMyWork.ts` using React Query (`useQuery`) that calls `GET /api/projects/my-work/` with the active filters as query params. Invalidate on task status change.

---

---

## FEATURE 3 — Recurring Tasks

### Context
The Task model in `apps/projects/models.py` currently has no recurrence support. Celery Beat (`config/celery.py`, `django-celery-beat`) is already installed and running. The goal is to allow any task to be marked as recurring with a frequency, and have Celery auto-create the next instance when the current one is completed.

### Prompt

You are implementing **Recurring Tasks** for FlowTeam.

**Backend — Django**

1. Add recurrence fields to the `Task` model in `apps/projects/models.py`:

```python
RECURRENCE_CHOICES = [
    ("none", "None"),
    ("daily", "Daily"),
    ("weekly", "Weekly"),
    ("biweekly", "Bi-weekly"),
    ("monthly", "Monthly"),
    ("custom", "Custom (days)"),
]
recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default="none")
recurrence_interval_days = models.PositiveIntegerField(null=True, blank=True)  # for custom
recurrence_end_date = models.DateField(null=True, blank=True)
recurrence_parent = models.ForeignKey(
    "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="recurrence_children"
)
```

2. In `apps/projects/signals.py`, add a `post_save` signal on `Task`:
```python
@receiver(post_save, sender=Task)
def handle_task_completion(sender, instance, **kwargs):
    if instance.status == "done" and instance.recurrence != "none":
        from apps.projects.tasks import spawn_recurring_task
        spawn_recurring_task.delay(instance.id)
```

3. In `apps/projects/tasks.py`, implement `spawn_recurring_task`:
   - Load the completed task
   - Calculate `next_due_date` based on recurrence type (daily=+1d, weekly=+7d, biweekly=+14d, monthly=+1 calendar month, custom=+interval_days)
   - If `recurrence_end_date` is set and `next_due_date > recurrence_end_date`, do nothing
   - Create a new Task cloning: title, description, project, column, assignee, priority, estimated_hours, labels, recurrence fields
   - Set `recurrence_parent` to the original task's `recurrence_parent or original task id`
   - Set `due_date = next_due_date`, `status = "todo"`
   - Broadcast the new task via Django Channels to the project room so the Kanban board updates in real time (use the existing WebSocket consumer pattern in `apps/messaging/consumers.py` as reference)

4. Expose recurrence fields in `TaskSerializer`. Add validation: if `recurrence == "custom"`, `recurrence_interval_days` must be provided and ≥ 1.

5. Add a `GET /api/projects/{project_id}/tasks/{task_id}/recurrence-history/` endpoint that returns the chain of recurring task instances (parent + all children) ordered by due_date.

**Frontend — Next.js**

1. In `src/components/projects/CreateTaskModal.tsx` and `src/components/projects/TaskDetailPanel.tsx`, add a **Recurrence** section:
   - Toggle switch "Repeat this task"
   - When enabled, show: frequency selector (Daily / Weekly / Bi-weekly / Monthly / Custom)
   - If Custom: number input for interval days
   - Optional end date picker
   - Preview text: "Next occurrence: 14 May 2026"

2. On `TaskCard.tsx`, show a small `RefreshCw` (lucide) icon in the bottom-right of recurring tasks so they are visually identifiable at a glance.

3. In `TaskDetailPanel.tsx`, add a collapsible "Recurrence history" section that shows the chain of past and upcoming instances as a timeline, each clickable to open that task.

4. Update `src/types/task.ts` with the new recurrence fields.

---

---

## FEATURE 4 — Guest / External Collaborator Seats

### Context
FlowTeam currently only supports full team members with roles (ceo/admin/manager/member) defined in `apps/teams/models.py` and `apps/teams/rbac.py`. We need to add a `guest` role that can be invited to specific projects only, cannot see the team dashboard, other projects, billing, audit log, or team members list. Guest seats should not count against the member seat limit.

### Prompt

You are implementing **Guest Collaborator Seats** for FlowTeam.

**Backend — Django**

1. Add `guest` to the role choices in `apps/teams/models.py` `TeamMember` model:
```python
ROLE_CHOICES = [("ceo","CEO"),("admin","Admin"),("manager","Manager"),("member","Member"),("guest","Guest")]
```

2. Update `apps/teams/rbac.py`:
   - Guests have zero team-level permissions (cannot view team settings, members list, billing, audit log, analytics)
   - Guests ARE allowed to: view and interact with tasks/messages/meetings in projects they are explicitly added to
   - Add helper `is_guest(user, team)` → bool

3. Update `apps/teams/plans.py` — guest seats do NOT count toward the plan's member limit.

4. Add `GuestInviteView` in `apps/teams/views.py`:
   - `POST /api/teams/{team_id}/invite-guest/` — requires manager role or above
   - Accepts `{email, project_ids: [uuid, ...]}` 
   - Creates a `TeamMember` with `role="guest"` and an invite token (reuse the existing invite token pattern)
   - Adds the guest to the specified projects via `ProjectMember` records with role `viewer` (or `contributor` if specified)
   - Sends invite email using `apps/core/email.py`

5. Update all team-level views to exclude guests from member lists shown to regular members. Guests should see only: projects they are added to, the messaging channels of those projects, and their own settings.

6. Add `guest_count` to the team serializer response alongside `member_count`.

**Frontend — Next.js**

1. In `src/app/(app)/settings/page.tsx`, add a **Guests** tab next to Members:
   - Table: avatar, name, email, projects they have access to (as badges), invited date, "Revoke access" button
   - "Invite guest" button → opens a dialog: email input + project multi-select (checkboxes, only projects the current user manages)

2. In `src/components/layout/Sidebar.tsx`, for guest users, hide: Dashboard, Analytics, Settings (team), Audit Log. Show only: their accessible Projects, Messages (for those projects), Meetings, and their own profile settings.

3. In `src/app/(app)/projects/[id]/settings/permissions/page.tsx`, add a **Guests** section showing guests with access to this project and a button to add an existing team guest or invite a new one.

4. Gate the "Invite guest" UI behind the `manager` role check using the existing `usePermissions` hook in `src/hooks/usePermissions.ts`.

---

---

## FEATURE 5 — AI Standup Bot

### Context
The AI layer lives in `apps/ai/` with `client.py` (Anthropic SDK), `prompts.py`, and `tasks.py` (Celery tasks). Django Channels is running with a WebSocket consumer in `apps/messaging/consumers.py`. Channel messages are sent via `apps/messaging/services.py`. Celery Beat is configured in `config/celery.py`.

### Prompt

You are implementing the **AI Standup Bot** for FlowTeam.

**Backend — Django**

1. Create a `StandupConfig` model in `apps/ai/` (add a `models.py`):
```python
class StandupConfig(models.Model):
    team = models.OneToOneField("teams.Team", on_delete=models.CASCADE, related_name="standup_config")
    channel = models.ForeignKey("messaging.Channel", on_delete=models.SET_NULL, null=True)
    enabled = models.BooleanField(default=False)
    schedule_time = models.TimeField(default="09:00")  # team-local time
    timezone = models.CharField(max_length=50, default="UTC")
    questions = models.JSONField(default=list)  # custom questions, or use defaults
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Default questions:
```python
DEFAULT_STANDUP_QUESTIONS = [
    "What did you work on yesterday?",
    "What are you working on today?",
    "Any blockers or help needed?",
]
```

2. Create a Celery Beat periodic task in `apps/ai/tasks.py`:
   - `dispatch_standup_prompts` — runs every 5 minutes, checks all enabled `StandupConfig` records where the current UTC time matches `schedule_time` in the config's timezone (use `zoneinfo` from Python stdlib). For matching configs, fire `run_standup_for_team.delay(config.id)`.
   - `run_standup_for_team(config_id)`:
     - Fetch all active team members (excluding guests)
     - Post a standup prompt message to the configured channel via `apps/messaging/services.py → send_system_message(channel, text, thread_id=None)` (create this helper if it does not exist — it creates a `Message` from a bot user and broadcasts via Channels)
     - The message text: "🤖 **Daily Standup** — Good morning team! Please reply to this thread with your update:\n\n1. What did you work on yesterday?\n2. What are you working on today?\n3. Any blockers?"
     - Store the posted message ID in a new `StandupSession` model (team, date, channel, prompt_message_id)

3. Create `collect_and_summarise_standup(session_id)` task:
   - Called 2 hours after the standup prompt (use `apply_async(countdown=7200)`)
   - Collects all thread replies to the prompt message
   - Calls Anthropic API via `apps/ai/client.py`:
     - Prompt: "You are summarising a team standup for a project management tool. Given the following replies from team members, write a concise standup summary with three sections: **Yesterday**, **Today**, **Blockers**. Group by theme, not by person. Replies: {replies}"
     - Use `claude-sonnet-4-6` with prompt caching on the system prompt
   - Posts the AI summary back to the channel as a pinned message
   - Updates `StandupSession` with `summary`, `participant_count`, `has_blockers` flag

4. Add `StandupConfigView` (GET/PATCH) and `StandupHistoryView` (list of `StandupSession`) at `/api/teams/{team_id}/standup/`.

**Frontend — Next.js**

1. In `src/components/settings/` create `StandupBotCard.tsx`:
   - Toggle to enable/disable the standup bot
   - Channel selector (dropdown of team channels)
   - Time picker for schedule time (HTML `<input type="time">`)
   - Timezone selector (searchable select from IANA timezone list)
   - Custom questions editor: list of text inputs with drag-to-reorder and add/remove
   - "Test now" button that fires the prompt immediately regardless of schedule

2. Add `StandupBotCard` to `src/app/(app)/settings/page.tsx` inside the AI settings tab (gated behind AI plan check using `src/components/ai/AIGate.tsx`).

3. In `src/components/messaging/MessageItem.tsx`, detect standup summary messages (add a `message_type: "standup_summary"` field to the Message model) and render them with a special card layout — bold sections, participant count badge, blockers highlighted in amber.

---

---

## FEATURE 6 — Intake Forms → Tasks

### Context
FlowTeam needs a way for external users (clients, end-users) to submit requests that automatically become tasks in a project. No login required for submitters. The Task model is in `apps/projects/models.py`. Django can serve public endpoints. The frontend needs a public form page and a management UI.

### Prompt

You are implementing **Intake Forms** (public form → task creation) for FlowTeam.

**Backend — Django**

1. Create a new Django app `apps/forms/` with:

`models.py`:
```python
class IntakeForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="intake_forms")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    slug = models.SlugField(unique=True)  # used in public URL: /forms/{slug}
    is_active = models.BooleanField(default=True)
    default_column = models.ForeignKey("projects.Column", on_delete=models.SET_NULL, null=True)
    default_assignee = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    default_priority = models.CharField(max_length=20, default="normal")
    fields = models.JSONField(default=list)  # ordered list of field definitions
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    submission_count = models.PositiveIntegerField(default=0)

class FormSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(IntakeForm, on_delete=models.CASCADE, related_name="submissions")
    task = models.OneToOneField("projects.Task", on_delete=models.SET_NULL, null=True, related_name="form_submission")
    data = models.JSONField()  # raw submitted data
    submitter_email = models.EmailField(blank=True)
    submitter_name = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
```

`fields` JSON structure example:
```json
[
  {"id": "uuid", "type": "text", "label": "Your name", "required": true, "maps_to": "submitter_name"},
  {"id": "uuid", "type": "email", "label": "Your email", "required": true, "maps_to": "submitter_email"},
  {"id": "uuid", "type": "textarea", "label": "Describe the issue", "required": true, "maps_to": "task_description"},
  {"id": "uuid", "type": "select", "label": "Priority", "options": ["Low","Medium","High"], "maps_to": "task_priority"},
  {"id": "uuid", "type": "text", "label": "Company name", "required": false, "maps_to": null}
]
```

2. Public submission endpoint — NO authentication required:
   - `POST /api/forms/{slug}/submit/` — validates required fields, rate-limits by IP (10 submissions/hour using django-axes or a simple Redis counter), creates `Task` and `FormSubmission`, sends confirmation email to `submitter_email` if provided, increments `submission_count`

3. Management endpoints — authentication required, manager role or above:
   - `GET/POST /api/projects/{project_id}/intake-forms/`
   - `GET/PATCH/DELETE /api/projects/{project_id}/intake-forms/{form_id}/`
   - `GET /api/projects/{project_id}/intake-forms/{form_id}/submissions/`
   - `GET /api/forms/{slug}/` — public, returns form definition only (no auth)

4. Register `apps.forms` in `INSTALLED_APPS` in `config/settings/base.py` and add routes to `config/urls.py`.

**Frontend — Next.js**

1. **Public form page** — create `src/app/forms/[slug]/page.tsx`:
   - Server component that fetches `GET /api/forms/{slug}/` 
   - If form not found or inactive, show a clean "This form is no longer accepting submissions" page
   - Renders the form fields dynamically based on the `fields` JSON
   - Submit calls `POST /api/forms/{slug}/submit/` — on success show "Thank you! Your request has been submitted." with a checkmark animation
   - Fully public, no authentication, no nav bar — just the form and FlowTeam branding

2. **Form builder** in `src/app/(app)/projects/[id]/settings/` — add a new tab "Intake Forms":
   - List existing forms with: title, submission count, active/inactive toggle, copy link button, delete
   - "Create form" → opens a full-page builder:
     - Left panel: drag-and-drop field list (use `dnd-kit`). Field types: Short text, Long text, Email, Number, Dropdown, File upload, Date. Each field has: label, placeholder, required toggle, "Maps to" selector (task title / description / priority / custom field)
     - Right panel: live preview of the form as it will appear publicly
     - Bottom: default column, default assignee, default priority settings
     - "Publish" generates a slug and activates the form

3. **Submissions inbox** in `src/app/(app)/projects/[id]/` — add a sidebar item "Inbox" with a count badge showing unreviewed submissions. The inbox view shows submissions as cards; clicking one opens the linked task in `TaskDetailPanel`.

---

---

## FEATURE 7 — Smart Task Dependencies + Critical Path

### Context
Tasks in `apps/projects/models.py` have no dependency relationships. The timeline view exists at `src/app/(app)/projects/[id]/timeline/page.tsx`. We need to add blocking/blocked-by relationships between tasks and highlight the critical path.

### Prompt

You are implementing **Task Dependencies and Critical Path** for FlowTeam.

**Backend — Django**

1. Add a `TaskDependency` model in `apps/projects/models.py`:
```python
class TaskDependency(models.Model):
    DEPENDENCY_TYPES = [
        ("blocks", "Blocks"),        # A blocks B: B cannot start until A is done
        ("blocked_by", "Blocked by"), # inverse, stored for query convenience
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="outgoing_deps")
    to_task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="incoming_deps")
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("from_task", "to_task")]
```

Always store both directions when creating a dependency (A blocks B → save A→B and B→A records with inverse types) so queries in both directions are O(1).

2. Add validation to prevent circular dependencies. On `POST /api/projects/{project_id}/tasks/{task_id}/dependencies/`, run a DFS from `to_task` following its `outgoing_deps` — if you reach `from_task`, reject with HTTP 400 "This dependency would create a circular chain."

3. Expose dependencies in `TaskSerializer`:
```python
blocking = TaskDependencySerializer(source="outgoing_deps", many=True)
blocked_by = TaskDependencySerializer(source="incoming_deps", many=True)
is_blocked = SerializerMethodField()  # True if any blocking task is not "done"
```

4. Add `GET/POST /api/projects/{project_id}/tasks/{task_id}/dependencies/` and `DELETE /api/projects/{project_id}/tasks/{task_id}/dependencies/{dep_id}/`.

5. Add a `GET /api/projects/{project_id}/critical-path/` endpoint:
   - Build a directed acyclic graph of all tasks with due dates
   - Run the **Critical Path Method (CPM)**: forward pass to calculate earliest start/finish, backward pass to calculate latest start/finish
   - Return task IDs on the critical path (float = 0) plus their earliest/latest dates
   - If tasks have no due dates, use estimated_hours to calculate duration

**Frontend — Next.js**

1. In `src/components/projects/TaskDetailPanel.tsx`, add a **Dependencies** section:
   - "Blocked by" list: shows blocking tasks with their status. If a blocker is not Done, show a red badge "Blocking".
   - "Blocks" list: tasks that this task is blocking.
   - "Add dependency" button: opens a task search popover (`cmdk` already installed) filtered to the same project. On select, calls `POST` to create the dependency. Prevent adding the task to itself or creating circles (show error from backend).

2. In `src/components/projects/TaskCard.tsx`, show a `Lock` icon (lucide) when `is_blocked === true` with a red tint so blocked tasks are immediately visible on the Kanban board.

3. In `src/app/(app)/projects/[id]/timeline/page.tsx`, add dependency arrows between task bars (SVG lines connecting the end of the blocker bar to the start of the blocked task bar). Draw critical path tasks with a red/amber border instead of the default colour. Add a "Show critical path" toggle in the timeline toolbar.

4. Add an "Impact" button in `TaskDetailPanel` that calls `GET /api/projects/{project_id}/critical-path/` and opens a modal showing: "If this task slips by N days, the following milestones are affected: ..." (compute from the critical path data).

---

---

## FEATURE 8 — Time Tracking → Invoicing

### Context
Time tracking already exists on tasks (estimated_hours, a time log model). The billing app exists at `apps/billing/` with `stripe.py`. The client portal exists at `src/app/(app)/projects/[id]/billing/page.tsx`. We need to add billable/non-billable flags, hourly rates, and PDF invoice generation.

### Prompt

You are implementing **Time Tracking to Invoice** generation for FlowTeam.

**Backend — Django**

1. Add to the existing time log model in `apps/projects/models.py` (or wherever it lives):
```python
# On the TimeLog model:
billable = models.BooleanField(default=True)
hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
# If null, inherit from ProjectBillingConfig.default_rate
```

2. Create `ProjectBillingConfig` model in `apps/billing/models.py`:
```python
class ProjectBillingConfig(models.Model):
    project = models.OneToOneField("projects.Project", on_delete=models.CASCADE, related_name="billing_config")
    client_name = models.CharField(max_length=200, blank=True)
    client_email = models.EmailField(blank=True)
    client_address = models.TextField(blank=True)
    default_hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="EUR")
    invoice_prefix = models.CharField(max_length=10, default="INV")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    updated_at = models.DateTimeField(auto_now=True)

class Invoice(models.Model):
    STATUS = [("draft","Draft"),("sent","Sent"),("paid","Paid"),("void","Void")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    date_from = models.DateField()
    date_to = models.DateField()
    line_items = models.JSONField()  # snapshot of time logs at generation time
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_path = models.CharField(max_length=500, blank=True)
    sent_at = models.DateTimeField(null=True)
    paid_at = models.DateTimeField(null=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

3. Invoice generation endpoint — `POST /api/projects/{project_id}/invoices/generate/`:
   - Accepts `{date_from, date_to}` 
   - Queries all billable `TimeLog` records in the date range for that project
   - Groups by task, calculates hours × rate per entry
   - Applies tax_rate from `ProjectBillingConfig`
   - Generates a PDF using `reportlab` (already installed):
     - Header: FlowTeam logo, team name, invoice number, date
     - Client details block
     - Line items table: Task name | Hours | Rate | Amount
     - Subtotal, tax, total
     - Footer: payment terms, contact email
   - Saves PDF to `MEDIA_ROOT/invoices/{team_id}/{invoice_number}.pdf`
   - Returns the `Invoice` record with a `download_url`

4. `POST /api/projects/{project_id}/invoices/{invoice_id}/send/` — emails the PDF to `client_email` using `apps/core/email.py`, updates `status="sent"`, `sent_at=now()`.

5. `PATCH /api/projects/{project_id}/invoices/{invoice_id}/` — mark as paid, void, etc.

**Frontend — Next.js**

1. In `src/app/(app)/projects/[id]/billing/page.tsx`, build a full billing dashboard:

   **Billing config section** (top): client name, email, address, default hourly rate, currency, tax rate, invoice prefix — editable form with auto-save.

   **Time summary section**: date range picker + "Generate Invoice" button. Below it, a table of unbilled hours grouped by team member — member name, hours logged, billable hours, projected invoice amount.

   **Invoices table**: invoice number, date range, total, status badge (Draft/Sent/Paid/Void), download PDF button, send button, mark paid button.

2. In `src/components/projects/TaskDetailPanel.tsx` time log section, add a "Billable" toggle and rate override input per time entry.

3. Create a public invoice view at `src/app/invoice/[invoice_id]/page.tsx` — a clean, print-friendly invoice page (no nav, white background) accessible via a signed URL. Style it like a real invoice: logo, line items table, totals, payment instructions.

---

---

## FEATURE 9 — Team Wikis / Docs

### Context
The project docs page exists at `src/app/(app)/projects/[id]/docs/page.tsx` but needs a full block editor. Rich embeds already work via `src/components/embeds/RichEmbeds.tsx` and `src/lib/embeds.ts`. We need Notion-style block editing for team and project docs.

### Prompt

You are implementing **Team Wikis and Project Docs** with a block editor for FlowTeam.

**Backend — Django**

1. Create `apps/docs/` Django app with:

```python
class Doc(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="docs")
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="docs")
    title = models.CharField(max_length=500, default="Untitled")
    content = models.JSONField(default=list)  # list of block objects
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")
    is_team_level = models.BooleanField(default=False)  # True = team wiki, False = project doc
    icon = models.CharField(max_length=10, blank=True)  # emoji icon
    cover_color = models.CharField(max_length=20, blank=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    last_edited_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)  # for client portal sharing

class DocBlock(models.Model):
    """Flat block store for efficient partial updates"""
    BLOCK_TYPES = [
        ("paragraph","Paragraph"), ("heading1","H1"), ("heading2","H2"), ("heading3","H3"),
        ("bullet","Bullet list"), ("numbered","Numbered list"), ("todo","To-do"),
        ("code","Code block"), ("quote","Quote"), ("divider","Divider"),
        ("image","Image"), ("embed","Embed"), ("table","Table"), ("callout","Callout"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc = models.ForeignKey(Doc, on_delete=models.CASCADE, related_name="blocks")
    block_type = models.CharField(max_length=30, choices=BLOCK_TYPES)
    content = models.JSONField(default=dict)  # type-specific content
    position = models.FloatField(default=0)  # fractional indexing for reorder
    parent_block = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

2. API endpoints:
   - `GET/POST /api/teams/{team_id}/docs/` — team-level docs (wiki)
   - `GET/POST /api/projects/{project_id}/docs/` — project docs
   - `GET/PATCH/DELETE /api/docs/{doc_id}/`
   - `GET/POST/PATCH/DELETE /api/docs/{doc_id}/blocks/` — block-level CRUD for real-time editing
   - `POST /api/docs/{doc_id}/ai-summarise/` — AI summary of doc content
   - `GET /api/docs/public/{doc_id}/` — public read (no auth, only if `is_public=True`)

3. Broadcast doc changes via Django Channels: when a block is created/updated/deleted, broadcast `{type: "doc_update", doc_id, block_id, operation, data}` to a `doc_{doc_id}` group. This enables real-time collaborative editing.

**Frontend — Next.js**

1. Build `src/components/docs/BlockEditor.tsx` — a custom block editor:

   **Blocks supported:**
   - `/` slash command menu (use `cmdk`) — type `/` to open block type picker
   - Paragraph: auto-growing textarea
   - Headings (H1/H2/H3): large text with `#`/`##`/`###` markdown shortcut
   - Bullet list: `- ` shortcut, nested with Tab/Shift-Tab
   - Numbered list: `1. ` shortcut
   - Todo: checkbox + text, clicking checkbox calls PATCH to update `content.checked`
   - Code block: monospace, language selector, copy button
   - Quote: left border accent
   - Divider: `---` shortcut
   - Callout: emoji picker + coloured background (info/warning/success/error)
   - Embed: calls existing `src/lib/embeds.ts` — supports Figma, Google Drive, Miro, YouTube
   - Image: drag-drop or URL paste, upload via `POST /api/docs/{doc_id}/blocks/` with file

   **Editing interactions:**
   - Click anywhere on a block to focus it
   - Enter at end of block = new paragraph below
   - Backspace on empty block = delete it and focus previous
   - Drag handle on hover (six-dot icon) for reorder — use `dnd-kit`
   - Fractional indexing for block positions to avoid re-numbering all blocks on reorder

2. Replace `src/app/(app)/projects/[id]/docs/page.tsx` with a full docs page:
   - Left sidebar: doc tree (nested, collapsible). "New doc" button. Search within docs.
   - Main area: `BlockEditor` component with doc title (editable h1 at the top), last-edited info
   - Top right: Share toggle (make public for client portal), AI summarise button, export as Markdown/PDF

3. Add a team Wiki section at `src/app/(app)/settings/wiki/page.tsx` for team-level docs (not tied to a project). Add "Wiki" to `src/components/layout/Sidebar.tsx` with a `BookOpen` icon.

4. Connect WebSocket via `src/hooks/useWebSocket.ts` to the `doc_{doc_id}` channel for real-time multi-user editing. Show collaborator avatars in the doc header (who else is viewing/editing).

---

---

## FEATURE 10 — Goal Tracking / OKRs

### Context
No OKR feature exists in the codebase. The dashboard in `src/app/(app)/dashboard/page.tsx` has space for high-level widgets. The analytics app `apps/analytics/` exists. Milestones exist in `apps/projects/models.py`.

### Prompt

You are implementing **Goal Tracking and OKRs** for FlowTeam.

**Backend — Django**

1. Create `apps/goals/` with:

```python
class Objective(models.Model):
    TIMEFRAME = [("q1","Q1"),("q2","Q2"),("q3","Q3"),("q4","Q4"),("annual","Annual"),("custom","Custom")]
    OWNER_LEVEL = [("company","Company"),("team","Team"),("personal","Personal")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="objectives")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    owner = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    owner_level = models.CharField(max_length=20, choices=OWNER_LEVEL, default="team")
    timeframe = models.CharField(max_length=20, choices=TIMEFRAME)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, default="on_track")  # on_track, at_risk, off_track, done
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class KeyResult(models.Model):
    KR_TYPES = [("numeric","Numeric"),("percentage","Percentage"),("boolean","Binary (yes/no)"),("milestone","Milestone")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objective = models.ForeignKey(Objective, on_delete=models.CASCADE, related_name="key_results")
    title = models.CharField(max_length=300)
    kr_type = models.CharField(max_length=20, choices=KR_TYPES)
    target_value = models.FloatField(default=100)
    current_value = models.FloatField(default=0)
    unit = models.CharField(max_length=50, blank=True)  # e.g. "deals", "%", "NPS points"
    owner = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    linked_milestone = models.ForeignKey("projects.Milestone", null=True, blank=True, on_delete=models.SET_NULL)
    auto_update = models.BooleanField(default=False)  # if True, derive progress from linked tasks/milestones
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def progress(self) -> float:
        if self.kr_type == "boolean":
            return 100.0 if self.current_value >= 1 else 0.0
        if self.target_value == 0:
            return 0.0
        return min(round((self.current_value / self.target_value) * 100, 1), 100.0)
```

2. Auto-update logic: if `KeyResult.auto_update=True` and `linked_milestone` is set, a post-save signal on `Milestone` completion recalculates `current_value`. If linked to tasks (via a `KeyResultTask` M2M), calculate progress as `done_tasks / total_tasks * target_value`.

3. AI risk detection — Celery Beat task runs nightly:
   - For each `Objective` in the current timeframe, check: elapsed time % vs average KR progress %
   - If progress is more than 20% behind the time elapsed, set `status = "at_risk"` and send a notification to the objective owner
   - Use Anthropic AI to generate a one-sentence risk summary: "Sprint velocity is 40% behind pace needed to hit 'Ship v2.0' by end of Q2."

4. Endpoints: full CRUD for `Objective` and `KeyResult` under `/api/teams/{team_id}/goals/`. `PATCH /api/goals/key-results/{kr_id}/check-in/` accepts `{current_value, note}` to log a progress check-in.

**Frontend — Next.js**

1. Create `src/app/(app)/goals/page.tsx`:
   - Timeframe filter tabs: Q1 / Q2 / Q3 / Q4 / Annual
   - Owner level filter: Company / Team / Personal
   - Each Objective rendered as an expandable card:
     - Title, owner avatar, timeframe badge, status badge (on-track=green, at-risk=amber, off-track=red)
     - Overall progress: average of all KR progresses, shown as a progress bar
     - Expanded: list of Key Results, each with:
       - Title, owner
       - Progress bar (filled proportionally)
       - Current value / target value (e.g. "23 / 50 deals")
       - "Check-in" button → popover with numeric input and optional note
   - "New Objective" button → multi-step form: objective details → add key results → link milestones/tasks

2. In `src/app/(app)/dashboard/page.tsx`, add an **OKR Summary** widget:
   - Shows the 3 most-at-risk objectives with status badges
   - "View all goals" link

3. In `src/components/layout/Sidebar.tsx`, add "Goals" navigation item with a `Target` icon (lucide-react), visible to all roles.

4. Gate the "Company" level objectives behind CEO/Admin roles using `usePermissions`.

---

---

## FEATURE 11 — Public API + Outbound Webhooks

### Context
FlowTeam has no public API. The backend uses DRF with JWT for internal auth. The integrations app `apps/integrations/` has outbound webhook support for Slack (`apps/integrations/outbox.py`). We need to extend this to a full developer API with API keys and configurable outbound webhooks for any event.

### Prompt

You are implementing a **Public REST API with API Key auth and configurable Outbound Webhooks** for FlowTeam.

**Backend — Django**

**Part A — API Keys**

1. Add `APIKey` model in `apps/users/models.py`:
```python
class APIKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=8)    # e.g. "ft_live_"
    key_hash = models.CharField(max_length=128)     # SHA-256 of the full key
    scopes = models.JSONField(default=list)         # ["tasks:read", "tasks:write", "projects:read", ...]
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    last_used_at = models.DateTimeField(null=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

Key format: `ft_live_{32 random chars}`. Store only the SHA-256 hash. Show full key to user ONCE at creation — never again.

2. Create `APIKeyAuthentication` class in `apps/users/tokens.py` (alongside existing JWT token logic):
```python
class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        key = request.META.get("HTTP_AUTHORIZATION", "").removeprefix("Bearer ").strip()
        if not key.startswith("ft_"):
            return None
        prefix = key[:8]
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        api_key = APIKey.objects.filter(key_prefix=prefix, key_hash=key_hash, is_active=True).select_related("team").first()
        if not api_key:
            raise AuthenticationFailed("Invalid API key")
        if api_key.expires_at and api_key.expires_at < timezone.now():
            raise AuthenticationFailed("API key expired")
        APIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())
        return (api_key.created_by, api_key)  # (user, auth)
```

Add `APIKeyAuthentication` to `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` in settings.

3. Add API key management endpoints at `/api/teams/{team_id}/api-keys/` (CRUD, admin role required). `POST` response includes the full key (one-time only).

**Part B — Outbound Webhooks**

1. Extend `apps/integrations/models.py` with a general `WebhookEndpoint` model:
```python
class WebhookEndpoint(models.Model):
    EVENTS = [
        ("task.created","task.created"), ("task.updated","task.updated"),
        ("task.completed","task.completed"), ("task.deleted","task.deleted"),
        ("sprint.started","sprint.started"), ("sprint.completed","sprint.completed"),
        ("member.joined","member.joined"), ("member.left","member.left"),
        ("project.created","project.created"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="webhook_endpoints")
    url = models.URLField()
    secret = models.CharField(max_length=64)  # HMAC-SHA256 signing secret
    events = models.JSONField(default=list)   # list of subscribed event types
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_triggered_at = models.DateTimeField(null=True)
    failure_count = models.PositiveIntegerField(default=0)
```

2. Create `apps/integrations/webhook_dispatcher.py`:
```python
def dispatch_event(team_id: str, event_type: str, payload: dict):
    """Call this from signals/views when something happens."""
    endpoints = WebhookEndpoint.objects.filter(team_id=team_id, is_active=True, events__contains=[event_type])
    for endpoint in endpoints:
        deliver_webhook.delay(endpoint.id, event_type, payload)

@shared_task(bind=True, max_retries=5)
def deliver_webhook(self, endpoint_id: str, event_type: str, payload: dict):
    endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    body = json.dumps({"event": event_type, "timestamp": timezone.now().isoformat(), "data": payload})
    signature = hmac.new(endpoint.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    try:
        response = requests.post(
            endpoint.url,
            data=body,
            headers={"Content-Type": "application/json", "X-FlowTeam-Signature": f"sha256={signature}"},
            timeout=10,
        )
        response.raise_for_status()
        WebhookEndpoint.objects.filter(pk=endpoint_id).update(last_triggered_at=timezone.now(), failure_count=0)
    except requests.RequestException as exc:
        WebhookEndpoint.objects.filter(pk=endpoint_id).update(failure_count=F("failure_count") + 1)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
```

3. Wire `dispatch_event` calls into existing signals in `apps/projects/signals.py` for task events and sprint events.

4. Add a `DeliveryLog` model to track the last 100 delivery attempts per endpoint (status code, response time, success). Expose via `GET /api/teams/{team_id}/webhooks/{endpoint_id}/deliveries/`.

**Frontend — Next.js**

1. In `src/app/(app)/settings/page.tsx`, add a **Developer** tab (visible to admin/CEO only):

   **API Keys section:**
   - Table: name, prefix, scopes, last used, expiry, revoke button
   - "Create API key" → dialog: name input, scope checkboxes, expiry (optional)
   - After creation, show full key in a copy-to-clipboard box with warning "Save this — you won't see it again"

   **Webhooks section:**
   - Table: URL (truncated), subscribed events as badges, status, last triggered, failure count, delete button
   - "Add webhook" → dialog: URL, secret (auto-generated, copyable), event checkboxes
   - Each webhook row: "Test" button (sends a `ping` event), "View deliveries" (slide-over showing last 100 attempts with status codes and timestamps)

---

---

## FEATURE 12 — AI Meeting Co-pilot (Real-time + Post-meeting)

### Context
Meetings exist in `apps/meetings/` with a model and views. The frontend meeting room is at `src/app/(app)/meetings/[id]/page.tsx`. The AI app is at `apps/ai/` with `client.py` (Anthropic SDK), `prompts.py`, `tasks.py`. `OPENAI_API_KEY` is available for Whisper transcription (already used in v2.2 for recording transcripts). The messaging app `apps/messaging/` can broadcast WebSocket events.

### Prompt

You are implementing the **AI Meeting Co-pilot** for FlowTeam — real-time assistance during meetings and automated post-meeting processing.

**Backend — Django**

1. Add to `apps/meetings/models.py`:
```python
class MeetingTranscriptSegment(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="transcript_segments")
    speaker = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    text = models.TextField()
    start_time = models.FloatField()  # seconds from meeting start
    end_time = models.FloatField()
    confidence = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

class MeetingActionItem(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="action_items")
    text = models.TextField()
    assignee_name = models.CharField(max_length=200, blank=True)  # extracted from transcript
    assignee = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)  # resolved
    due_date_raw = models.CharField(max_length=100, blank=True)  # e.g. "by Friday"
    due_date = models.DateField(null=True, blank=True)  # resolved
    task = models.OneToOneField("projects.Task", null=True, blank=True, on_delete=models.SET_NULL)
    confirmed = models.BooleanField(default=False)  # manager confirms before task creation
    created_at = models.DateTimeField(auto_now_add=True)

class MeetingAgenda(models.Model):
    meeting = models.OneToOneField(Meeting, on_delete=models.CASCADE, related_name="agenda")
    items = models.JSONField(default=list)  # [{title, duration_min, notes, status: pending/active/done}]
    ai_generated = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
```

2. **Real-time transcript ingestion** endpoint: `POST /api/meetings/{meeting_id}/transcript/segment/` (auth required, attendee only):
   - Accepts `{speaker_id, text, start_time, end_time}` — called from the frontend every ~5 seconds with the latest Whisper output for that speaker's audio chunk
   - Saves `MeetingTranscriptSegment`
   - Broadcasts via Channels to the meeting room: `{type: "transcript_update", segment: {...}}`
   - Every 10 new segments, trigger `detect_action_items.delay(meeting_id)` (Celery)

3. `detect_action_items(meeting_id)` Celery task:
   - Fetch the last 20 transcript segments
   - Call Anthropic API with prompt: "You are an AI assistant in a live meeting. Read the following transcript excerpt and identify any explicit action items or commitments. Return a JSON array: [{text, assignee_name, due_date_raw}]. Only return items where someone explicitly committed to do something. Transcript: {text}"
   - Use `claude-haiku-4-5-20251001` for speed (low latency matters here)
   - For each new action item found, save `MeetingActionItem` and broadcast `{type: "action_item_detected", item: {...}}` to the meeting room via Channels

4. **Post-meeting processing** — when meeting status changes to "ended" (update existing meeting end logic in `apps/meetings/views.py`), trigger `process_meeting_end.delay(meeting_id)`:
   - Generate full transcript summary using `claude-sonnet-4-6` with the full transcript text
   - Prompt: "Summarise this meeting transcript. Output: 1) A 3-5 sentence executive summary. 2) Key decisions made. 3) Open questions. 4) Action items with owners and dates. Format as structured JSON."
   - Store summary on the `Meeting` model in a `ai_summary` JSONField
   - For confirmed `MeetingActionItem` records (`confirmed=True`), auto-create `Task` objects in the linked project
   - Send a summary email to all attendees using `apps/core/email.py`
   - Generate "Next meeting agenda" using AI based on open action items and unresolved questions

**Frontend — Next.js**

1. In `src/app/(app)/meetings/[id]/page.tsx`, add a collapsible **Co-pilot panel** on the right side:

   **Live transcript tab:**
   - Scrolling transcript with speaker labels (colour-coded per attendee)
   - New segments appear with a brief fade-in animation
   - Search within transcript

   **Action items tab:**
   - Real-time list of AI-detected action items
   - Each item: text, suggested assignee (with "Change" button), suggested due date (editable)
   - "Confirm" button (green) — marks the item as confirmed for task creation
   - "Dismiss" button (grey) — removes it from the list

   **Agenda tab:**
   - List of agenda items with duration estimates
   - Active item highlighted
   - "Mark done" advances to next item
   - Timer showing elapsed time for current item vs estimated

2. **Post-meeting summary page** — after meeting ends, show a summary screen (in the same route):
   - AI-generated summary card
   - Confirmed action items list with "Create all as tasks" button
   - Option to assign each action item to a project/column before creating
   - "Send summary to attendees" button

3. **Agenda builder** in `src/components/meetings/CreateMeetingDialog.tsx` and `EditMeetingDialog.tsx`:
   - Add "Agenda" section with drag-reorder list of agenda items (title + duration in minutes)
   - "Generate agenda with AI" button — calls `POST /api/meetings/{meeting_id}/ai-agenda/` which uses Claude to draft an agenda based on the meeting title, linked project's open tasks, and any notes provided

---

---

## FEATURE 13 — SSO / SAML 2.0

### Context
FlowTeam has Google OAuth via `apps/users/oauth_views.py`. We need enterprise SSO via SAML 2.0 (Okta, Azure AD, Google Workspace SAML). The `python3-saml` library handles SAML parsing. This is gated behind a new "Enterprise" plan tier.

### Prompt

You are implementing **SAML 2.0 Single Sign-On (SSO)** for FlowTeam enterprise customers.

**Backend — Django**

1. Install `python3-saml` and `lxml`. Add to `requirements.txt`.

2. Create `apps/users/sso_models.py` (add to `users/models.py`):
```python
class SSOConfiguration(models.Model):
    PROVIDERS = [("okta","Okta"),("azure","Azure AD"),("google_saml","Google Workspace"),("custom","Custom SAML")]
    team = models.OneToOneField("teams.Team", on_delete=models.CASCADE, related_name="sso_config")
    provider = models.CharField(max_length=20, choices=PROVIDERS)
    is_enabled = models.BooleanField(default=False)
    enforce_sso = models.BooleanField(default=False)  # if True, blocks password login for SSO-provisioned users
    idp_entity_id = models.TextField()
    idp_sso_url = models.URLField()
    idp_slo_url = models.URLField(blank=True)
    idp_x509_cert = models.TextField()
    sp_entity_id = models.CharField(max_length=200)  # auto-generated: "flowteam/{team_id}"
    attribute_mapping = models.JSONField(default=dict)  # {"email": "nameID", "first_name": "firstName", ...}
    jit_provisioning = models.BooleanField(default=True)  # auto-create user on first SSO login
    default_role = models.CharField(max_length=20, default="member")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

3. Create `apps/users/sso_views.py`:
   - `SSOInitiateView` — `GET /api/auth/sso/{team_slug}/login/` — public, looks up team by slug, generates SAML AuthnRequest, redirects to IdP SSO URL
   - `SSOCallbackView` — `POST /api/auth/sso/{team_slug}/callback/` — public, validates SAML Response using `python3-saml`, extracts email + attributes, finds or creates user (if JIT enabled), calls `_issue_tokens_and_redirect(user)` (reuse from `oauth_views.py`)
   - `SSOMetadataView` — `GET /api/auth/sso/{team_slug}/metadata/` — returns SP metadata XML for the IdP to consume
   - `SSOConfigView` — `GET/PATCH /api/teams/{team_id}/sso/` — admin only, manage SSO configuration

4. The SP metadata XML should contain: `entityID`, `AssertionConsumerService URL`, `NameIDFormat`, and the SP's X.509 certificate (auto-generated per team on first SSO setup, stored in `SSOConfiguration`).

5. If `enforce_sso=True`, add middleware that intercepts login attempts for users with `oauth_provider="saml"` and redirects them to the SSO flow instead of showing the password form.

6. Log all SSO login events to the audit log.

**Frontend — Next.js**

1. In `src/app/(auth)/login/LoginClient.tsx`:
   - Add a "Sign in with SSO" button below the Google button
   - Clicking opens a dialog: "Enter your company email or workspace domain"
   - On submit, call `GET /api/auth/sso/lookup/?email={email}` (new endpoint that returns the team's SSO URL if configured, or 404)
   - If found, redirect to the SSO initiate URL

2. In `src/app/(app)/settings/page.tsx`, add an **SSO** tab (CEO/Admin only, Enterprise plan gate):
   - Provider selector (Okta / Azure AD / Google Workspace / Custom)
   - Input fields: IdP Entity ID, SSO URL, SLO URL, X.509 certificate (textarea)
   - Attribute mapping table: FlowTeam field → IdP attribute name
   - "Enforce SSO" toggle with warning: "Users with password accounts will be required to use SSO after enabling this"
   - "Test SSO" button: initiates a test login flow in a popup and reports back success/failure
   - SP Metadata section: shows the auto-generated SP Entity ID and metadata URL, with a "Download metadata XML" button for easy IdP setup

---

---

## FEATURE 14 — Advanced Analytics Dashboard

### Context
The analytics app `apps/analytics/` has views but no models. The frontend has `recharts` installed. The projects app has tasks with status, due_date, completed_at, created_at, estimated_hours, and time logs. Sprints have start_date, end_date, and linked tasks.

### Prompt

You are implementing an **Advanced Analytics Dashboard** for FlowTeam.

**Backend — Django**

1. Add computed analytics endpoints in `apps/analytics/views.py`. All endpoints require authentication and team membership. Expensive queries should be cached in Redis for 1 hour using `django-redis` (already installed).

   **Endpoint: `GET /api/analytics/{team_id}/velocity/`**
   - Query params: `project_id`, `last_n_sprints` (default 6)
   - Returns: per-sprint data `{sprint_name, planned_points, completed_points, completion_rate, start_date, end_date}`
   - Velocity = story points (or task count if no points) completed per sprint

   **Endpoint: `GET /api/analytics/{team_id}/cycle-time/`**
   - Returns: per-column average time a task spends there (computed from task status change history — add `TaskStatusHistory` model to track this)
   - Also returns: overall average cycle time (creation → done), lead time (first "in_progress" → done)

   **Endpoint: `GET /api/analytics/{team_id}/workload/`**
   - Returns: per-member `{user_id, name, avatar, assigned_count, overdue_count, completed_this_week, estimated_hours_remaining, capacity_percent}`
   - `capacity_percent = estimated_hours_remaining / (40 - hours_logged_this_week) * 100`

   **Endpoint: `GET /api/analytics/{team_id}/delivery-predictability/`**
   - For each of the last 8 sprints, calculate: `{planned, actual, on_time_tasks_pct, slipped_tasks, avg_slip_days}`
   - Also return: `predicted_completion_pct` for the current sprint based on current velocity

   **Endpoint: `GET /api/analytics/{team_id}/burndown/{sprint_id}/`**
   - Returns daily data points for the burndown chart: `{date, remaining_points, ideal_remaining}`

2. Add `TaskStatusHistory` model to `apps/projects/models.py`:
```python
class TaskStatusHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
```
Record a `TaskStatusHistory` entry in `apps/projects/signals.py` every time a task's `status` field changes.

**Frontend — Next.js**

1. Fully rebuild `src/app/(app)/portfolio/page.tsx` as the **Analytics Dashboard**:

   **Top: Metrics bar** — 4 stat cards: Sprint velocity (this sprint vs last), On-time delivery %, Average cycle time, Team capacity %

   **Row 1 — Velocity chart** (full width): Bar chart (Recharts `BarChart`) showing planned vs completed per sprint. X-axis: sprint names. Two bar groups per sprint: planned (indigo) and completed (emerald). Hover tooltip shows sprint dates and completion rate.

   **Row 2 — Split layout:**
   - Left (60%): **Cycle time funnel** — horizontal bar per column showing average hours tasks spend there. Columns sorted by board position. Color shifts red as time increases.
   - Right (40%): **Delivery predictability** — line chart showing on-time % per sprint. Trend line. Current sprint prediction with confidence band.

   **Row 3 — Workload grid:**
   - Card per team member: avatar, name, role
   - Capacity bar (green→amber→red based on %)
   - Stats: X assigned, Y overdue, Z completed this week
   - Overloaded members (>90%) get an amber warning border

   **Row 4 — Burndown chart (current sprint):**
   - Line chart: ideal burndown (straight line) vs actual remaining (actual line)
   - Red zone when actual is above ideal
   - Projected completion date based on current slope

2. Add project-level analytics at `src/app/(app)/projects/[id]/reports/page.tsx`:
   - Same charts but scoped to one project
   - Additional: custom field distribution charts (e.g. pie chart of tasks by "Bug Type" custom field)
   - Export button: calls `POST /api/analytics/{team_id}/export/` which generates an XLSX using `openpyxl` (already installed)

---

---

## FEATURE 15 — Async Video Updates (Loom-style)

### Context
The messaging app already supports file uploads. The meetings app has recording upload support (v2.2). We need native screen/camera recording inside tasks and channels. Whisper transcription is already wired for meeting recordings in `apps/meetings/tasks.py` — reuse that pattern.

### Prompt

You are implementing **Async Video Updates** (record and share short video messages) for FlowTeam.

**Backend — Django**

1. Add to `apps/messaging/models.py` (or create `apps/media/models.py`):
```python
class VideoMessage(models.Model):
    STATUS = [("uploading","Uploading"),("processing","Processing"),("ready","Ready"),("failed","Failed")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE)
    recorded_by = models.ForeignKey("users.User", on_delete=models.CASCADE)
    title = models.CharField(max_length=300, blank=True)
    duration_seconds = models.FloatField(null=True)
    status = models.CharField(max_length=20, choices=STATUS, default="uploading")
    file_path = models.CharField(max_length=500, blank=True)
    thumbnail_path = models.CharField(max_length=500, blank=True)
    transcript = models.TextField(blank=True)
    ai_summary = models.TextField(blank=True)
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

2. Upload endpoint: `POST /api/videos/upload/`:
   - Accepts multipart `{file, title}` — WebM or MP4, max 500MB
   - Saves file to `MEDIA_ROOT/videos/{team_id}/{uuid}.webm`
   - Creates `VideoMessage` with `status="processing"`
   - Fires `process_video.delay(video_id)` Celery task

3. `process_video(video_id)` task:
   - Extract thumbnail at 1-second mark using `ffmpeg` subprocess (check if available, gracefully skip if not)
   - Calculate duration using `ffprobe` subprocess
   - Transcribe using OpenAI Whisper API: `POST https://api.openai.com/v1/audio/transcriptions` with the video file
   - Use Anthropic to summarise transcript: "Summarise this video message in 1-2 sentences: {transcript}"
   - Update `VideoMessage` with transcript, summary, duration, thumbnail_path, `status="ready"`
   - Broadcast `{type: "video_ready", video_id}` via Channels to the uploader

4. `GET /api/videos/{video_id}/` — returns full details including transcript and summary. Increments view count.

5. `GET /api/videos/{video_id}/stream/` — streams the video file with range request support for seek support in `<video>` elements.

**Frontend — Next.js**

1. Create `src/components/video/VideoRecorder.tsx`:
   - Uses `MediaRecorder` API with `{video: true, audio: true}` for camera+mic, or `{video: {displaySurface: "monitor"}}` for screen capture
   - **Recording UI:**
     - Camera preview in a floating bubble (bottom-right) when screen recording
     - Red pulsing record button, timer showing elapsed time, "Stop" button
     - Max recording duration: 5 minutes (auto-stop at 5:00 with warning at 4:45)
   - On stop: shows preview of the recording, "Use this" and "Re-record" buttons
   - "Use this" → uploads via `POST /api/videos/upload/` with a progress bar
   - Shows "Processing…" state while Celery processes the video, then refreshes to show the embed

2. Create `src/components/video/VideoEmbed.tsx`:
   - Shows thumbnail with play button overlay
   - Duration badge in bottom-right of thumbnail
   - Click → opens a modal with `<video>` player, transcript accordion, AI summary card
   - View count shown below the player

3. Wire `VideoRecorder` into two places:
   - **In task detail** (`src/components/projects/TaskDetailPanel.tsx`): add a "Record update" button in the comments section toolbar. After upload, the video appears as a comment attachment with `VideoEmbed`.
   - **In messaging** (`src/components/messaging/ChatArea.tsx`): add a camera icon in the message input toolbar. Video messages render as `VideoEmbed` in the chat thread.

4. Show a "Video ready" toast notification when `{type: "video_ready"}` WebSocket event is received, using `sonner` (already installed).

---

---

## General Implementation Rules (apply to every feature)

These conventions are used throughout the existing FlowTeam codebase. Follow them exactly.

### Backend
- All API responses via `config/utils.py → standardize_response(data=..., success=True, error=None, status=200)`
- All models use `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- Permission checks: use `apps/teams/rbac.py` helpers. Never re-implement role logic inline.
- Celery tasks: defined in `apps/{app}/tasks.py`, imported lazily inside functions to avoid circular imports
- Audit logging: call `apps/audit/mixins.py` for any sensitive create/update/delete. Events should be descriptive strings like `"custom_field.created"`.
- New Django apps: register in `INSTALLED_APPS` in `config/settings/base.py`. Add URL include in `config/urls.py`.
- Migrations: run `python manage.py makemigrations {app}` after every model change. Never edit migrations manually.
- Email: use `apps/core/email.py` — never call `send_mail` directly.
- WebSocket broadcasts: follow the pattern in `apps/messaging/consumers.py` — use `async_to_sync(channel_layer.group_send)` from sync context.

### Frontend
- Tailwind CSS v4 utility classes only — no inline styles except for dynamic values (gradients, custom colours)
- All shadcn/ui components from `src/components/ui/` — do not install new component libraries
- API calls via `src/lib/api.ts` axios instance (handles JWT refresh automatically)
- React Query for all server state: `useQuery` for reads, `useMutation` for writes, invalidate related queries on mutation success
- Zustand for client-only UI state only (sidebar open, modal open, etc.)
- Forms: `react-hook-form` + `zod` schema validation — always
- Types: add to the appropriate file in `src/types/` — never use `any`
- Permissions in UI: use `src/hooks/usePermissions.ts` — never hardcode role strings in components
- Plan gating: wrap AI/Pro/Enterprise features in `src/components/ai/AIGate.tsx` — it shows an upgrade prompt if the team is on a lower plan
- Error handling: use `src/lib/errorMessage.ts` to extract user-friendly error strings from API errors
- Toast notifications: use `sonner` (`import { toast } from "sonner"`)
- Icons: `lucide-react` only — no other icon libraries
- Empty states: every list/table must have an empty state with a descriptive message and a CTA

---




