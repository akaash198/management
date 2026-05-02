import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from apps.teams.models import Team

class Project(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="projects")
    color = models.CharField(max_length=7, default="#6366f1")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    icon = models.CharField(max_length=10, null=True, blank=True, default="🚀")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        permissions = [
            ("edit_project", "Can edit project tasks and columns"),
            ("manage_project", "Can manage project settings and members"),
        ]

    def __str__(self):
        return self.name

class ProjectTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="project_templates")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    color = models.CharField(max_length=7, default="#6366f1")
    icon = models.CharField(max_length=10, null=True, blank=True, default="🚀")
    columns = models.JSONField(default=list, blank=True)
    labels = models.JSONField(default=list, blank=True)
    default_issue_types = models.JSONField(default=list, blank=True)
    default_roles = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_project_templates"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "name")

    def __str__(self):
        return f"{self.team.name} / {self.name}"

class Column(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="columns")
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, null=True, blank=True)
    is_done_column = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("project", "name")

    def __str__(self):
        return f"{self.project.name} - {self.name}"

class Label(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="labels")
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7)

    class Meta:
        unique_together = ("project", "name")

    def __str__(self):
        return self.name

class Task(models.Model):
    ISSUE_TYPE_STORY = "story"
    ISSUE_TYPE_TASK = "task"
    ISSUE_TYPE_BUG = "bug"
    ISSUE_TYPE_EPIC = "epic"
    ISSUE_TYPE_SUBTASK = "subtask"

    PRIORITY_CHOICES = [
        ("urgent", "Urgent"),
        ("high", "High"),
        ("normal", "Normal"),
        ("low", "Low"),
    ]
    ISSUE_TYPE_CHOICES = [
        (ISSUE_TYPE_EPIC, "Epic"),
        (ISSUE_TYPE_STORY, "Story"),
        (ISSUE_TYPE_TASK, "Task"),
        (ISSUE_TYPE_BUG, "Bug"),
        (ISSUE_TYPE_SUBTASK, "Subtask"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name="tasks")
    # Legacy single-assignee field (kept for backward compatibility during migration to multi-assignee).
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    # New multi-assignee field (pair programming / shared ownership).
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="assigned_tasks_multi"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reported_tasks"
    )
    sprint = models.ForeignKey("Sprint", on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    parent_task = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="child_tasks"
    )
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPE_CHOICES, default=ISSUE_TYPE_TASK)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="normal")
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    labels = models.ManyToManyField(Label, blank=True, related_name="tasks")
    is_archived = models.BooleanField(default=False)
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    search_vector = SearchVectorField(null=True)

    class Meta:
        ordering = ["order"]
        indexes = [
            GinIndex(fields=["search_vector"], name="task_search_gin"),
        ]

    def __str__(self):
        return self.title

class Sprint(models.Model):
    STATUS_PLANNED = "planned"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_PLANNED, "Planned"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="sprints")
    name = models.CharField(max_length=150)
    goal = models.TextField(blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField()
    capacity_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_sprints")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date", "name"]
        unique_together = ("project", "name")

    def __str__(self):
        return f"{self.project.name} / {self.name}"

class SprintCapacity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name="member_capacities")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sprint_capacities")
    capacity_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    notes = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        unique_together = ("sprint", "user")

class Milestone(models.Model):
    STATUS_PLANNED = "planned"
    STATUS_AT_RISK = "at_risk"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_PLANNED, "Planned"),
        (STATUS_AT_RISK, "At Risk"),
        (STATUS_COMPLETED, "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_milestones")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_date", "name"]

class TaskLink(models.Model):
    TYPE_BLOCKS = "blocks"
    TYPE_BLOCKED_BY = "blocked_by"
    TYPE_DUPLICATES = "duplicates"
    TYPE_RELATES_TO = "relates_to"
    TYPE_CHOICES = [
        (TYPE_BLOCKS, "Blocks"),
        (TYPE_BLOCKED_BY, "Blocked By"),
        (TYPE_DUPLICATES, "Duplicates"),
        (TYPE_RELATES_TO, "Relates To"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="outbound_links")
    target_task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="inbound_links")
    link_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_RELATES_TO)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_task_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("source_task", "target_task", "link_type")


class GitHubPullRequest(models.Model):
    STATUS_OPEN = "open"
    STATUS_MERGED = "merged"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_MERGED, "Merged"),
        (STATUS_CLOSED, "Closed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="pull_requests")
    pr_number = models.IntegerField()
    pr_title = models.CharField(max_length=255)
    pr_url = models.URLField()
    repo = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OPEN)
    author = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("task", "repo", "pr_number")

class VcsPullRequest(models.Model):
    PROVIDER_GITLAB = "gitlab"
    PROVIDER_BITBUCKET = "bitbucket"
    PROVIDER_CHOICES = [
        (PROVIDER_GITLAB, "GitLab"),
        (PROVIDER_BITBUCKET, "Bitbucket"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="vcs_pull_requests")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    pr_number = models.IntegerField()
    pr_title = models.CharField(max_length=255)
    pr_url = models.URLField(max_length=500)
    repo = models.CharField(max_length=255)
    status = models.CharField(max_length=20, default="open")
    author = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("task", "provider", "repo", "pr_number")

class SavedIssueView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="saved_issue_views")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_issue_views")
    name = models.CharField(max_length=120)
    filters = models.JSONField(default=dict, blank=True)
    is_shared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "user", "name")
        ordering = ["name"]

class RecurringTaskRule(models.Model):
    FREQUENCY_DAILY = "daily"
    FREQUENCY_WEEKLY = "weekly"
    FREQUENCY_MONTHLY = "monthly"
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, "Daily"),
        (FREQUENCY_WEEKLY, "Weekly"),
        (FREQUENCY_MONTHLY, "Monthly"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="recurring_rules")
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name="recurring_rules")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="recurring_task_rules"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    issue_type = models.CharField(max_length=20, choices=Task.ISSUE_TYPE_CHOICES, default=Task.ISSUE_TYPE_TASK)
    priority = models.CharField(max_length=20, choices=Task.PRIORITY_CHOICES, default="normal")
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQUENCY_WEEKLY)
    interval = models.PositiveIntegerField(default=1)
    next_run_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_recurring_rules")
    last_task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["next_run_date", "title"]

class SubTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    comment = models.ForeignKey("Comment", on_delete=models.CASCADE, null=True, blank=True, related_name="attachments")
    file = models.FileField(upload_to="attachments/")
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class AttachmentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attachment = models.ForeignKey(Attachment, on_delete=models.CASCADE, related_name="versions")
    file = models.FileField(upload_to="attachments/versions/")
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    version_number = models.PositiveIntegerField(default=1)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class TaskActivity(models.Model):
    VERB_CHOICES = [
        ("created", "Created"),
        ("updated", "Updated"),
        ("moved", "Moved"),
        ("assigned", "Assigned"),
        ("commented", "Commented"),
        ("completed", "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    verb = models.CharField(max_length=20, choices=VERB_CHOICES)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_comments")
    text = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    mentions = models.JSONField(default=list, blank=True)
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class TaskWatcher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="watchers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watched_tasks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("task", "user")

class ProjectRole(models.Model):
    ROLE_CHOICES = [
        ("project_admin", "Project Admin"),
        ("editor", "Editor"),
        ("commenter", "Commenter"),
        ("viewer", "Viewer"),
    ]

    DEFAULT_CAPABILITIES = {
        "project_admin": {
            "can_view": True,
            "can_edit_tasks": True,
            "can_delete_tasks": True,
            "can_manage_project": True,
            "can_delete_project": True,
            "can_edit_columns": True,
            "can_export": True,
            "can_comment": True,
            "can_manage_members": True,
        },
        "editor": {
            "can_view": True,
            "can_edit_tasks": True,
            "can_delete_tasks": False,
            "can_manage_project": False,
            "can_delete_project": False,
            "can_edit_columns": False,
            "can_export": True,
            "can_comment": True,
            "can_manage_members": False,
        },
        "commenter": {
            "can_view": True,
            "can_edit_tasks": False,
            "can_delete_tasks": False,
            "can_manage_project": False,
            "can_delete_project": False,
            "can_edit_columns": False,
            "can_export": False,
            "can_comment": True,
            "can_manage_members": False,
        },
        "viewer": {
            "can_view": True,
            "can_edit_tasks": False,
            "can_delete_tasks": False,
            "can_manage_project": False,
            "can_delete_project": False,
            "can_edit_columns": False,
            "can_export": False,
            "can_comment": False,
            "can_manage_members": False,
        },
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="roles")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_roles")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    capabilities = models.JSONField(default=dict, blank=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="assigned_roles")
    assigned_at = models.DateTimeField(auto_now_add=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("project", "user")

    def is_active(self) -> bool:
        """Return False if outside the validity window."""
        from django.utils import timezone as tz
        now = tz.now()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True

    def effective_capabilities(self) -> dict:
        """Merge role defaults with any manual overrides stored in capabilities."""
        defaults = self.DEFAULT_CAPABILITIES.get(self.role, {})
        return {**defaults, **self.capabilities}

    def save(self, *args, **kwargs):
        if not self.capabilities:
            self.capabilities = {}
        super().save(*args, **kwargs)

class TimeLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="timelogs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="timelogs")
    minutes = models.PositiveIntegerField()
    date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=200, null=True, blank=True)
    is_billable = models.BooleanField(default=True)
    hourly_rate_cents = models.PositiveIntegerField(default=0)
    billed_invoice = models.ForeignKey(
        "billing.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timelogs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

class TaskApproval(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]
    TARGET_TASK = "task"
    TARGET_RELEASE = "release"
    TARGET_CHOICES = [
        (TARGET_TASK, "Task"),
        (TARGET_RELEASE, "Release"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="approvals")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name="approvals")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default=TARGET_TASK)
    required_role = models.CharField(max_length=20, default="manager")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="requested_approvals")
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="decided_approvals")
    decision_note = models.CharField(max_length=300, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

class ProjectDocument(models.Model):
    DOC_SOP = "sop"
    DOC_SPEC = "spec"
    DOC_MEETING = "meeting"
    DOC_DECISION = "decision"
    DOC_NOTE = "note"
    DOC_CHOICES = [
        (DOC_SOP, "SOP"),
        (DOC_SPEC, "Spec"),
        (DOC_MEETING, "Meeting Note"),
        (DOC_DECISION, "Decision Log"),
        (DOC_NOTE, "Note"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name="documents")
    parent_document = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="versions")
    title = models.CharField(max_length=200)
    doc_type = models.CharField(max_length=20, choices=DOC_CHOICES, default=DOC_NOTE)
    content = models.TextField(blank=True, default="")
    attachment = models.FileField(upload_to="project_docs/", null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_documents")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class NotificationRule(models.Model):
    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    CHANNEL_BOTH = "both"
    CHANNEL_CHOICES = [
        (CHANNEL_IN_APP, "In-app"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_BOTH, "Both"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="notification_rules")
    name = models.CharField(max_length=120)
    trigger = models.CharField(max_length=50)
    filters = models.JSONField(default=dict, blank=True)
    delivery = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default=CHANNEL_IN_APP)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_rules")
    created_at = models.DateTimeField(auto_now_add=True)

class NotificationDigestRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="notification_digests")
    digest_type = models.CharField(max_length=20, default="overdue")
    recipient_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class IssueTypeFieldDefinition(models.Model):
    FIELD_TEXT = "text"
    FIELD_NUMBER = "number"
    FIELD_DATE = "date"
    FIELD_SELECT = "select"
    FIELD_CHOICES = [
        (FIELD_TEXT, "Text"),
        (FIELD_NUMBER, "Number"),
        (FIELD_DATE, "Date"),
        (FIELD_SELECT, "Select"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="issue_field_definitions")
    issue_type = models.CharField(max_length=20, choices=Task.ISSUE_TYPE_CHOICES)
    name = models.CharField(max_length=120)
    field_type = models.CharField(max_length=20, choices=FIELD_CHOICES, default=FIELD_TEXT)
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "issue_type", "name")

class TaskCustomFieldValue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="custom_field_values")
    field_definition = models.ForeignKey(IssueTypeFieldDefinition, on_delete=models.CASCADE, related_name="values")
    value = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("task", "field_definition")

class AutomationRule(models.Model):
    TRIGGER_TASK_DONE = "task_done"
    TRIGGER_TASK_OVERDUE = "task_overdue"
    TRIGGER_APPROVAL_REQUESTED = "approval_requested"
    TRIGGER_CHOICES = [
        (TRIGGER_TASK_DONE, "Task moved to done"),
        (TRIGGER_TASK_OVERDUE, "Task overdue"),
        (TRIGGER_APPROVAL_REQUESTED, "Approval requested"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="automation_rules")
    name = models.CharField(max_length=150)
    trigger = models.CharField(max_length=30, choices=TRIGGER_CHOICES)
    conditions = models.JSONField(default=dict, blank=True)
    actions = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="automation_rules")
    created_at = models.DateTimeField(auto_now_add=True)

class ClientPortalAccess(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_REVOKED = "revoked"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_REVOKED, "Revoked"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="client_access")
    email = models.EmailField()
    display_name = models.CharField(max_length=120, blank=True, default="")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    allowed_statuses = models.JSONField(default=list, blank=True)
    allowed_document_ids = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_portal_access")
    created_at = models.DateTimeField(auto_now_add=True)
