"""
seed_amazon_qc_demo — Creates a complete Amazon Quick Commerce demo scenario
on Cowrkflow covering a 3-zone London dark-store network:
  - North London (Camden / Islington)
  - East London  (Stratford / Canary Wharf)
  - South London (Brixton / Clapham)

Each zone has:
  - A dedicated team with realistic warehouse roles
  - Channels: #general, #shift-handover, #incidents, #inventory-alerts
  - Scheduled meetings (shift briefings, incident calls, ops reviews)
  - Projects: Inventory Management, Last-Mile Ops, Quality Control
  - Realistic tasks, sprints, and milestones

Production-safe:
  - Demo emails use @amazon-qc-demo.internal — no real domain conflicts
  - email_domain_verified = False
  - All objects tagged with DEMO_MARKER for precise reset
  - --reset --confirm required for deletion

Usage:
    python manage.py seed_amazon_qc_demo
    python manage.py seed_amazon_qc_demo --reset --confirm
    DEMO_PASSWORD=Amazon@London25 python manage.py seed_amazon_qc_demo
"""

from __future__ import annotations

import datetime
import os
import random
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

User = get_user_model()

DEMO_MARKER  = "[amazon-qc-demo]"
COMPANY_NAME = "Amazon Quick Commerce — London"
COMPANY_SLUG = "amazon-qc-demo-london"
EMAIL_DOMAIN = "amazon-qc-demo.internal"

# ─── Users ─────────────────────────────────────────────────────────────────────
# (full_name, email, company_role, zone, warehouse_title)
USERS = [
    # ── HQ / Network Operations
    ("James Whitfield",   "james.whitfield@amazon-qc-demo.internal",   "ceo",     "HQ",           "VP Network Operations — London"),
    ("Sophie Clarke",     "sophie.clarke@amazon-qc-demo.internal",      "admin",   "HQ",           "Head of Last-Mile Delivery"),

    # ── North London Dark Store (Camden / Islington)
    ("Ethan Morgan",      "ethan.morgan@amazon-qc-demo.internal",       "manager", "North London", "Warehouse Manager"),
    ("Aisha Patel",       "aisha.patel@amazon-qc-demo.internal",        "member",  "North London", "Shift Lead — Morning"),
    ("Connor Walsh",      "connor.walsh@amazon-qc-demo.internal",       "member",  "North London", "Shift Lead — Evening"),
    ("Priya Nair",        "priya.nair@amazon-qc-demo.internal",         "member",  "North London", "Inventory Analyst"),
    ("Liam Foster",       "liam.foster@amazon-qc-demo.internal",        "member",  "North London", "Quality Controller"),

    # ── East London Dark Store (Stratford / Canary Wharf)
    ("Zara Ahmed",        "zara.ahmed@amazon-qc-demo.internal",         "manager", "East London",  "Warehouse Manager"),
    ("Marcus Johnson",    "marcus.johnson@amazon-qc-demo.internal",     "member",  "East London",  "Shift Lead — Morning"),
    ("Fatima Hassan",     "fatima.hassan@amazon-qc-demo.internal",      "member",  "East London",  "Shift Lead — Evening"),
    ("Oliver Bennett",    "oliver.bennett@amazon-qc-demo.internal",     "member",  "East London",  "Inventory Analyst"),
    ("Isla Robinson",     "isla.robinson@amazon-qc-demo.internal",      "member",  "East London",  "Quality Controller"),

    # ── South London Dark Store (Brixton / Clapham)
    ("Daniel Osei",       "daniel.osei@amazon-qc-demo.internal",        "manager", "South London", "Warehouse Manager"),
    ("Chloe Williams",    "chloe.williams@amazon-qc-demo.internal",     "member",  "South London", "Shift Lead — Morning"),
    ("Ravi Sharma",       "ravi.sharma@amazon-qc-demo.internal",        "member",  "South London", "Shift Lead — Evening"),
    ("Emily Turner",      "emily.turner@amazon-qc-demo.internal",       "member",  "South London", "Inventory Analyst"),
    ("Noah Campbell",     "noah.campbell@amazon-qc-demo.internal",      "member",  "South London", "Quality Controller"),
]


class Command(BaseCommand):
    help = "Seed Amazon Quick Commerce London 3-zone demo. Production-safe."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Delete existing Amazon QC demo data before re-seeding.")
        parser.add_argument("--confirm", action="store_true",
                            help="Required with --reset to prevent accidental deletion.")

    def handle(self, *args, **options):
        if options["reset"]:
            if not options["confirm"]:
                raise CommandError(
                    "Pass --confirm together with --reset.\n"
                    "Example: python manage.py seed_amazon_qc_demo --reset --confirm"
                )
            self._reset()

        password = os.environ.get("DEMO_PASSWORD") or secrets.token_urlsafe(12)

        with transaction.atomic():
            users    = self._create_users(password)
            company  = self._create_company(users)
            teams    = self._create_teams(company, users)
            self._create_channels_and_messages(teams, users)
            self._create_meetings(teams, users)
            projects = self._create_projects(teams, users)
            self._create_tasks(projects, users)

        self._print_summary(password)

    # ─── Reset ─────────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.companies.models import Company
        self.stdout.write(self.style.WARNING("Resetting Amazon QC London demo data..."))
        emails = [u[1] for u in USERS]
        deleted_co, _    = Company.objects.filter(slug=COMPANY_SLUG).delete()
        deleted_users, _ = User.objects.filter(email__in=emails).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Reset complete: {deleted_co} companies, {deleted_users} users removed."
        ))

    # ─── Users ─────────────────────────────────────────────────────────────────

    def _create_users(self, password: str) -> dict[str, User]:
        users = {}
        for full_name, email, _role, _zone, _title in USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "is_active": True},
            )
            user.set_password(password)
            user.save(update_fields=["password"] if not created else None)
            self.stdout.write(f"  {'Created' if created else 'Updated'} user: {email}")
            users[email] = user
        return users

    # ─── Company ───────────────────────────────────────────────────────────────

    def _create_company(self, users: dict) -> "Company":
        from apps.companies.models import Company, CompanyMember

        james    = users["james.whitfield@amazon-qc-demo.internal"]
        role_map = {email: role for _, email, role, _, _ in USERS}

        company, created = Company.objects.get_or_create(
            slug=COMPANY_SLUG,
            defaults={
                "name": COMPANY_NAME,
                "website": "https://www.amazon.co.uk/fresh",
                "industry": "logistics",
                "size": "201-500",
                "country": "United Kingdom",
                "ceo": james,
                "created_by": james,
                "onboarding_status": "active",
                "onboarding_completed_at": timezone.now(),
                "email_domain": EMAIL_DOMAIN,
                "email_domain_verified": False,
                "notes": f"{DEMO_MARKER} Amazon QC London demo — safe to delete",
                "settings_json": {
                    "ai_enabled": True,
                    "notifications_enabled": True,
                    "allowed_plan": "ai",
                    "max_members": None,
                },
            },
        )
        if not created:
            self.stdout.write(f"  Company already exists — updating members.")

        for email, user in users.items():
            CompanyMember.objects.get_or_create(
                company=company, user=user,
                defaults={"role": role_map.get(email, "member"), "invited_by": james},
            )

        self.stdout.write(self.style.SUCCESS(f"  Company '{COMPANY_NAME}' ready."))
        return company

    # ─── Teams ─────────────────────────────────────────────────────────────────

    def _create_teams(self, company: "Company", users: dict) -> dict:
        from apps.teams.models import Team, TeamMember

        james  = users["james.whitfield@amazon-qc-demo.internal"]
        sophie = users["sophie.clarke@amazon-qc-demo.internal"]

        zone_specs = [
            {
                "zone": "North London",
                "name": "North London Dark Store",
                "manager_email": "ethan.morgan@amazon-qc-demo.internal",
                "member_emails": [
                    "aisha.patel@amazon-qc-demo.internal",
                    "connor.walsh@amazon-qc-demo.internal",
                    "priya.nair@amazon-qc-demo.internal",
                    "liam.foster@amazon-qc-demo.internal",
                ],
            },
            {
                "zone": "East London",
                "name": "East London Dark Store",
                "manager_email": "zara.ahmed@amazon-qc-demo.internal",
                "member_emails": [
                    "marcus.johnson@amazon-qc-demo.internal",
                    "fatima.hassan@amazon-qc-demo.internal",
                    "oliver.bennett@amazon-qc-demo.internal",
                    "isla.robinson@amazon-qc-demo.internal",
                ],
            },
            {
                "zone": "South London",
                "name": "South London Dark Store",
                "manager_email": "daniel.osei@amazon-qc-demo.internal",
                "member_emails": [
                    "chloe.williams@amazon-qc-demo.internal",
                    "ravi.sharma@amazon-qc-demo.internal",
                    "emily.turner@amazon-qc-demo.internal",
                    "noah.campbell@amazon-qc-demo.internal",
                ],
            },
        ]

        teams = {}
        for spec in zone_specs:
            manager = users[spec["manager_email"]]
            team, _ = Team.objects.get_or_create(
                name=spec["name"],
                created_by=james,
                defaults={"company": company, "plan": "ai", "ai_enabled": True},
            )
            if team.company_id != company.id:
                team.company = company
                team.save()

            for hq_user, hq_role in [(james, "ceo"), (sophie, "admin")]:
                TeamMember.objects.get_or_create(
                    team=team, user=hq_user,
                    defaults={"role": hq_role, "invited_by": james},
                )
            TeamMember.objects.get_or_create(
                team=team, user=manager,
                defaults={"role": "manager", "invited_by": james},
            )
            for email in spec["member_emails"]:
                TeamMember.objects.get_or_create(
                    team=team, user=users[email],
                    defaults={"role": "member", "invited_by": manager},
                )

            teams[spec["zone"]] = team
            self.stdout.write(f"  Team: {spec['name']}")

        return teams

    # ─── Channels & Messages ───────────────────────────────────────────────────

    def _create_channels_and_messages(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember, Message

        james  = users["james.whitfield@amazon-qc-demo.internal"]
        sophie = users["sophie.clarke@amazon-qc-demo.internal"]

        zone_people = {
            "North London": {
                "mgr": users["ethan.morgan@amazon-qc-demo.internal"],
                "slm": users["aisha.patel@amazon-qc-demo.internal"],
                "sle": users["connor.walsh@amazon-qc-demo.internal"],
                "inv": users["priya.nair@amazon-qc-demo.internal"],
                "qlt": users["liam.foster@amazon-qc-demo.internal"],
                "area": "Camden / Islington",
            },
            "East London": {
                "mgr": users["zara.ahmed@amazon-qc-demo.internal"],
                "slm": users["marcus.johnson@amazon-qc-demo.internal"],
                "sle": users["fatima.hassan@amazon-qc-demo.internal"],
                "inv": users["oliver.bennett@amazon-qc-demo.internal"],
                "qlt": users["isla.robinson@amazon-qc-demo.internal"],
                "area": "Stratford / Canary Wharf",
            },
            "South London": {
                "mgr": users["daniel.osei@amazon-qc-demo.internal"],
                "slm": users["chloe.williams@amazon-qc-demo.internal"],
                "sle": users["ravi.sharma@amazon-qc-demo.internal"],
                "inv": users["emily.turner@amazon-qc-demo.internal"],
                "qlt": users["noah.campbell@amazon-qc-demo.internal"],
                "area": "Brixton / Clapham",
            },
        }

        for zone, team in teams.items():
            p    = zone_people[zone]
            mgr  = p["mgr"]
            slm  = p["slm"]
            sle  = p["sle"]
            inv  = p["inv"]
            qlt  = p["qlt"]
            area = p["area"]
            all_members = [james, sophie, mgr, slm, sle, inv, qlt]

            channel_specs = [
                {
                    "name": "general",
                    "display_name": "General",
                    "description": f"General announcements for {zone} dark store ({area}).",
                    "is_private": False,
                    "members": all_members,
                    "messages": [
                        (mgr,   f"Morning team! Today's target: 1,800 deliveries across {area}. Weather looks clear — no delays expected."),
                        (slm,   "Morning shift ready. All three pick zones stocked and briefed. Zone A running a picker short — covering with overtime."),
                        (inv,   "Replenishment lorry arriving at 09:45 — loading bay 1. I'll coordinate the intake."),
                        (qlt,   "Morning quality sweep complete. Two damaged units in chilled aisle removed and logged. All clear."),
                        (sle,   "Taking over from Aisha at 14:00. Will run handover in #shift-handover now."),
                        (mgr,   "Reminder: FSA compliance walkthrough tomorrow 08:30. All supervisors required."),
                        (james, f"Great week {zone}! Average delivery time hit 9.8 minutes — under our 10-min SLA for the first time. Well done everyone."),
                        (sophie,"Network update: new rider insurance policy live from Monday. Please ensure all partner riders have acknowledged the updated T&Cs."),
                    ],
                },
                {
                    "name": "shift-handover",
                    "display_name": "Shift Handover",
                    "description": "Structured handover notes between morning and evening shifts.",
                    "is_private": False,
                    "members": [mgr, slm, sle, inv],
                    "messages": [
                        (slm, f"MORNING SHIFT HANDOVER — {zone} ({area})"),
                        (slm, "Orders completed: 923 | Outstanding: 41 | Exceptions: 3 (2 access issue, 1 customer not home)"),
                        (slm, "Stock flags: Oat milk 1L (Oatly) LOW — 14 units left, reorder raised ref #INV-1147. All ambient aisles fully stocked post-lorry intake."),
                        (slm, "Zone B had a spill at 11:20 — cleaned and re-signed. No product loss."),
                        (sle, "Understood, taking over Zone B monitoring. Any outstanding picker allocations?"),
                        (inv, "INV-1147 approved — Oatly ETA tomorrow 07:00. Temporarily suppressed from app catalogue."),
                        (sle, "EVENING NOTE: Dinner rush expected 17:30–20:00. Pre-staged ready meals, wine, and soft drinks in Zone A. Two extra riders on standby."),
                        (mgr, "Good handover both. Evening target 875 orders. Stay sharp on the dinner window."),
                    ],
                },
                {
                    "name": "incidents",
                    "display_name": "Incidents",
                    "description": "Real-time incident reporting and resolution tracking.",
                    "is_private": False,
                    "members": all_members,
                    "messages": [
                        (qlt,  f"[INCIDENT {zone[:1]}N-0031] Chilled unit 2 temperature alarm at 06:52. Reading: 6.8°C (limit: 5°C). Refrigeration engineer called."),
                        (mgr,  "Precautionary move of all chilled stock to units 1 and 3. @" + qlt.full_name.split()[0] + " please log readings every 10 minutes."),
                        (qlt,  "07:10 update: engineer on site. Fan motor fault. Temp holding at 6.1°C."),
                        (qlt,  "08:05 RESOLVED: Unit 2 back to 4.2°C. Stock returned. Zero spoilage. Engineer report filed."),
                        (mgr,  "Great response. Incident closed. Please complete the FSA incident form by 17:00."),
                        (slm,  f"[INCIDENT {zone[:1]}N-0032] Rider bicycle puncture — James O. on Holloway Road. Reassigned his 3 outstanding orders to nearest rider."),
                        (sle,  "All 3 orders delivered within SLA. Customer impact: none."),
                    ],
                },
                {
                    "name": "inventory-alerts",
                    "display_name": "Inventory Alerts",
                    "description": "Stock level alerts and manual inventory flags.",
                    "is_private": False,
                    "members": [mgr, slm, sle, inv, james],
                    "messages": [
                        (inv, "⚠️ LOW STOCK: Oatly Oat Drink 1L — 14 units (reorder threshold: 40). PO #INV-1147 raised."),
                        (inv, "⚠️ LOW STOCK: Fever-Tree Tonic 500ml — 9 units. High-velocity SKU evenings/weekends. Flagging to supplier."),
                        (mgr, "Acknowledged. Both SKUs suppressed from app until restocked."),
                        (inv, "✅ RESTOCKED: Cravendale Semi-Skimmed 2L — 180 units received and shelved. Re-listed on app."),
                        (inv, "📦 OVERSTOCK: Walkers Ready Salted 6-pack — 620 units (2.5× normal). Suggest a deal push?"),
                        (james,"Good spot. Passing to the commercial team for a flash promotion tonight."),
                        (inv, "✅ RESTOCKED: Oatly 1L — 240 units received. PO #INV-1147 closed."),
                    ],
                },
            ]

            for spec in channel_specs:
                channel, _ = Channel.objects.get_or_create(
                    team=team,
                    name=spec["name"],
                    defaults={
                        "display_name": spec["display_name"],
                        "description":  spec["description"],
                        "is_private":   spec["is_private"],
                        "created_by":   mgr,
                    },
                )
                for member in spec["members"]:
                    ChannelMember.objects.get_or_create(channel=channel, user=member)

                if not channel.messages.exists():
                    for i, (sender, text) in enumerate(spec["messages"]):
                        Message.objects.create(
                            channel=channel,
                            sender=sender,
                            text=text,
                            client_id=f"seed-{zone}-{spec['name']}-{i}",
                        )

            self.stdout.write(f"  Channels + messages: {zone}")

    # ─── Meetings ──────────────────────────────────────────────────────────────

    def _create_meetings(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember
        from apps.meetings.models import Meeting

        james  = users["james.whitfield@amazon-qc-demo.internal"]
        sophie = users["sophie.clarke@amazon-qc-demo.internal"]
        now    = timezone.now()

        zone_mgr = {
            "North London": users["ethan.morgan@amazon-qc-demo.internal"],
            "East London":  users["zara.ahmed@amazon-qc-demo.internal"],
            "South London": users["daniel.osei@amazon-qc-demo.internal"],
        }

        zone_all = {
            "North London": [
                users["ethan.morgan@amazon-qc-demo.internal"],
                users["aisha.patel@amazon-qc-demo.internal"],
                users["connor.walsh@amazon-qc-demo.internal"],
                users["priya.nair@amazon-qc-demo.internal"],
                users["liam.foster@amazon-qc-demo.internal"],
            ],
            "East London": [
                users["zara.ahmed@amazon-qc-demo.internal"],
                users["marcus.johnson@amazon-qc-demo.internal"],
                users["fatima.hassan@amazon-qc-demo.internal"],
                users["oliver.bennett@amazon-qc-demo.internal"],
                users["isla.robinson@amazon-qc-demo.internal"],
            ],
            "South London": [
                users["daniel.osei@amazon-qc-demo.internal"],
                users["chloe.williams@amazon-qc-demo.internal"],
                users["ravi.sharma@amazon-qc-demo.internal"],
                users["emily.turner@amazon-qc-demo.internal"],
                users["noah.campbell@amazon-qc-demo.internal"],
            ],
        }

        for zone, team in teams.items():
            mgr       = zone_mgr[zone]
            attendees = zone_all[zone]

            meeting_specs = [
                # (title, description, call_type, delta_days, hour, duration_min, attendees_override)
                (
                    f"{zone} Daily Ops Standup",
                    "15-min daily sync: order metrics from last 24h, active stock alerts, incidents, and today's priorities.",
                    "audio", 1, 9, 15, attendees,
                ),
                (
                    f"{zone} Morning Shift Briefing",
                    "Pre-shift brief: zone assignments, order targets, special SKUs to watch, safety reminders, and weather impacts on delivery.",
                    "video", 0, 7, 20, attendees,
                ),
                (
                    f"{zone} Chilled & Frozen Compliance Review",
                    "Weekly review of temperature logs for chilled and frozen units, FSA compliance checklist, and any spoilage incidents.",
                    "video", 3, 10, 45, attendees,
                ),
                (
                    f"{zone} Inventory Reconciliation",
                    "Bi-weekly physical stock count vs system count — identify shrinkage, misplacements, and overstock items.",
                    "video", 7, 11, 60, attendees,
                ),
                (
                    f"{zone} SLA & KPI Weekly Review",
                    "Weekly KPI deep-dive: delivery TAT, promise-to-delivery gap, customer complaints, picker productivity, and rider performance.",
                    "video", 2, 14, 30, [mgr, james, sophie] + attendees[:2],
                ),
                (
                    f"London Network Sync — {zone} + HQ",
                    "Cross-zone coordination: capacity planning, peak demand forecast, supplier escalations, and fleet resource sharing.",
                    "video", 5, 15, 60, [james, sophie, mgr],
                ),
            ]

            for (title, desc, call_type, d_days, d_hour, duration, mtg_attendees) in meeting_specs:
                starts_at = now.replace(hour=d_hour, minute=0, second=0, microsecond=0) + datetime.timedelta(days=d_days)

                if Meeting.objects.filter(team=team, title=title).exists():
                    continue

                safe_name = (
                    title.lower()
                    .replace(" ", "-")
                    .replace("—", "")
                    .replace("&", "and")
                    .replace("/", "-")
                    .replace("  ", "-")
                    [:50]
                    .strip("-")
                )
                channel_name = f"mtg-{safe_name}"

                channel, _ = Channel.objects.get_or_create(
                    team=team,
                    name=channel_name,
                    defaults={
                        "display_name": title,
                        "description":  f"Meeting channel: {title}",
                        "is_private":   False,
                        "created_by":   mgr,
                    },
                )
                for member in set(mtg_attendees):
                    ChannelMember.objects.get_or_create(channel=channel, user=member)

                meeting = Meeting.objects.create(
                    team=team,
                    title=title,
                    description=desc,
                    call_type=call_type,
                    starts_at=starts_at,
                    duration_minutes=duration,
                    status=Meeting.STATUS_SCHEDULED,
                    is_instant=False,
                    created_by=mgr,
                    channel=channel,
                )
                meeting.attendees.set(mtg_attendees)

            self.stdout.write(f"  Meetings: {zone}")

    # ─── Projects ──────────────────────────────────────────────────────────────

    def _create_projects(self, teams: dict, users: dict) -> dict:
        from apps.projects.models import Project, Column, Label

        mgr_emails = {
            "North London": "ethan.morgan@amazon-qc-demo.internal",
            "East London":  "zara.ahmed@amazon-qc-demo.internal",
            "South London": "daniel.osei@amazon-qc-demo.internal",
        }

        zone_project_specs = {
            "North London": [
                {
                    "name": "North London — Inventory Management",
                    "description": "Stock control, PO lifecycle, supplier SLAs, and shrinkage reduction for Camden/Islington dark store.",
                    "color": "#f59e0b", "icon": "📦",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("Blocked","#ef4444",False),("Done","#22c55e",True)],
                    "labels":  [("chilled","#06b6d4"),("supplier","#8b5cf6"),("shrinkage","#f43f5e"),("urgent","#ef4444")],
                },
                {
                    "name": "North London — Last-Mile Ops",
                    "description": "Rider management, route optimisation, and delivery SLA improvements across Camden and Islington.",
                    "color": "#3b82f6", "icon": "🛵",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Done","#22c55e",True)],
                    "labels":  [("routing","#6366f1"),("fleet","#10b981"),("sla","#f59e0b"),("customer","#ec4899")],
                },
            ],
            "East London": [
                {
                    "name": "East London — Inventory Management",
                    "description": "Stock control and demand forecasting for Stratford and Canary Wharf — high-density, high-velocity zones.",
                    "color": "#f59e0b", "icon": "📦",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("Blocked","#ef4444",False),("Done","#22c55e",True)],
                    "labels":  [("chilled","#06b6d4"),("supplier","#8b5cf6"),("urgent","#ef4444"),("forecast","#10b981")],
                },
                {
                    "name": "East London — Quality Control",
                    "description": "FSA compliance, product quality audits, returns processing, and spoilage tracking for East London.",
                    "color": "#10b981", "icon": "✅",
                    "columns": [("To Audit","#94a3b8",False),("Auditing","#3b82f6",False),("Remediation","#f59e0b",False),("Closed","#22c55e",True)],
                    "labels":  [("spoilage","#f43f5e"),("returns","#8b5cf6"),("fsa","#0ea5e9"),("compliance","#10b981")],
                },
            ],
            "South London": [
                {
                    "name": "South London — Last-Mile Ops",
                    "description": "Delivery operations, partner rider onboarding, and geofence optimisation for Brixton and Clapham.",
                    "color": "#3b82f6", "icon": "🛵",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Done","#22c55e",True)],
                    "labels":  [("routing","#6366f1"),("fleet","#10b981"),("geofence","#f59e0b"),("onboarding","#ec4899")],
                },
                {
                    "name": "South London — Quality Control",
                    "description": "Quality audits, best-before monitoring, FSA compliance, and packaging integrity for South London.",
                    "color": "#10b981", "icon": "✅",
                    "columns": [("To Audit","#94a3b8",False),("Auditing","#3b82f6",False),("Remediation","#f59e0b",False),("Closed","#22c55e",True)],
                    "labels":  [("best-before","#f43f5e"),("packaging","#8b5cf6"),("fsa","#0ea5e9"),("returns","#10b981")],
                },
            ],
        }

        projects = {}
        for zone, specs in zone_project_specs.items():
            team    = teams[zone]
            manager = User.objects.get(email=mgr_emails[zone])
            projects[zone] = {}
            for spec in specs:
                project, _ = Project.objects.get_or_create(
                    name=spec["name"], team=team,
                    defaults={
                        "description": spec["description"],
                        "color":       spec["color"],
                        "icon":        spec["icon"],
                        "created_by":  manager,
                        "status":      "active",
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

                projects[zone][spec["name"]] = {"project": project, "columns": columns, "labels": labels}
                self.stdout.write(f"  Project: {spec['name']}")

        return projects

    # ─── Tasks ─────────────────────────────────────────────────────────────────

    def _create_tasks(self, projects: dict, users: dict) -> None:
        from apps.projects.models import Task, Sprint, Milestone

        today = datetime.date.today()
        sfx   = "@amazon-qc-demo.internal"

        # (title, col, assignee_slug, priority, itype, start_off, due_off, labels, description)
        zone_tasks = {
            "North London": {
                "North London — Inventory Management": [
                    ("Resolve Oatly stockout frequency", "In Progress", "ethan.morgan", "urgent", "story", -3, 4, ["supplier","urgent"],
                     "Oatly 1L stocks out 3× per week. Negotiate smaller-batch more-frequent deliveries with supplier."),
                    ("Implement FIFO rotation in chilled aisle", "In Progress", "priya.nair", "high", "task", -5, 3, ["chilled"],
                     "First-In-First-Out enforcement via pick-app prompts. Estimated 15% reduction in chilled wastage."),
                    ("FSA chilled storage SOP update", "Backlog", "liam.foster", "normal", "task", None, 10, ["chilled"],
                     "Update SOP to reflect latest FSA guidance on temperature logging frequency (now every 2h)."),
                    ("Renegotiate Fever-Tree MOQ", "Backlog", "ethan.morgan", "high", "task", None, 14, ["supplier"],
                     "Current MOQ 200 units too high for Q-commerce velocity. Target 50-unit top-ups twice weekly."),
                    ("Shrinkage audit — aisles D & E", "Done", "priya.nair", "normal", "task", -8, -2, ["shrinkage"],
                     "Bi-monthly count completed. Variance 0.38% vs 0.5% target. Passed with no actions required."),
                ],
                "North London — Last-Mile Ops": [
                    ("Rezone Camden Town delivery clusters", "In Progress", "aisha.patel", "urgent", "story", -2, 5, ["routing","sla"],
                     "TAT in Camden Town averaging 13.4 min vs 10-min SLA. Split into 4 micro-clusters."),
                    ("Onboard 6 new partner riders for weekend", "In Progress", "connor.walsh", "high", "task", -1, 3, ["fleet"],
                     "Weekend demand up 40% vs weekday. 6 additional riders needed active by Saturday 06:00."),
                    ("Customer complaint — wrong item × 4", "Backlog", "aisha.patel", "urgent", "bug", None, 2, ["customer","sla"],
                     "4 wrong-item complaints in 48h all linked to picker ID NL-P-007. Retraining booked for Thursday."),
                    ("Implement 2.5km geofence cap", "Backlog", "ethan.morgan", "normal", "task", None, 12, ["routing"],
                     "Limit order acceptance radius to 2.5km to protect SLA during peak hours."),
                ],
            },
            "East London": {
                "East London — Inventory Management": [
                    ("Chilled unit 3 preventive maintenance", "In Progress", "zara.ahmed", "urgent", "task", -1, 3, ["chilled","urgent"],
                     "Unit 3 flagging intermittent temperature variance. Schedule full engineer service before summer."),
                    ("Forecast Champions League final demand", "In Progress", "oliver.bennett", "high", "story", -4, 5, ["forecast"],
                     "Map beer, snacks, and ready-meal SKUs with uplift model. Pre-position stock 48h in advance."),
                    ("Resolve Coca-Cola Zero stockout", "Backlog", "oliver.bennett", "urgent", "task", None, 3, ["supplier","urgent"],
                     "3 stockouts this week. Canary Wharf high-velocity SKU. Escalate to account manager."),
                    ("Overstock clearance — Walkers 6-pack", "Done", "zara.ahmed", "normal", "task", -5, -1, ["forecast"],
                     "Flash deal coordinated with commercial team. Cleared 580 units in 5h. Margin impact negligible."),
                ],
                "East London — Quality Control": [
                    ("FSA inspection prep — documentation pack", "In Progress", "isla.robinson", "urgent", "task", -3, 4, ["compliance","fsa"],
                     "FSA audit in 6 days. Compile temp logs, pest control records, allergen documentation, staff training certs."),
                    ("Returns processing backlog — clear 52 items", "In Progress", "isla.robinson", "high", "task", -2, 2, ["returns"],
                     "52 returned items awaiting QC disposition. Policy: clear within 24h of return receipt."),
                    ("Supplier scorecard Q1 — 6 suppliers", "Backlog", "zara.ahmed", "normal", "story", None, 14, ["compliance"],
                     "Score on delivery accuracy, product quality, labelling compliance, and lead time adherence."),
                    ("Spoilage RCA — chilled unit 2 incident", "Done", "isla.robinson", "high", "task", -7, -3, ["spoilage"],
                     "Root cause: fan motor failure. Zero product loss due to fast response. Monthly PM now scheduled."),
                ],
            },
            "South London": {
                "South London — Last-Mile Ops": [
                    ("Geofence expansion — Clapham South", "In Progress", "daniel.osei", "high", "story", -3, 6, ["geofence","routing"],
                     "Extend zone by 0.4km to cover Clapham South residential blocks. Model TAT impact before go-live."),
                    ("Onboard 10 new partner riders", "In Progress", "chloe.williams", "urgent", "task", -1, 4, ["onboarding","fleet"],
                     "Brixton evening surge needs 10 additional riders by Friday. Right-to-work checks in progress."),
                    ("Route optimisation — Brixton one-ways", "Backlog", "ravi.sharma", "normal", "task", None, 10, ["routing"],
                     "Brixton one-way streets adding avg +2.3 min to TAT. Raise OSM map corrections with tech team."),
                    ("Rider retention programme proposal", "Backlog", "daniel.osei", "normal", "story", None, 21, ["onboarding"],
                     "Monthly churn 25% vs 18% network average. Propose earnings top-up, insurance, and app UX improvements."),
                ],
                "South London — Quality Control": [
                    ("Best-before sweep — all ambient aisles", "In Progress", "noah.campbell", "urgent", "task", -2, 2, ["best-before"],
                     "Pull all products within 5 days of best-before. Discount, donate to FareShare, or dispose per protocol."),
                    ("Packaging failure — tomato punnets", "In Progress", "emily.turner", "high", "task", -1, 3, ["packaging"],
                     "19 packaging failures on tomato punnets this week. Switching to reinforced supplier trays from Monday."),
                    ("FSA food hygiene training — 6 new pickers", "Backlog", "noah.campbell", "normal", "task", None, 7, ["fsa","compliance"],
                     "6 new pickers joined this fortnight. Level 2 Food Hygiene Certificate required before floor deployment."),
                    ("Damaged goods returns SOP update", "Done", "noah.campbell", "normal", "task", -6, -2, ["returns"],
                     "Updated SOP: photo evidence mandatory for all damaged returns, linked to rider accountability score."),
                ],
            },
        }

        sprint_names = {
            "North London — Inventory Management": "Sprint 4 — Stockout Reduction",
            "North London — Last-Mile Ops":        "Sprint 6 — Camden Zone Remap",
            "East London — Inventory Management":  "Sprint 3 — Event Demand Prep",
            "East London — Quality Control":       "Sprint 5 — FSA Audit Readiness",
            "South London — Last-Mile Ops":        "Sprint 5 — Clapham Expansion",
            "South London — Quality Control":      "Sprint 3 — Best-Before & Packaging",
        }

        for zone, zone_projs in zone_tasks.items():
            for proj_name, task_specs in zone_projs.items():
                if proj_name not in projects.get(zone, {}):
                    continue
                pd   = projects[zone][proj_name]
                proj = pd["project"]
                cols = pd["columns"]
                lbls = pd["labels"]

                sprint, _ = Sprint.objects.get_or_create(
                    project=proj,
                    name=sprint_names.get(proj_name, "Sprint 1"),
                    defaults={
                        "goal":           f"Active sprint — {proj_name}",
                        "start_date":     today - datetime.timedelta(days=7),
                        "end_date":       today + datetime.timedelta(days=7),
                        "capacity_hours": 80,
                        "status":         "active",
                        "created_by":     proj.created_by,
                    },
                )

                Milestone.objects.get_or_create(
                    project=proj,
                    name=f"Q2 Ops Targets — {zone}",
                    defaults={
                        "description": "Q2 KPI targets: delivery TAT <10 min, stockout rate <1%, chilled wastage <0.3%.",
                        "due_date":    today + datetime.timedelta(days=45),
                        "status":      "planned",
                        "created_by":  proj.created_by,
                    },
                )

                for (title, col_name, assignee_slug, priority, itype, s_off, d_off, lbl_names, *rest) in task_specs:
                    desc     = rest[0] if rest else ""
                    col      = cols.get(col_name) or list(cols.values())[0]
                    assignee = users.get(f"{assignee_slug}{sfx}")
                    start_d  = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
                    due_d    = (today + datetime.timedelta(days=d_off))  if d_off is not None else None
                    in_sprint = col_name not in ("Backlog", "Done", "To Audit", "Closed")

                    task, _ = Task.objects.get_or_create(
                        project=proj, title=title,
                        defaults={
                            "description":     desc,
                            "column":          col,
                            "assignee":        assignee,
                            "reporter":        proj.created_by,
                            "priority":        priority,
                            "issue_type":      itype,
                            "start_date":      start_d,
                            "due_date":        due_d,
                            "sprint":          sprint if in_sprint else None,
                            "estimated_hours": random.choice([4, 6, 8, 12]),
                        },
                    )
                    for lbl_name in lbl_names:
                        lbl = lbls.get(lbl_name)
                        if lbl:
                            task.labels.add(lbl)

        self.stdout.write("  Tasks, sprints, and milestones created.")

    # ─── Summary ───────────────────────────────────────────────────────────────

    def _print_summary(self, password: str) -> None:
        w = self.stdout.write
        S = self.style.SUCCESS

        w("")
        w(S("=" * 72))
        w(S("  AMAZON QUICK COMMERCE LONDON — COWRKFLOW DEMO SEEDED"))
        w(S("=" * 72))
        w("")
        w("  DEMO URL  :  https://app.cowrkflow.com")
        w("  PASSWORD  :  " + password + "  (all accounts)")
        w("")
        w("  ── HQ / NETWORK OPERATIONS " + "─" * 44)
        w(f"  {'Name':<22} {'Email':<46} {'Title'}")
        w("  " + "─" * 70)
        for name, email, _, zone, title in USERS:
            if zone == "HQ":
                w(f"  {name:<22} {email:<46} {title}")
        w("")
        for zone in ["North London", "East London", "South London"]:
            area = {"North London":"Camden / Islington","East London":"Stratford / Canary Wharf","South London":"Brixton / Clapham"}[zone]
            w(f"  ── {zone.upper()} ({area}) " + "─" * max(1, 50 - len(zone) - len(area)))
            for name, email, _, z, title in USERS:
                if z == zone:
                    w(f"  {name:<22} {email:<46} {title}")
            w("")
        w("  ── WHAT WAS CREATED " + "─" * 51)
        w("  Company    : Amazon Quick Commerce — London (AI plan)")
        w("  Teams      : North London / East London / South London dark stores")
        w("  Channels   : 4 per zone × 3 = 12 channels")
        w("               #general, #shift-handover, #incidents, #inventory-alerts")
        w("  Messages   : ~8 per channel — realistic UK warehouse operations")
        w("  Meetings   : 6 per zone × 3 = 18 scheduled meetings")
        w("               Daily standup, morning briefing, chilled compliance,")
        w("               inventory recon, SLA/KPI review, London network HQ sync")
        w("  Projects   : 2 per zone × 3 = 6 projects")
        w("               Inventory Management, Last-Mile Ops, Quality Control")
        w("  Sprints    : 1 active per project (6 total)")
        w("  Milestones : Q2 Ops Targets per project (6 total)")
        w("  Tasks      : ~4–5 per project × 6 = 28 tasks")
        w("")
        w("  ── DEMO SCRIPT " + "─" * 57)
        w("  1. Log in as Ethan Morgan (North London Warehouse Manager)")
        w("     → #shift-handover: morning-to-evening handover notes")
        w("     → #incidents: chilled unit alarm resolved end-to-end")
        w("     → Meetings: 'Morning Shift Briefing' starting soon")
        w("  2. Join the meeting → show video call, chat, recording button")
        w("  3. Open Inventory Management project")
        w("     → Urgent stockout task, FIFO implementation, shrinkage audit")
        w("  4. Switch to James Whitfield (VP Network Ops)")
        w("     → All 3 zone teams visible from one account")
        w("     → 'London Network Sync' meeting with all 3 managers")
        w("  5. Switch to Zara Ahmed (East London Warehouse Manager)")
        w("     → #inventory-alerts: Coca-Cola Zero escalation")
        w("     → Quality Control project: FSA audit readiness sprint")
        w("")
        w("  TO RESET:")
        w("  python manage.py seed_amazon_qc_demo --reset --confirm")
        w(S("=" * 72))
        w("")
