"""
seed_company_demo — Creates a complete FlowTeam demo company "Nova Agency"
with a full role hierarchy, teams, projects, tasks, sprints, milestones,
messages, and pending invites suitable for a live product demonstration.

Production-safe by design:
   - Demo users use clean emails (e.g. sarah@nova-agency.com).
   - email_domain_verified is set to False so no real user
     auto-joins the demo company on registration.
   - --reset requires an explicit --confirm flag; without it the
     command aborts, preventing accidental data loss in production.
   - The demo password is read from the DEMO_PASSWORD env var;
     falls back to a randomly generated one if not set (printed at end).
   - All demo objects are identified by the DEMO_MARKER tag in their
     notes/description so they can be cleaned up precisely without
     touching any real company, team, or user data.

Usage:
    python manage.py seed_company_demo
    python manage.py seed_company_demo --reset --confirm
    DEMO_PASSWORD=MySecret! python manage.py seed_company_demo
"""

from __future__ import annotations

import datetime
import os
import random
import secrets
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction, models
from django.utils import timezone

User = get_user_model()

DEMO_MARKER   = "[demo]"
COMPANY_NAME  = "Nova Agency"
COMPANY_SLUG  = "nova-agency-demo"

# Emails for the demo company
USERS = [
    # (full_name,       email,                         role)
    ("Sarah Chen",      "sarah@nova-agency.com",       "ceo"),
    ("Alex Rivera",     "alex@nova-agency.com",        "admin"),
    ("Priya Sharma",    "priya@nova-agency.com",       "manager"),
    ("Jordan Kim",      "jordan@nova-agency.com",      "member"),
    ("Dana Osei",       "dana@nova-agency.com",        "member"),
    ("Marcus Liu",      "marcus@nova-agency.com",      "viewer"),
]


class Command(BaseCommand):
    help = "Seed a complete Nova Agency demo company. Production-safe — never touches real data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing Nova Agency demo data before re-seeding.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Required together with --reset to prevent accidental deletion in production.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            if not options["confirm"]:
                raise CommandError(
                    "Pass --confirm together with --reset to delete existing demo data. "
                    "Example: python manage.py seed_company_demo --reset --confirm"
                )
            self._reset()

        # Read password from env; generate a strong random one if not set
        password = os.environ.get("DEMO_PASSWORD") or secrets.token_urlsafe(12)

        with transaction.atomic():
            users   = self._create_users(password)
            company = self._create_company(users)
            teams   = self._create_teams(company, users)
            projects = self._create_projects(teams, users)
            self._create_tasks_and_sprints(projects, users)
            self._create_messages(teams, users)

        self._print_summary(password)

    # ──────────────────────────────────────────────────────────────────────────
    # Reset  (only deletes objects tagged with DEMO_MARKER)
    # ──────────────────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.companies.models import Company
        from apps.teams.models import Team

        self.stdout.write(self.style.WARNING("Resetting demo data (tagged objects only)..."))

        # Delete only the demo company — cascades to its members/invites
        deleted_co, _ = Company.objects.filter(
            slug=COMPANY_SLUG, notes__startswith=DEMO_MARKER
        ).delete()

        # Delete only demo-tagged teams (those not already cascade-deleted)
        deleted_teams, _ = Team.objects.filter(
            name__in=["Engineering", "Design", "Marketing"],
            created_by__email__in=[u[1] for u in USERS],
        ).delete()

        # Delete only demo users
        deleted_users, _ = User.objects.filter(
            models.Q(email__in=[u[1] for u in USERS] + ["newdesigner@nova-agency.com"]) |
            models.Q(email__startswith="demo+")
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Reset complete: {deleted_co} companies, "
                f"{deleted_teams} teams, {deleted_users} users removed."
            )
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Users
    # ──────────────────────────────────────────────────────────────────────────

    def _create_users(self, password: str) -> dict[str, User]:
        users = {}
        for full_name, email, _role in USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "is_active": True},
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user: {email}")
            else:
                # Re-apply password on re-seed so it always matches what's printed
                user.set_password(password)
                user.save(update_fields=["password"])
                self.stdout.write(f"  Updated user: {email}")
            users[email] = user
        return users

    # ──────────────────────────────────────────────────────────────────────────
    # Company
    # ──────────────────────────────────────────────────────────────────────────

    def _create_company(self, users: dict) -> "Company":
        from apps.companies.models import Company, CompanyMember, CompanyInvite

        sarah = users["sarah@nova-agency.com"]
        alex  = users["alex@nova-agency.com"]

        company, created = Company.objects.get_or_create(
            slug=COMPANY_SLUG,
            defaults={
                "name": COMPANY_NAME,
                "website": "https://nova-agency.com",
                "industry": "consulting",
                "size": "11-50",
                "country": "United States",
                "ceo": sarah,
                "created_by": sarah,
                "onboarding_status": "active",
                "onboarding_completed_at": timezone.now(),
                # email_domain_verified is intentionally False so no real user
                # auto-joins this demo company when registering with @nova-agency.com
                "email_domain": "nova-agency.com",
                "email_domain_verified": False,
                "notes": f"{DEMO_MARKER} Demo company — safe to delete via seed_company_demo --reset --confirm",
                "settings_json": {
                    "ai_enabled": True,
                    "notifications_enabled": True,
                    "allowed_plan": "ai",
                    "max_members": None,
                    "audit_retention_days": 365,
                },
            },
        )

        if not created:
            self.stdout.write(f"  Company '{COMPANY_NAME}' already exists — updating members.")

        # Assign company-level roles
        role_map = {email: role for _, email, role in USERS}
        for email, user in users.items():
            role = role_map[email]
            member, member_created = CompanyMember.objects.get_or_create(
                company=company,
                user=user,
                defaults={"role": role, "invited_by": sarah},
            )
            if not member_created and member.role != role:
                member.role = role
                member.save()

        # One pending invite so the Invites tab has something to show
        CompanyInvite.objects.get_or_create(
            company=company,
            email="newdesigner@nova-agency.com",
            defaults={
                "role": "member",
                "invited_by": alex,
                "status": "pending",
                "expires_at": timezone.now() + datetime.timedelta(days=6),
            },
        )

        self.stdout.write(self.style.SUCCESS(f"  Company '{COMPANY_NAME}' ready (id={company.id})"))
        return company

    # ──────────────────────────────────────────────────────────────────────────
    # Teams
    # ──────────────────────────────────────────────────────────────────────────

    def _create_teams(self, company: "Company", users: dict) -> dict:
        from apps.teams.models import Team, TeamMember

        sarah  = users["sarah@nova-agency.com"]
        alex   = users["alex@nova-agency.com"]
        priya  = users["priya@nova-agency.com"]
        jordan = users["jordan@nova-agency.com"]
        dana   = users["dana@nova-agency.com"]
        marcus = users["marcus@nova-agency.com"]

        team_specs = [
            {
                "name": "Engineering",
                "plan": "ai",
                "members": [
                    (sarah,  "ceo"),
                    (alex,   "admin"),
                    (priya,  "manager"),
                    (jordan, "member"),
                    (dana,   "member"),
                    (marcus, "viewer"),
                ],
            },
            {
                "name": "Design",
                "plan": "pro",
                "members": [
                    (sarah,  "ceo"),
                    (alex,   "admin"),
                    (priya,  "manager"),
                    (dana,   "member"),
                    (marcus, "viewer"),
                ],
            },
            {
                "name": "Marketing",
                "plan": "free",
                "members": [
                    (sarah,  "ceo"),
                    (alex,   "admin"),
                    (jordan, "member"),
                    (marcus, "viewer"),
                ],
            },
        ]

        teams = {}
        for spec in team_specs:
            team, _ = Team.objects.get_or_create(
                name=spec["name"],
                created_by=sarah,          # scoped to demo creator so --reset is precise
                defaults={
                    "company": company,
                    "plan": spec["plan"],
                    "ai_enabled": spec["plan"] == "ai",
                },
            )
            if team.company_id != company.id:
                team.company = company
                team.save()

            for user, role in spec["members"]:
                TeamMember.objects.get_or_create(
                    team=team, user=user,
                    defaults={"role": role, "invited_by": sarah},
                )

            teams[spec["name"]] = team
            self.stdout.write(f"  Team: {spec['name']}")

        return teams

    # ──────────────────────────────────────────────────────────────────────────
    # Projects, columns, labels
    # ──────────────────────────────────────────────────────────────────────────

    def _create_projects(self, teams: dict, users: dict) -> dict:
        from apps.projects.models import Project, Column, Label

        sarah = users["sarah@nova-agency.com"]
        eng   = teams["Engineering"]
        design = teams["Design"]

        project_specs = [
            {
                "team": eng,
                "name": "Website Redesign",
                "description": "Full website overhaul — homepage, pricing, blog. Q2 launch target.",
                "color": "#6366f1",
                "icon": "🚀",
                "columns": [
                    ("Backlog",       "#94a3b8", False),
                    ("In Progress",   "#3b82f6", False),
                    ("Design Review", "#f59e0b", False),
                    ("Dev Review",    "#8b5cf6", False),
                    ("Done",          "#22c55e", True),
                ],
                "labels": [
                    ("frontend", "#6366f1"),
                    ("backend",  "#0ea5e9"),
                    ("design",   "#f43f5e"),
                    ("bug",      "#ef4444"),
                    ("Q2",       "#f59e0b"),
                ],
            },
            {
                "team": eng,
                "name": "Mobile App",
                "description": "React Native iOS + Android app. Feature parity with web by Q3.",
                "color": "#10b981",
                "icon": "📱",
                "columns": [
                    ("Backlog",     "#94a3b8", False),
                    ("In Progress", "#3b82f6", False),
                    ("QA",          "#f59e0b", False),
                    ("Done",        "#22c55e", True),
                ],
                "labels": [
                    ("iOS",     "#000000"),
                    ("Android", "#3ddc84"),
                    ("bug",     "#ef4444"),
                    ("API",     "#0ea5e9"),
                ],
            },
            {
                "team": design,
                "name": "Brand Refresh",
                "description": "New logo, color system, and component library for Q2.",
                "color": "#f43f5e",
                "icon": "🎨",
                "columns": [
                    ("Brief",       "#94a3b8", False),
                    ("In Progress", "#ec4899", False),
                    ("Review",      "#f59e0b", False),
                    ("Approved",    "#22c55e", True),
                ],
                "labels": [
                    ("logo",        "#6366f1"),
                    ("typography",  "#0ea5e9"),
                    ("colors",      "#f43f5e"),
                    ("components",  "#10b981"),
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
                    "created_by": sarah,
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

    # ──────────────────────────────────────────────────────────────────────────
    # Tasks, sprints, milestones
    # ──────────────────────────────────────────────────────────────────────────

    def _create_tasks_and_sprints(self, projects: dict, users: dict) -> None:
        from apps.projects.models import Task, Sprint, SprintCapacity, Milestone, TaskLink

        sarah  = users["sarah@nova-agency.com"]
        alex   = users["alex@nova-agency.com"]
        priya  = users["priya@nova-agency.com"]
        jordan = users["jordan@nova-agency.com"]
        dana   = users["dana@nova-agency.com"]

        today = datetime.date.today()

        # ── Website Redesign ─────────────────────────────────────────────────
        wr     = projects["Website Redesign"]["project"]
        wr_col = projects["Website Redesign"]["columns"]
        wr_lbl = projects["Website Redesign"]["labels"]

        sprint_wr, _ = Sprint.objects.get_or_create(
            project=wr,
            name="Sprint 3 — Homepage & Nav",
            defaults={
                "goal": "Ship homepage redesign and new navigation before the Q2 deadline.",
                "start_date": today - datetime.timedelta(days=7),
                "end_date":   today + datetime.timedelta(days=7),
                "capacity_hours": 120,
                "status": "active",
                "created_by": sarah,
            },
        )
        for user, hours in [(priya, 40), (jordan, 30), (dana, 30), (alex, 20)]:
            SprintCapacity.objects.get_or_create(
                sprint=sprint_wr, user=user,
                defaults={"capacity_hours": hours},
            )

        Milestone.objects.get_or_create(
            project=wr, name="Public Beta Launch",
            defaults={
                "description": "All homepage + pricing pages shipped, QA signed off.",
                "due_date": today + datetime.timedelta(days=22),
                "status": "planned",
                "created_by": sarah,
            },
        )
        Milestone.objects.get_or_create(
            project=wr, name="SEO Handoff",
            defaults={
                "description": "Final page copy and metadata delivered to SEO team.",
                "due_date": today + datetime.timedelta(days=8),
                "status": "at_risk",
                "created_by": priya,
            },
        )

        wr_task_specs = [
            # (title, col, assignee, priority, issue_type, start_off, due_off, labels, description)
            ("Design hero section",
             "Done", priya, "high", "story", -12, -2, ["design", "frontend"],
             "Above-the-fold hero with headline, CTA, and illustration. Mobile-first."),
            ("Implement hero animation",
             "In Progress", jordan, "high", "task", -5, 3, ["frontend", "Q2"],
             "CSS keyframe entrance animation. Must respect prefers-reduced-motion."),
            ("Build pricing page",
             "In Progress", dana, "urgent", "story", -3, 5, ["frontend", "Q2"],
             "Three-tier pricing table with monthly/annual toggle and Stripe checkout links."),
            ("Fix mobile nav dropdown iOS",
             "In Progress", jordan, "urgent", "bug", -2, 2, ["bug", "frontend"],
             "Dropdown fails to close on outside tap on iOS Safari 16+."),
            ("API endpoints for contact form",
             "Dev Review", alex, "normal", "task", -6, -1, ["backend"],
             "POST /api/contact/ with reCAPTCHA validation, spam filter, email notification."),
            ("Homepage copy — final pass",
             "Design Review", priya, "normal", "task", -4, 6, ["design", "Q2"],
             "Review all headline and body copy against brand voice guidelines."),
            ("SEO metadata — all pages",
             "Backlog", dana, "high", "task", None, 8, ["Q2"],
             "Title tags, OG images, meta descriptions, canonical URLs for all 12 pages."),
            ("Accessibility audit",
             "Backlog", None, "normal", "task", None, 14, ["frontend"],
             "WCAG 2.1 AA compliance pass using axe-core."),
            ("Performance optimisation",
             "Backlog", jordan, "low", "task", None, 18, ["frontend", "Q2"],
             "Target Lighthouse score >= 90. Lazy load images, split chunks, CDN."),
            ("Blog section — design",
             "Backlog", priya, "normal", "story", None, 20, ["design"],
             "Article card grid, featured post hero, category filters."),
        ]

        wr_tasks = {}
        for (title, col_name, assignee, priority, itype, s_off, d_off, lbl_names, desc) in wr_task_specs:
            col     = wr_col.get(col_name) or wr_col["Backlog"]
            start_d = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
            due_d   = (today + datetime.timedelta(days=d_off)) if d_off is not None else None
            task, _ = Task.objects.get_or_create(
                project=wr, title=title,
                defaults={
                    "description": desc,
                    "column": col,
                    "assignee": assignee,
                    "reporter": sarah,
                    "priority": priority,
                    "issue_type": itype,
                    "start_date": start_d,
                    "due_date": due_d,
                    "sprint": sprint_wr if col_name != "Backlog" else None,
                    "estimated_hours": random.choice([4, 6, 8, 12, 16]),
                },
            )
            for lbl_name in lbl_names:
                lbl = wr_lbl.get(lbl_name)
                if lbl:
                    task.labels.add(lbl)
            wr_tasks[title] = task

        # Task dependency demo: "Fix mobile nav" is blocked by "Implement hero animation"
        hero = wr_tasks.get("Implement hero animation")
        nav  = wr_tasks.get("Fix mobile nav dropdown iOS")
        if hero and nav:
            TaskLink.objects.get_or_create(
                source_task=nav, target_task=hero,
                link_type="blocked_by",
                defaults={"created_by": jordan},
            )

        # ── Mobile App ───────────────────────────────────────────────────────
        mob     = projects["Mobile App"]["project"]
        mob_col = projects["Mobile App"]["columns"]
        mob_lbl = projects["Mobile App"]["labels"]

        sprint_mob, _ = Sprint.objects.get_or_create(
            project=mob, name="Sprint 1 — Auth & Onboarding",
            defaults={
                "goal": "Ship login, registration, and onboarding flow on both platforms.",
                "start_date": today - datetime.timedelta(days=3),
                "end_date":   today + datetime.timedelta(days=11),
                "capacity_hours": 80,
                "status": "active",
                "created_by": alex,
            },
        )

        Milestone.objects.get_or_create(
            project=mob, name="App Store Submission",
            defaults={
                "description": "iOS + Android builds submitted for review.",
                "due_date": today + datetime.timedelta(days=45),
                "status": "planned",
                "created_by": alex,
            },
        )

        mob_task_specs = [
            ("Auth flow — login screen",     "Done",        jordan, "high",   "story", -10, -3, ["iOS", "Android"]),
            ("Push notifications setup",     "In Progress", dana,   "high",   "task",  -4,  4,  ["iOS", "Android"]),
            ("Onboarding carousel",          "In Progress", jordan, "normal", "story", -2,  6,  ["iOS"]),
            ("API client with retry logic",  "QA",          alex,   "normal", "task",  -7, -1,  ["API"]),
            ("Crash on Android back button", "In Progress", dana,   "urgent", "bug",   -1,  1,  ["bug", "Android"]),
            ("Profile settings screen",      "Backlog",     jordan, "normal", "task",  None, 12, ["iOS", "Android"]),
        ]

        for (title, col_name, assignee, priority, itype, s_off, d_off, lbl_names) in mob_task_specs:
            col     = mob_col.get(col_name) or mob_col["Backlog"]
            start_d = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
            due_d   = (today + datetime.timedelta(days=d_off)) if d_off is not None else None
            task, _ = Task.objects.get_or_create(
                project=mob, title=title,
                defaults={
                    "column": col,
                    "assignee": assignee,
                    "reporter": alex,
                    "priority": priority,
                    "issue_type": itype,
                    "start_date": start_d,
                    "due_date": due_d,
                    "sprint": sprint_mob if col_name != "Backlog" else None,
                    "estimated_hours": random.choice([4, 6, 8]),
                },
            )
            for lbl_name in lbl_names:
                lbl = mob_lbl.get(lbl_name)
                if lbl:
                    task.labels.add(lbl)

        # ── Brand Refresh ────────────────────────────────────────────────────
        br     = projects["Brand Refresh"]["project"]
        br_col = projects["Brand Refresh"]["columns"]
        br_lbl = projects["Brand Refresh"]["labels"]

        Milestone.objects.get_or_create(
            project=br, name="Brand Guidelines Delivered",
            defaults={
                "description": "Final PDF brand book signed off by CEO.",
                "due_date": today + datetime.timedelta(days=30),
                "status": "planned",
                "created_by": priya,
            },
        )

        br_task_specs = [
            ("Logo concepts — round 1",  "Approved",    priya, "high",   "task", -14, -7,  ["logo"]),
            ("Logo refinement — final",  "Review",      priya, "high",   "task", -6,   3,  ["logo"]),
            ("Color system definition",  "In Progress", dana,  "normal", "task", -3,   7,  ["colors"]),
            ("Typography scale",         "In Progress", dana,  "normal", "task", -2,   8,  ["typography"]),
            ("Button component library", "Brief",       priya, "normal", "task", None, 14, ["components"]),
            ("Icon set — 48 icons",      "Brief",       dana,  "low",    "task", None, 21, ["components"]),
        ]

        for (title, col_name, assignee, priority, itype, s_off, d_off, lbl_names) in br_task_specs:
            col     = br_col.get(col_name) or br_col["Brief"]
            start_d = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
            due_d   = (today + datetime.timedelta(days=d_off)) if d_off is not None else None
            task, _ = Task.objects.get_or_create(
                project=br, title=title,
                defaults={
                    "column": col,
                    "assignee": assignee,
                    "reporter": priya,
                    "priority": priority,
                    "issue_type": itype,
                    "start_date": start_d,
                    "due_date": due_d,
                    "estimated_hours": random.choice([4, 8, 12]),
                },
            )
            for lbl_name in lbl_names:
                lbl = br_lbl.get(lbl_name)
                if lbl:
                    task.labels.add(lbl)

        self.stdout.write("  Tasks, sprints, and milestones created.")

    # ──────────────────────────────────────────────────────────────────────────
    # Messages
    # ──────────────────────────────────────────────────────────────────────────

    def _create_messages(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember, Message

        sarah  = users["sarah@nova-agency.com"]
        alex   = users["alex@nova-agency.com"]
        priya  = users["priya@nova-agency.com"]
        jordan = users["jordan@nova-agency.com"]
        dana   = users["dana@nova-agency.com"]
        marcus = users["marcus@nova-agency.com"]

        eng = teams["Engineering"]

        channel_specs = [
            {
                "name": "general",
                "display_name": "General",
                "description": "Team-wide announcements and casual chat.",
                "is_private": False,
                "members": [sarah, alex, priya, jordan, dana, marcus],
                "messages": [
                    (sarah,  "Morning everyone! Sprint 3 kickoff today — let's nail the homepage by end of week"),
                    (alex,   "Ready! I'll have the API endpoints done today so Jordan can start integration tomorrow."),
                    (priya,  "Hero section design is signed off. Moving it to Done now."),
                    (jordan, "On it. Also flagged a bug in the iOS nav — creating a ticket now."),
                    (dana,   "Pricing page WIP — should have a draft for review by EOD."),
                    (marcus, "Looking forward to seeing the homepage. Let me know if you need any feedback."),
                    (sarah,  "@Alex great work on the contact form API. That unblocks the frontend team."),
                    (alex,   "Thanks! @Priya can you review the copy on the pricing tiers before I hook it up?"),
                    (priya,  "On my list for this morning. Will ping you in #design-review when done."),
                ],
            },
            {
                "name": "engineering",
                "display_name": "Engineering",
                "description": "Technical discussions, PR reviews, incidents.",
                "is_private": False,
                "members": [sarah, alex, priya, jordan, dana],
                "messages": [
                    (alex,   "PR #42 up for the contact form API. Could use a review from @Jordan."),
                    (jordan, "On it — spotted one thing: we should rate-limit the endpoint. Added a comment."),
                    (alex,   "Good catch. Fixed + pushed. Ready for re-review."),
                    (dana,   "Quick question: are we using Tailwind for the pricing page or custom CSS?"),
                    (priya,  "Tailwind + our design tokens. Check the tokens.css file in /styles."),
                    (jordan, "The iOS nav bug is reproducible on Safari 16.4. Touch event listener issue — working on a fix."),
                    (alex,   "Decision: going with REST for the mobile API, not GraphQL. @Jordan can you update the docs?"),
                    (jordan, "Done. Updated the README."),
                ],
            },
            {
                "name": "design-review",
                "display_name": "Design Review",
                "description": "Design feedback, Figma links, asset sign-offs.",
                "is_private": True,
                "members": [sarah, priya, dana, alex],
                "messages": [
                    (priya,  "Hero section v3 is in Figma — please review by tomorrow."),
                    (sarah,  "Love the direction! One note: the CTA button needs more contrast on mobile."),
                    (priya,  "Fixed — bumped the contrast ratio to 7:1. Updated in Figma."),
                    (dana,   "Pricing page mockup ready — two variants, toggle included."),
                    (alex,   "Variant B looks cleaner. Going with that one."),
                    (priya,  "Agreed. @Dana can you also send the mobile breakpoints for the pricing table?"),
                    (dana,   "Sent via DM — let me know if you need anything else."),
                ],
            },
        ]

        for spec in channel_specs:
            channel, _ = Channel.objects.get_or_create(
                team=eng, name=spec["name"],
                defaults={
                    "display_name": spec["display_name"],
                    "description": spec["description"],
                    "is_private": spec["is_private"],
                    "created_by": sarah,
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
                        client_id=f"seed-{channel.name}-{i}",
                    )

        self.stdout.write("  Channels and messages created.")

    # ──────────────────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────────────────

    def _print_summary(self, password: str) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write(self.style.SUCCESS("  Nova Agency demo seeded successfully"))
        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write("")
        self.stdout.write("  DEMO LOGIN CREDENTIALS")
        self.stdout.write("  " + "-" * 56)
        self.stdout.write(f"  {'Name':<16} {'Email':<38} {'Role':<8}")
        self.stdout.write("  " + "-" * 56)
        for full_name, email, role in USERS:
            self.stdout.write(f"  {full_name:<16} {email:<38} {role:<8}")
        self.stdout.write("")
        self.stdout.write(f"  Password for ALL accounts: {password}")
        self.stdout.write("")
        self.stdout.write("  NOTE: email_domain_verified=False so no real registrations")
        self.stdout.write("  auto-join this demo company.")
        self.stdout.write("")
        self.stdout.write("  WHAT'S BEEN CREATED")
        self.stdout.write("  " + "-" * 56)
        self.stdout.write("  Company    : Nova Agency (active, AI plan)")
        self.stdout.write("  Teams      : Engineering (AI) / Design (Pro) / Marketing (Free)")
        self.stdout.write("  Projects   : Website Redesign / Mobile App / Brand Refresh")
        self.stdout.write("  Sprints    : Sprint 3 active (Website Redesign)")
        self.stdout.write("               Sprint 1 active (Mobile App)")
        self.stdout.write("  Milestones : Public Beta Launch / SEO Handoff (at risk)")
        self.stdout.write("               App Store Submission / Brand Guidelines")
        self.stdout.write("  Tasks      : 26 tasks — all columns, priorities, issue types")
        self.stdout.write("  Task link  : 'Fix mobile nav' blocked_by 'Implement hero animation'")
        self.stdout.write("  Channels   : #general / #engineering / #design-review (private)")
        self.stdout.write("  Messages   : 24 seeded messages across 3 channels")
        self.stdout.write("  Invite     : 1 pending (newdesigner@nova-agency.com -> Member)")
        self.stdout.write("")
        self.stdout.write("  TO RESET:")
        self.stdout.write("  python manage.py seed_company_demo --reset --confirm")
        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write("")
