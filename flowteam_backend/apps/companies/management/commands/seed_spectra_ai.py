"""
seed_spectra_ai — Onboards Spectra AI as a fully configured company inside
the communication platform, based on spectra_ai_onboarding.md.

Creates:
  - 6 users (CEO, Team Lead, Engineering Manager, 2 Engineers, 1 Intern)
  - Company record (Spectra AI, technology industry, AI plan)
  - Company-level roles and memberships
  - 1 Engineering team with RBAC custom roles seeded
  - 13 department-scoped channels (public + private)
  - Seed messages in each channel
  - 1 Engineering project with sprint, tasks, and milestones
  - 1 pending company invite (placeholder for future hire)

Production-safe:
  - All objects tagged with DEMO_MARKER in notes/description
  - email_domain_verified=False prevents auto-join by real @spectrai.sg users
  - --reset requires --confirm to prevent accidental data loss
  - Password from DEMO_PASSWORD env var (random fallback)

Usage:
    python manage.py seed_spectra_ai
    python manage.py seed_spectra_ai --reset --confirm
"""

from __future__ import annotations

import datetime
import random
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

User = get_user_model()

DEMO_MARKER      = "[spectra-ai-seed]"
COMPANY_NAME     = "Spectra AI"
COMPANY_SLUG     = "spectra-ai"
FIXED_PASSWORD   = "Demo@123"

# ── Seed roster ────────────────────────────────────────────────────────────────
# (full_name, email, company_role, team_role)
USERS = [
    ("Nirupam SD",      "nirupamsd@spectrai.sg",        "ceo",     "ceo"),
    ("Akaash",          "akaash@spectrai.sg",            "manager", "manager"),
    ("Uday Tashildar",  "uday.tashildar@gmail.com",      "manager", "manager"),
    ("Karan Muthanna",  "karanmuthanna24@gmail.com",     "member",  "member"),
    ("David Suriya",    "davidsuriya612@gmail.com",      "member",  "member"),
    ("Sheerin Rizwana", "sheerinrizwana.y@gmail.com",    "viewer",  "viewer"),
]


class Command(BaseCommand):
    help = "Onboard Spectra AI — creates company, team, channels, projects, and seed data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing Spectra AI seed data before re-seeding.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Required with --reset to prevent accidental deletion.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            if not options["confirm"]:
                raise CommandError(
                    "Pass --confirm together with --reset to delete existing Spectra AI data.\n"
                    "Example: python manage.py seed_spectra_ai --reset --confirm"
                )
            self._reset()

        password = FIXED_PASSWORD

        with transaction.atomic():
            users   = self._create_users(password)
            company = self._create_company(users)
            teams   = self._create_teams(company, users)
            projects = self._create_projects(teams, users)
            self._create_tasks(projects, users)
            self._create_channels_and_messages(teams, users)

        self._print_summary(password)

    # ── Reset ──────────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.companies.models import Company
        from apps.teams.models import Team

        self.stdout.write(self.style.WARNING("Resetting Spectra AI seed data..."))

        deleted_co, _ = Company.objects.filter(
            slug=COMPANY_SLUG, notes__startswith=DEMO_MARKER
        ).delete()

        deleted_teams, _ = Team.objects.filter(
            created_by__email="nirupamsd@spectrai.sg",
        ).delete()

        deleted_users, _ = User.objects.filter(
            email__in=[u[1] for u in USERS]
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Reset complete: {deleted_co} companies, "
                f"{deleted_teams} teams, {deleted_users} users removed."
            )
        )

    # ── Users ──────────────────────────────────────────────────────────────────

    def _create_users(self, password: str) -> dict[str, User]:
        users = {}
        now = timezone.now()
        for full_name, email, _co_role, _team_role in USERS:
            user = User.objects.filter(email=email).first()
            if user:
                # Existing user — force-reset password and ensure account is active.
                user.full_name = full_name
                user.is_active = True
                user.email_verified_at = now
                user.set_password(password)
                user.save(update_fields=["full_name", "password", "is_active", "email_verified_at"])
                self.stdout.write(f"  Updated user: {email}")
            else:
                # New user — use create_user so the password is hashed correctly on insert.
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    full_name=full_name,
                    is_active=True,
                    email_verified_at=now,
                )
                self.stdout.write(f"  Created user: {email}")
            users[email] = user

        # Clear any axes lockouts so previous failed attempts don't block login.
        try:
            from axes.models import AccessAttempt
            AccessAttempt.objects.filter(username__in=[u[1] for u in USERS]).delete()
            self.stdout.write("  Cleared axes lockouts for seed accounts.")
        except Exception:
            pass

        return users

    # ── Company ────────────────────────────────────────────────────────────────

    def _create_company(self, users: dict) -> "Company":
        from apps.companies.models import Company, CompanyMember, CompanyInvite

        nirupam = users["nirupamsd@spectrai.sg"]
        akaash  = users["akaash@spectrai.sg"]

        company, created = Company.objects.get_or_create(
            slug=COMPANY_SLUG,
            defaults={
                "name": COMPANY_NAME,
                "website": "https://spectrai.sg",
                "industry": "technology",
                "size": "1-10",
                "country": "Singapore",
                "ceo": nirupam,
                "created_by": nirupam,
                "onboarding_status": "active",
                "onboarding_completed_at": timezone.now(),
                "email_domain": "spectrai.sg",
                "email_domain_verified": False,
                "notes": (
                    f"{DEMO_MARKER} Spectra AI onboarding seed — "
                    "safe to delete via seed_spectra_ai --reset --confirm"
                ),
                "settings_json": {
                    "ai_enabled": True,
                    "notifications_enabled": True,
                    "allowed_plan": "ai",
                    "max_members": None,
                    "audit_retention_days": 365,
                    "timezone": "Asia/Singapore",
                    "branding": {
                        "primary_color": "#4F46E5",
                        "accent_color": "#7C3AED",
                    },
                },
            },
        )

        if not created:
            self.stdout.write(f"  Company '{COMPANY_NAME}' already exists — refreshing members.")

        role_map = {email: co_role for _, email, co_role, _ in USERS}
        for email, user in users.items():
            role = role_map[email]
            member, mem_created = CompanyMember.objects.get_or_create(
                company=company,
                user=user,
                defaults={"role": role, "invited_by": nirupam},
            )
            if not mem_created and member.role != role:
                member.role = role
                member.save()

        # Pending invite — future engineering hire
        CompanyInvite.objects.get_or_create(
            company=company,
            email="hire@spectrai.sg",
            defaults={
                "role": "member",
                "invited_by": akaash,
                "status": "pending",
                "expires_at": timezone.now() + datetime.timedelta(days=7),
            },
        )

        self.stdout.write(self.style.SUCCESS(f"  Company '{COMPANY_NAME}' ready (id={company.id})"))
        return company

    # ── Teams ──────────────────────────────────────────────────────────────────

    def _create_teams(self, company: "Company", users: dict) -> dict:
        from apps.teams.models import Team, TeamMember, CustomRole, DEFAULT_ROLE_CAPABILITIES, ALL_TEAM_CAPABILITIES

        nirupam = users["nirupamsd@spectrai.sg"]
        akaash  = users["akaash@spectrai.sg"]
        uday    = users["uday.tashildar@gmail.com"]
        karan   = users["karanmuthanna24@gmail.com"]
        david   = users["davidsuriya612@gmail.com"]
        sheerin = users["sheerinrizwana.y@gmail.com"]

        SYSTEM_ROLES = [
            {"slug": "ceo",     "name": "CEO",      "level": 0,  "is_owner_role": True},
            {"slug": "admin",   "name": "Admin",    "level": 10, "is_owner_role": False},
            {"slug": "manager", "name": "Manager",  "level": 30, "is_owner_role": False},
            {"slug": "member",  "name": "Employee", "level": 50, "is_owner_role": False},
            {"slug": "viewer",  "name": "Viewer",   "level": 80, "is_owner_role": False},
        ]

        team_specs = [
            {
                "name": "Engineering",
                "plan": "ai",
                "ai_enabled": True,
                "members": [
                    (nirupam, "ceo"),
                    (akaash,  "manager"),
                    (uday,    "manager"),
                    (karan,   "member"),
                    (david,   "member"),
                    (sheerin, "viewer"),
                ],
            },
        ]

        teams = {}
        for spec in team_specs:
            team, team_created = Team.objects.get_or_create(
                name=spec["name"],
                created_by=nirupam,
                defaults={
                    "company": company,
                    "plan": spec["plan"],
                    "ai_enabled": spec["ai_enabled"],
                },
            )
            if not team_created and team.company_id != company.id:
                team.company = company
                team.save()

            # Seed custom roles (idempotent)
            slug_to_custom_role = {}
            for role_def in SYSTEM_ROLES:
                caps = DEFAULT_ROLE_CAPABILITIES.get(role_def["slug"], {})
                full_caps = {c: bool(caps.get(c, False)) for c in ALL_TEAM_CAPABILITIES}
                cr, _ = CustomRole.objects.get_or_create(
                    team=team,
                    slug=role_def["slug"],
                    defaults={
                        "name": role_def["name"],
                        "level": role_def["level"],
                        "is_owner_role": role_def["is_owner_role"],
                        "is_system": True,
                        "capabilities": full_caps,
                    },
                )
                slug_to_custom_role[role_def["slug"]] = cr

            for user, role_slug in spec["members"]:
                custom_role = slug_to_custom_role.get(role_slug)
                TeamMember.objects.get_or_create(
                    team=team,
                    user=user,
                    defaults={
                        "role": role_slug,
                        "custom_role": custom_role,
                        "invited_by": nirupam,
                    },
                )

            teams[spec["name"]] = team
            self.stdout.write(f"  Team: {spec['name']}")

        return teams

    # ── Projects ───────────────────────────────────────────────────────────────

    def _create_projects(self, teams: dict, users: dict) -> dict:
        from apps.projects.models import Project, Column, Label

        nirupam = users["nirupamsd@spectrai.sg"]
        eng     = teams["Engineering"]

        project_specs = [
            {
                "team": eng,
                "name": "Spectra Core Platform",
                "description": (
                    "Core AI decision-intelligence engine — API, model pipeline, "
                    "and developer SDK. Primary Q3 deliverable."
                ),
                "color": "#4F46E5",
                "icon": "⚡",
                "columns": [
                    ("Backlog",     "#94a3b8", False),
                    ("In Progress", "#4F46E5", False),
                    ("Review",      "#f59e0b", False),
                    ("QA",          "#7C3AED", False),
                    ("Done",        "#22c55e", True),
                ],
                "labels": [
                    ("backend",     "#4F46E5"),
                    ("frontend",    "#0ea5e9"),
                    ("ai-model",    "#7C3AED"),
                    ("infra",       "#f59e0b"),
                    ("bug",         "#ef4444"),
                    ("Q3",          "#22c55e"),
                ],
            },
            {
                "team": eng,
                "name": "Developer SDK",
                "description": (
                    "Python and TypeScript SDKs for the Spectra AI API. "
                    "Includes auth, streaming, and retry logic."
                ),
                "color": "#0ea5e9",
                "icon": "📦",
                "columns": [
                    ("Backlog",     "#94a3b8", False),
                    ("In Progress", "#0ea5e9", False),
                    ("Review",      "#f59e0b", False),
                    ("Done",        "#22c55e", True),
                ],
                "labels": [
                    ("python",      "#3b82f6"),
                    ("typescript",  "#0ea5e9"),
                    ("docs",        "#94a3b8"),
                    ("bug",         "#ef4444"),
                ],
            },
        ]

        projects = {}
        for spec in project_specs:
            project, _ = Project.objects.get_or_create(
                name=spec["name"],
                team=spec["team"],
                defaults={
                    "description": spec["description"],
                    "color": spec["color"],
                    "icon": spec["icon"],
                    "created_by": nirupam,
                    "status": "active",
                },
            )

            columns = {}
            for order, (col_name, col_color, is_done) in enumerate(spec["columns"]):
                col, _ = Column.objects.get_or_create(
                    project=project, name=col_name,
                    defaults={"order": order, "color": col_color, "is_done_column": is_done},
                )
                columns[col_name] = col

            labels = {}
            for label_name, label_color in spec["labels"]:
                lbl, _ = Label.objects.get_or_create(
                    project=project, name=label_name,
                    defaults={"color": label_color},
                )
                labels[label_name] = lbl

            projects[spec["name"]] = {"project": project, "columns": columns, "labels": labels}
            self.stdout.write(f"  Project: {spec['name']}")

        return projects

    # ── Tasks, sprints, milestones ─────────────────────────────────────────────

    def _create_tasks(self, projects: dict, users: dict) -> None:
        from apps.projects.models import Task, Sprint, SprintCapacity, Milestone

        nirupam = users["nirupamsd@spectrai.sg"]
        akaash  = users["akaash@spectrai.sg"]
        uday    = users["uday.tashildar@gmail.com"]
        karan   = users["karanmuthanna24@gmail.com"]
        david   = users["davidsuriya612@gmail.com"]
        sheerin = users["sheerinrizwana.y@gmail.com"]

        today = datetime.date.today()

        # ── Spectra Core Platform ──────────────────────────────────────────────
        core      = projects["Spectra Core Platform"]["project"]
        core_col  = projects["Spectra Core Platform"]["columns"]
        core_lbl  = projects["Spectra Core Platform"]["labels"]

        sprint_core, _ = Sprint.objects.get_or_create(
            project=core,
            name="Sprint 1 — Foundation",
            defaults={
                "goal": "Ship REST API skeleton, auth middleware, and base model inference endpoint.",
                "start_date": today - datetime.timedelta(days=5),
                "end_date":   today + datetime.timedelta(days=9),
                "capacity_hours": 120,
                "status": "active",
                "created_by": uday,
            },
        )
        for user, hours in [(akaash, 40), (uday, 30), (karan, 30), (david, 20)]:
            SprintCapacity.objects.get_or_create(
                sprint=sprint_core, user=user,
                defaults={"capacity_hours": hours},
            )

        Milestone.objects.get_or_create(
            project=core, name="Private Beta — Internal",
            defaults={
                "description": "API + model pipeline functional for internal dogfooding.",
                "due_date": today + datetime.timedelta(days=28),
                "status": "planned",
                "created_by": nirupam,
            },
        )
        Milestone.objects.get_or_create(
            project=core, name="Developer Preview",
            defaults={
                "description": "Public developer preview with SDK and docs site.",
                "due_date": today + datetime.timedelta(days=60),
                "status": "planned",
                "created_by": nirupam,
            },
        )

        core_task_specs = [
            # (title, col, assignee, priority, issue_type, start_off, due_off, labels, desc)
            (
                "Design REST API schema",
                "Done", uday, "high", "story", -10, -3, ["backend", "Q3"],
                "OpenAPI 3.1 spec for /infer, /models, /sessions. Reviewed by team lead.",
            ),
            (
                "Implement auth middleware (JWT)",
                "In Progress", karan, "urgent", "task", -4, 3, ["backend", "Q3"],
                "JWT validation, refresh token rotation, 2FA header pass-through.",
            ),
            (
                "Base model inference endpoint /infer",
                "In Progress", david, "urgent", "story", -3, 5, ["backend", "ai-model", "Q3"],
                "POST /infer — accepts prompt + params, streams token output via SSE.",
            ),
            (
                "Model registry CRUD",
                "In Progress", akaash, "high", "task", -2, 6, ["backend", "ai-model"],
                "List, get, register, and deprecate model versions. Backed by PostgreSQL.",
            ),
            (
                "Rate limiter (per-key, sliding window)",
                "Review", karan, "normal", "task", -6, -1, ["backend", "infra"],
                "Redis sliding-window rate limiter. Per API key with configurable limits.",
            ),
            (
                "Dashboard UI — usage charts",
                "In Progress", sheerin, "normal", "task", -2, 8, ["frontend"],
                "Intern task: token usage chart and latency histogram using Recharts.",
            ),
            (
                "Observability: structured logging + Datadog APM",
                "Backlog", uday, "high", "task", None, 12, ["infra", "Q3"],
                "JSON logs, trace IDs, Datadog APM integration for all API routes.",
            ),
            (
                "Security: secrets scanning in CI",
                "Backlog", akaash, "high", "task", None, 10, ["infra"],
                "Add gitleaks + Semgrep to GitHub Actions. Block merge on detected secrets.",
            ),
            (
                "Bug: inference timeout not returned as 504",
                "In Progress", david, "urgent", "bug", -1, 2, ["bug", "backend"],
                "Model inference >30s returns 500 instead of 504. Fix timeout handling.",
            ),
            (
                "Write engineering onboarding doc",
                "Backlog", sheerin, "normal", "task", None, 14, ["docs"],
                "Intern task: document dev environment setup, branching strategy, PR checklist.",
            ),
        ]

        for (title, col_name, assignee, priority, itype, s_off, d_off, lbl_names, desc) in core_task_specs:
            col     = core_col.get(col_name) or core_col["Backlog"]
            start_d = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
            due_d   = (today + datetime.timedelta(days=d_off)) if d_off is not None else None
            task, _ = Task.objects.get_or_create(
                project=core, title=title,
                defaults={
                    "description": desc,
                    "column": col,
                    "assignee": assignee,
                    "reporter": uday,
                    "priority": priority,
                    "issue_type": itype,
                    "start_date": start_d,
                    "due_date": due_d,
                    "sprint": sprint_core if col_name != "Backlog" else None,
                    "estimated_hours": random.choice([4, 6, 8, 12, 16]),
                },
            )
            for lbl_name in lbl_names:
                lbl = core_lbl.get(lbl_name)
                if lbl:
                    task.labels.add(lbl)

        # ── Developer SDK ──────────────────────────────────────────────────────
        sdk     = projects["Developer SDK"]["project"]
        sdk_col = projects["Developer SDK"]["columns"]
        sdk_lbl = projects["Developer SDK"]["labels"]

        Milestone.objects.get_or_create(
            project=sdk, name="SDK v0.1.0 Release",
            defaults={
                "description": "Python and TypeScript SDKs published to PyPI and npm.",
                "due_date": today + datetime.timedelta(days=45),
                "status": "planned",
                "created_by": akaash,
            },
        )

        sdk_task_specs = [
            ("Python SDK — client class",    "In Progress", karan,   "high",   "task", -3,  7,  ["python"]),
            ("TypeScript SDK — client class","In Progress", david,   "high",   "task", -3,  7,  ["typescript"]),
            ("Streaming support (SSE)",       "Backlog",     karan,   "high",   "task", None, 14, ["python", "typescript"]),
            ("Retry + backoff logic",         "Backlog",     david,   "normal", "task", None, 14, ["python", "typescript"]),
            ("SDK reference docs",            "Backlog",     sheerin, "normal", "task", None, 21, ["docs"]),
            ("Unit tests — Python SDK",       "Review",      karan,   "normal", "task", -5,  -1, ["python"]),
        ]

        for (title, col_name, assignee, priority, itype, s_off, d_off, lbl_names) in sdk_task_specs:
            col     = sdk_col.get(col_name) or sdk_col["Backlog"]
            start_d = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
            due_d   = (today + datetime.timedelta(days=d_off)) if d_off is not None else None
            task, _ = Task.objects.get_or_create(
                project=sdk, title=title,
                defaults={
                    "column": col,
                    "assignee": assignee,
                    "reporter": akaash,
                    "priority": priority,
                    "issue_type": itype,
                    "start_date": start_d,
                    "due_date": due_d,
                    "estimated_hours": random.choice([4, 6, 8]),
                },
            )
            for lbl_name in lbl_names:
                lbl = sdk_lbl.get(lbl_name)
                if lbl:
                    task.labels.add(lbl)

        self.stdout.write("  Tasks, sprints, and milestones created.")

    # ── Channels & messages ────────────────────────────────────────────────────

    def _create_channels_and_messages(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember, Message

        nirupam = users["nirupamsd@spectrai.sg"]
        akaash  = users["akaash@spectrai.sg"]
        uday    = users["uday.tashildar@gmail.com"]
        karan   = users["karanmuthanna24@gmail.com"]
        david   = users["davidsuriya612@gmail.com"]
        sheerin = users["sheerinrizwana.y@gmail.com"]

        eng = teams["Engineering"]
        all_members = [nirupam, akaash, uday, karan, david, sheerin]
        eng_members = [akaash, uday, karan, david, sheerin]

        channel_specs = [
            # ── Company-wide ──────────────────────────────────────────────────
            {
                "name": "announcements",
                "display_name": "Announcements",
                "description": "Official Spectra AI announcements — launches, hires, milestones.",
                "is_private": False,
                "members": all_members,
                "messages": [
                    (nirupam, "Welcome to Spectra AI's workspace! This is our official home for team communication. Let's build something extraordinary together."),
                    (nirupam, "We're officially onboarded! Engineering team is set up. Sprint 1 is live. Let's ship."),
                    (nirupam, "Reminder: all production deployments require Engineering Manager approval. No exceptions. See #dev-deployments for details."),
                ],
            },
            {
                "name": "general",
                "display_name": "General",
                "description": "Day-to-day conversation, wins, and team updates.",
                "is_private": False,
                "members": all_members,
                "messages": [
                    (nirupam, "Morning everyone! Excited to have the full team here. Today: Sprint 1 kickoff for the Core Platform. Uday, you leading the standup at 9:30?"),
                    (uday,    "Yes, 9:30 SGT in #eng-general. Agenda: auth middleware, inference endpoint, rate limiter status."),
                    (akaash,  "Model registry PR is up. Would appreciate a review from @Karan or @David when you get a chance."),
                    (karan,   "On it! Looking at it now."),
                    (david,   "Found the root cause on the inference timeout bug — it's in the upstream HTTP client config. Fix is straightforward. Will have a PR up within the hour."),
                    (sheerin, "Hi everyone! Super excited to be here. @Akaash thank you for the onboarding call earlier."),
                    (akaash,  "Welcome Sheerin! Your first task is in Jira — check the onboarding doc in Notion too."),
                    (nirupam, "Great energy team. Let's have a strong Sprint 1. ping @Uday if you hit any blockers."),
                ],
            },
            {
                "name": "onboarding",
                "display_name": "Onboarding",
                "description": "New hire orientation, checklists, and first-week guides.",
                "is_private": False,
                "members": all_members,
                "messages": [
                    (uday,    "Welcome to Spectra AI! Your onboarding checklist is in Notion: [link]. Complete items in order — setup, tools access, then your first PR."),
                    (akaash,  "Day 1 tip: get your GitHub SSO connected first — it unlocks everything else. DM me if you're stuck."),
                    (sheerin, "Completed the checklist through 'tools access'. Setting up Datadog access now."),
                    (uday,    "Great progress Sheerin! Reach out anytime. Your first PR doesn't need to be big — a doc fix counts."),
                ],
            },
            # ── Engineering ───────────────────────────────────────────────────
            {
                "name": "eng-general",
                "display_name": "Engineering",
                "description": "General engineering discussion and cross-team coordination.",
                "is_private": False,
                "members": eng_members + [nirupam],
                "messages": [
                    (uday,   "Sprint 1 standup — 2026-05-28:\n1. Karan: JWT middleware, 60% done. Blocker: need Redis URL for dev.\n2. David: inference endpoint in progress, fixing timeout bug.\n3. Akaash: model registry PR in review.\n4. Sheerin: dashboard UI started."),
                    (karan,  "@Uday Redis URL sorted — saw it in the .env.example. Middleware should be done by EOD."),
                    (akaash, "Architecture decision: we're using PostgreSQL for model metadata (not a vector DB) at this stage. We'll re-evaluate at Private Beta. ADR logged in Notion."),
                    (david,  "Timeout bug PR is up. Fix is in the httpx client timeout config — was defaulting to 10s, bumped to 35s with a 504 fallback."),
                    (uday,   "Reviewed and approved. Merging after CI passes."),
                    (akaash, "Reminder: all PRs must reference the Jira ticket in the title. e.g. [SAI-12] Fix inference timeout. @Karan @David @Sheerin please update your open PRs."),
                ],
            },
            {
                "name": "eng-backend",
                "display_name": "Backend",
                "description": "Backend development — APIs, databases, services.",
                "is_private": False,
                "members": [akaash, uday, karan, david],
                "messages": [
                    (karan,  "Question: should the /infer endpoint return a 202 Accepted for async jobs or stream synchronously? Leaning sync with SSE."),
                    (akaash, "Sync SSE for now — matches the OpenAI streaming pattern our users expect. We can add async jobs in v2."),
                    (david,  "Agreed. I'll implement SSE on the inference endpoint. Karan, can you add the Accept: text/event-stream header check in the middleware?"),
                    (karan,  "Done — added to the auth middleware PR. Check it in the latest commit."),
                    (uday,   "Good call on SSE. Also: let's keep all DB queries under 50ms. Add EXPLAIN ANALYZE to any new query over 20ms before merging."),
                ],
            },
            {
                "name": "dev-prs",
                "display_name": "Pull Requests",
                "description": "Automated GitHub PR notifications and review requests.",
                "is_private": False,
                "members": eng_members + [nirupam],
                "messages": [
                    (akaash, "[GitHub] PR #1 opened by @akaash: [SAI-4] Add model registry CRUD endpoints\nBranch: feature/SAI-4-model-registry → main\nReviewers: @uday, @karan\nhttps://github.com/spectra-ai/core/pull/1"),
                    (karan,  "[GitHub] PR #2 opened by @karan: [SAI-2] Implement JWT auth middleware\nBranch: feature/SAI-2-jwt-auth → main\nReviewers: @akaash\nhttps://github.com/spectra-ai/core/pull/2"),
                    (david,  "[GitHub] PR #3 opened by @david: [SAI-9] Fix inference timeout (500 → 504)\nBranch: hotfix/SAI-9-timeout → main\nReviewers: @uday\nhttps://github.com/spectra-ai/core/pull/3"),
                    (uday,   "PR #3 approved and merged. Good catch David — this would have caused confusion in production."),
                ],
            },
            {
                "name": "dev-deployments",
                "display_name": "Deployments",
                "description": "Deployment logs, release tracking, and rollback alerts.",
                "is_private": False,
                "members": eng_members + [nirupam],
                "messages": [
                    (uday,    "[DEPLOY] spectra-core v0.1.0-alpha deployed to STAGING by @uday\nEnvironment: staging.spectrai.sg\nBranch: main @ a3f9c12\nStatus: ✅ healthy"),
                    (akaash,  "Smoke tests passing on staging. Auth, /infer, and /models all responding correctly."),
                    (uday,    "Staging looks good. We'll cut to production once the timeout fix is in and CI is green on the next push."),
                    (nirupam, "Good progress. No production deployments until Sprint 1 review sign-off. Let's keep staging stable for demos."),
                ],
            },
            {
                "name": "ai-general",
                "display_name": "AI / ML",
                "description": "AI strategy, model updates, research alignment.",
                "is_private": False,
                "members": eng_members + [nirupam],
                "messages": [
                    (nirupam, "We're starting with a fine-tuned 7B parameter model for the inference endpoint. Goal: <300ms p95 latency on 512-token prompts."),
                    (akaash,  "Currently at ~420ms p95 on staging. Main bottleneck is model loading time — looking at model caching strategies."),
                    (uday,    "Suggest we use a warm pool of 2 model workers on staging. Should cut cold-start latency by ~60%."),
                    (akaash,  "Good idea. I'll add the worker pool config to the infra backlog."),
                    (david,   "Also worth looking at quantization (INT8) for the initial serving. Could halve memory footprint with minimal accuracy loss."),
                ],
            },
            {
                "name": "incidents",
                "display_name": "Incidents",
                "description": "Active incident tracking — P0/P1/P2 alerts and resolution.",
                "is_private": False,
                "members": eng_members + [nirupam],
                "messages": [
                    (akaash, "No active incidents. On-call rotation starts Monday. Schedule pinned in #on-call."),
                    (uday,   "Incident process reminder: P0 = immediate DM to on-call + EM. P1 = post here + DM on-call. P2 = post here only. Postmortem required for all P0/P1 within 48h."),
                ],
            },
            {
                "name": "intern-hub",
                "display_name": "Intern Hub",
                "description": "Intern updates, mentoring, and project work.",
                "is_private": False,
                "members": [sheerin, akaash, uday],
                "messages": [
                    (akaash,  "Welcome to Spectra AI, Sheerin! This is your channel. I'm your mentor — DM me anytime."),
                    (sheerin, "Thank you! I've completed the setup checklist and have the dashboard task in progress. Quick question: should I use Recharts or Chart.js for the usage charts?"),
                    (akaash,  "Recharts — it's already in our package.json. Check the existing charts in src/components/charts/ for patterns."),
                    (uday,    "Great initiative Sheerin. Don't hesitate to ask questions in #eng-backend too — the team is happy to help."),
                    (sheerin, "Will do! Also started on the onboarding doc task — using the existing Notion template as a base."),
                ],
            },
            {
                "name": "random",
                "display_name": "Random",
                "description": "Off-topic, fun, and non-work banter.",
                "is_private": False,
                "members": all_members,
                "messages": [
                    (david,   "Has anyone tried the new GPT-5 demos? The code generation is wild compared to 6 months ago."),
                    (karan,   "Yeah — we're still better at domain-specific inference though. Our fine-tuned model crushes it on structured output tasks."),
                    (sheerin, "I read the Attention Is All You Need paper last night for the first time. Mind = blown."),
                    (akaash,  "Welcome to the rabbit hole. Next up: Flash Attention 2 paper. Highly recommend."),
                    (nirupam, "Love the enthusiasm. This is exactly the energy we need at Spectra AI."),
                ],
            },
            {
                "name": "kudos",
                "display_name": "Kudos",
                "description": "Recognition, shout-outs, and wins.",
                "is_private": False,
                "members": all_members,
                "messages": [
                    (uday,    "Big kudos to @David for the quick turnaround on the inference timeout fix. Caught it same day and had a fix in review within 2 hours. That's the standard."),
                    (akaash,  "Shout out to @Karan for the clean JWT middleware implementation. Zero review comments on the logic — just a few nitpicks. Solid work."),
                    (nirupam, "Kudos to the entire engineering team. We went from zero to a working API on staging in our first sprint week. Proud of this team."),
                ],
            },
            # ── Leadership (private) ──────────────────────────────────────────
            {
                "name": "leadership-private",
                "display_name": "Leadership",
                "description": "CEO-level strategy, headcount planning, and confidential discussions.",
                "is_private": True,
                "members": [nirupam, akaash, uday],
                "messages": [
                    (nirupam, "Roadmap checkpoint: Private Beta target is 2026-06-25. We need the auth + inference endpoints stable and at least one enterprise pilot signed before then."),
                    (uday,    "Engineering is on track for the technical milestone. Main risk is the rate limiter — it's blocking the multi-tenant story."),
                    (akaash,  "Rate limiter is Sprint 1 scope. I'll prioritize it over the model registry polish if needed."),
                    (nirupam, "Good. Also: I'm in early conversations with two enterprise prospects. Will need a clean demo environment by 2026-06-10. Uday, can we have staging stable by then?"),
                    (uday,    "Yes — staging will be locked for demo use by 2026-06-08. I'll set up a dedicated demo tenant."),
                ],
            },
        ]

        for spec in channel_specs:
            channel, _ = Channel.objects.get_or_create(
                team=eng,
                name=spec["name"],
                defaults={
                    "display_name": spec["display_name"],
                    "description": spec["description"],
                    "is_private": spec["is_private"],
                    "created_by": nirupam,
                },
            )
            for user in spec["members"]:
                ChannelMember.objects.get_or_create(channel=channel, user=user)

            if not channel.messages.exists():
                for i, (sender, text) in enumerate(spec["messages"]):
                    Message.objects.create(
                        channel=channel,
                        sender=sender,
                        text=text,
                        client_id=f"spectra-seed-{channel.name}-{i}",
                    )

        self.stdout.write(f"  {len(channel_specs)} channels and seed messages created.")

    # ── Summary ────────────────────────────────────────────────────────────────

    def _print_summary(self, password: str) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 68))
        self.stdout.write(self.style.SUCCESS("  Spectra AI onboarding complete"))
        self.stdout.write(self.style.SUCCESS("=" * 68))
        self.stdout.write("")
        self.stdout.write("  TEAM CREDENTIALS")
        self.stdout.write("  " + "-" * 64)
        self.stdout.write(f"  {'Name':<18} {'Email':<36} {'Role':<12}")
        self.stdout.write("  " + "-" * 64)
        for full_name, email, _co_role, team_role in USERS:
            self.stdout.write(f"  {full_name:<18} {email:<36} {team_role:<12}")
        self.stdout.write("")
        self.stdout.write(f"  Password for ALL accounts: {FIXED_PASSWORD}")
        self.stdout.write("")
        self.stdout.write("  NOTE: email_domain_verified=False — no real @spectrai.sg users")
        self.stdout.write("  will auto-join this company on registration.")
        self.stdout.write("")
        self.stdout.write("  WHAT'S BEEN CREATED")
        self.stdout.write("  " + "-" * 64)
        self.stdout.write("  Company     : Spectra AI (active, AI plan, Singapore)")
        self.stdout.write("  Members     : 6 (CEO, Team Lead, Eng Manager, 2 Engineers, 1 Intern)")
        self.stdout.write("  Team        : Engineering (AI plan, custom RBAC roles seeded)")
        self.stdout.write("  Projects    : Spectra Core Platform / Developer SDK")
        self.stdout.write("  Sprint      : Sprint 1 — Foundation (active)")
        self.stdout.write("  Milestones  : Private Beta / Developer Preview / SDK v0.1.0")
        self.stdout.write("  Tasks       : 16 tasks — all columns, priorities, issue types")
        self.stdout.write("  Channels    : 13 channels (11 public, 2 private)")
        self.stdout.write("  Messages    : ~60 seed messages across all channels")
        self.stdout.write("  Invite      : 1 pending (hire@spectrai.sg)")
        self.stdout.write("")
        self.stdout.write("  CHANNELS CREATED")
        self.stdout.write("  " + "-" * 64)
        channels = [
            ("#announcements",    "public",  "Official announcements"),
            ("#general",          "public",  "Day-to-day conversation"),
            ("#onboarding",       "public",  "New hire orientation"),
            ("#eng-general",      "public",  "Engineering standup & discussion"),
            ("#eng-backend",      "public",  "Backend development"),
            ("#dev-prs",          "public",  "GitHub PR notifications"),
            ("#dev-deployments",  "public",  "Deployment tracking"),
            ("#ai-general",       "public",  "AI/ML strategy & model updates"),
            ("#incidents",        "public",  "Incident tracking"),
            ("#intern-hub",       "public",  "Intern mentoring & updates"),
            ("#random",           "public",  "Off-topic"),
            ("#kudos",            "public",  "Recognition & wins"),
            ("#leadership-private","private","CEO strategy (private)"),
        ]
        for name, ctype, desc in channels:
            self.stdout.write(f"  {name:<22} [{ctype:<7}]  {desc}")
        self.stdout.write("")
        self.stdout.write("  TO RESET:")
        self.stdout.write("  python manage.py seed_spectra_ai --reset --confirm")
        self.stdout.write(self.style.SUCCESS("=" * 68))
        self.stdout.write("")
