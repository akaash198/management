"""
seed_spectra_ai — Onboards Spectra AI as a fully configured company inside
the communication platform, based on spectra_ai_onboarding.md.

Creates:
  - 6 users (CEO, Team Lead, Engineering Manager, 2 Engineers, 1 Intern)
  - Company record (Spectra AI, technology industry, AI plan)
  - Company-level roles and memberships
  - 1 Engineering team with RBAC custom roles seeded
  - 13 department-scoped channels (public + private)
  - 2 Engineering projects with empty boards (no tasks/sprints)
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
            self._create_channels(teams, users)

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

    # Tasks and sprints intentionally omitted — Spectra AI is a real company
    # onboarding, not a demo. Boards start empty so the team fills them in.

    # ── Channels & messages ────────────────────────────────────────────────────

    def _create_channels(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember

        nirupam = users["nirupamsd@spectrai.sg"]
        akaash  = users["akaash@spectrai.sg"]
        uday    = users["uday.tashildar@gmail.com"]
        karan   = users["karanmuthanna24@gmail.com"]
        david   = users["davidsuriya612@gmail.com"]
        sheerin = users["sheerinrizwana.y@gmail.com"]

        eng         = teams["Engineering"]
        all_members = [nirupam, akaash, uday, karan, david, sheerin]
        eng_members = [nirupam, akaash, uday, karan, david, sheerin]

        # Channels start empty — the real team will fill them in.
        channel_specs = [
            # ── Company-wide ─────────────────────────────────────────────────
            ("announcements",    "Announcements",  "Official Spectra AI announcements — launches, hires, milestones.", False, all_members),
            ("general",          "General",         "Day-to-day conversation, wins, and team updates.",                 False, all_members),
            ("onboarding",       "Onboarding",      "New hire orientation, checklists, and first-week guides.",         False, all_members),
            ("random",           "Random",          "Off-topic, fun, and non-work banter.",                             False, all_members),
            ("kudos",            "Kudos",           "Recognition, shout-outs, and wins.",                               False, all_members),
            # ── Engineering ──────────────────────────────────────────────────
            ("eng-general",      "Engineering",     "General engineering discussion and cross-team coordination.",      False, eng_members),
            ("eng-backend",      "Backend",         "Backend development — APIs, databases, services.",                 False, [nirupam, akaash, uday, karan, david]),
            ("dev-prs",          "Pull Requests",   "Automated GitHub PR notifications and review requests.",           False, eng_members),
            ("dev-deployments",  "Deployments",     "Deployment logs, release tracking, and rollback alerts.",          False, eng_members),
            ("dev-cicd",         "CI / CD",         "Build and pipeline status.",                                       False, eng_members),
            # ── AI / ML ──────────────────────────────────────────────────────
            ("ai-general",       "AI / ML",         "AI strategy, model updates, research alignment.",                  False, eng_members),
            # ── Ops ──────────────────────────────────────────────────────────
            ("incidents",        "Incidents",       "Active incident tracking — P0/P1/P2 alerts and resolution.",       False, eng_members),
            ("intern-hub",       "Intern Hub",      "Intern updates, mentoring, and project work.",                     False, [nirupam, akaash, uday, sheerin]),
            # ── Private ──────────────────────────────────────────────────────
            ("leadership-private","Leadership",     "CEO-level strategy, headcount planning, and confidential.",        True,  [nirupam, akaash, uday]),
        ]

        for name, display_name, description, is_private, members in channel_specs:
            channel, _ = Channel.objects.get_or_create(
                team=eng,
                name=name,
                defaults={
                    "display_name": display_name,
                    "description": description,
                    "is_private": is_private,
                    "created_by": nirupam,
                },
            )
            for user in members:
                ChannelMember.objects.get_or_create(channel=channel, user=user)

        self.stdout.write(f"  {len(channel_specs)} channels created (empty — no seed messages).")

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
        self.stdout.write("  Tasks       : 0 (intentionally empty)")
        self.stdout.write("  Channels    : 13 channels (11 public, 2 private)")
        self.stdout.write("  Messages    : 0 (intentionally empty)")
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
