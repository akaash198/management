"""
seed_ai_demo — Seeds a complete, self-contained AI feature demo workspace.

Company : Spectra AI Labs (fictional)
Scenario: A 12-person AI product team building an ML-powered analytics platform.
          Every AI feature in FlowTeam is exercised: briefings, health scores,
          sprint planning, workload balance, retrospectives, blocker detection,
          escalation scans, experiment summaries, and model card drafts.

Users (5 roles, all AI features accessible):
  - CEO       : alex.chen@spectra-ai-demo.internal        (portfolio_summary, leadership)
  - Admin     : priya.kapoor@spectra-ai-demo.internal     (full admin)
  - Manager   : james.osei@spectra-ai-demo.internal       (sprint/workload/retro/health)
  - Member ×3 : dev1, dev2, ds1 (individual contributor AI features)
  - Viewer    : investor@spectra-ai-demo.internal         (view only)

Projects:
  1. ML Platform Core          — active sprint, tasks across all columns
  2. RAG Pipeline v2           — overdue tasks (triggers health=At Risk)
  3. Anomaly Detection Engine  — experiment-type tasks (triggers experiment_summary)
  4. Client Dashboard          — upcoming sprint, clean healthy state

AI data seeded:
  - AILog history: 30 realistic entries (success, failed, blocked) across features
  - DailyAIBudget: 7 days of usage data per feature
  - CompanyAICredits: 1,000 credits allocated, 247 used
  - CompanyAIAccess: platform-managed mode (demo-safe, no real key needed)
  - AIFeaturePolicy: all 21 features enabled, all 3 tiers configured

Usage:
    python manage.py seed_ai_demo
    python manage.py seed_ai_demo --reset --confirm
    DEMO_PASSWORD=Demo@AI2025 python manage.py seed_ai_demo
"""

from __future__ import annotations

import datetime
import decimal
import os
import random
import secrets
import uuid

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

User = get_user_model()

DEMO_MARKER   = "[spectra-ai-demo]"
COMPANY_NAME  = "Spectra AI Labs"
COMPANY_SLUG  = "spectra-ai-demo"
EMAIL_DOMAIN  = "spectra-ai-demo.internal"

# ── Users ──────────────────────────────────────────────────────────────────────
# (full_name, email, company_role, title)
USERS = [
    ("Alex Chen",       "alex.chen@spectra-ai-demo.internal",      "ceo",     "CEO & Co-Founder"),
    ("Priya Kapoor",    "priya.kapoor@spectra-ai-demo.internal",   "admin",   "Head of Engineering"),
    ("James Osei",      "james.osei@spectra-ai-demo.internal",     "manager", "ML Platform Lead"),
    ("Sofia Martinez",  "sofia.martinez@spectra-ai-demo.internal", "member",  "Senior ML Engineer"),
    ("Liam Park",       "liam.park@spectra-ai-demo.internal",      "member",  "Backend Engineer"),
    ("Nadia Hassan",    "nadia.hassan@spectra-ai-demo.internal",   "member",  "Data Scientist"),
    ("Tom Nguyen",      "investor@spectra-ai-demo.internal",       "viewer",  "Investor Observer"),
]


class Command(BaseCommand):
    help = "Seed a complete AI feature demo workspace (Spectra AI Labs). Production-safe."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Delete existing Spectra AI demo data before re-seeding.")
        parser.add_argument("--confirm", action="store_true",
                            help="Required with --reset to prevent accidental deletion.")

    def handle(self, *args, **options):
        if options["reset"]:
            if not options["confirm"]:
                raise CommandError(
                    "Pass --confirm with --reset.\n"
                    "Example: python manage.py seed_ai_demo --reset --confirm"
                )
            self._reset()

        password = os.environ.get("DEMO_PASSWORD") or "Demo@AI2025"

        with transaction.atomic():
            users    = self._create_users(password)
            company  = self._create_company(users)
            team     = self._create_team(company, users)
            channels = self._create_channels(team, users)
            self._create_messages(channels, users)
            projects = self._create_projects(team, users)
            self._create_tasks(projects, users)
            self._create_meetings(team, users)
            self._seed_ai_layer(company, users)

        self._print_summary(password)

    # ── Reset ──────────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.companies.models import Company
        self.stdout.write(self.style.WARNING("Resetting Spectra AI demo data..."))
        emails = [u[1] for u in USERS]
        d_co, _    = Company.objects.filter(slug=COMPANY_SLUG).delete()
        d_usr, _   = User.objects.filter(email__in=emails).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Reset complete: {d_co} companies, {d_usr} users removed."
        ))

    # ── Users ──────────────────────────────────────────────────────────────────

    def _create_users(self, password: str) -> dict[str, User]:
        users = {}
        for full_name, email, _role, _title in USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "is_active": True},
            )
            user.set_password(password)
            user.save(update_fields=["password"] if not created else None)
            self.stdout.write(f"  {'Created' if created else 'Updated'} user: {email}")
            users[email] = user
        return users

    # ── Company ────────────────────────────────────────────────────────────────

    def _create_company(self, users: dict) -> "Company":
        from apps.companies.models import Company, CompanyMember

        alex     = users["alex.chen@spectra-ai-demo.internal"]
        role_map = {email: role for _, email, role, _ in USERS}

        company, created = Company.objects.get_or_create(
            slug=COMPANY_SLUG,
            defaults={
                "name":                     COMPANY_NAME,
                "website":                  "https://spectra-ai-demo.internal",
                "industry":                 "technology",
                "size":                     "11-50",
                "country":                  "United Kingdom",
                "ceo":                      alex,
                "created_by":               alex,
                "onboarding_status":        "active",
                "onboarding_completed_at":  timezone.now(),
                "email_domain":             EMAIL_DOMAIN,
                "email_domain_verified":    False,
                "notes":                    f"{DEMO_MARKER} Spectra AI demo — safe to delete",
                "settings_json": {
                    "ai_enabled":          True,
                    "notifications_enabled": True,
                    "allowed_plan":        "ai",
                    "max_members":         None,
                },
            },
        )
        if not created:
            self.stdout.write("  Company already exists — updating members.")

        for email, user in users.items():
            CompanyMember.objects.get_or_create(
                company=company, user=user,
                defaults={"role": role_map.get(email, "member"), "invited_by": alex},
            )

        self.stdout.write(self.style.SUCCESS(f"  Company '{COMPANY_NAME}' ready."))
        return company

    # ── Team ───────────────────────────────────────────────────────────────────

    def _create_team(self, company: "Company", users: dict) -> "Team":
        from apps.teams.models import Team, TeamMember

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        role_map = {email: role for _, email, role, _ in USERS}

        team, _ = Team.objects.get_or_create(
            name="Spectra AI Labs",
            defaults={
                "created_by": alex,
                "company":    company,
                "plan":       "ai",
                "ai_enabled": True,
            },
        )
        if team.company_id != company.id:
            team.company = company
            team.save()

        ROLE_MAP = {
            "ceo":     "ceo",
            "admin":   "admin",
            "manager": "manager",
            "member":  "member",
            "viewer":  "viewer",
        }
        for email, user in users.items():
            role = ROLE_MAP.get(role_map.get(email, "member"), "member")
            TeamMember.objects.get_or_create(
                team=team, user=user,
                defaults={"role": role, "invited_by": alex},
            )

        self.stdout.write("  Team: Spectra AI Labs")
        return team

    # ── Channels ───────────────────────────────────────────────────────────────

    def _create_channels(self, team, users: dict) -> dict:
        from apps.messaging.models import Channel, ChannelMember

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        all_u = list(users.values())

        specs = [
            ("general",        "General",         "Company-wide updates and announcements.", False, all_u),
            ("ml-platform",    "ML Platform",     "ML platform engineering discussions.",    False, all_u[:-1]),
            ("data-science",   "Data Science",    "DS experiments, model evals, research.",  False, all_u[:-1]),
            ("incidents",      "Incidents",       "Production incidents and postmortems.",   False, all_u[:-1]),
            ("leadership",     "Leadership",      "CEO and management channel.",             True,
             [users["alex.chen@spectra-ai-demo.internal"],
              users["priya.kapoor@spectra-ai-demo.internal"],
              users["james.osei@spectra-ai-demo.internal"]]),
        ]

        channels = {}
        for name, display, desc, private, members in specs:
            ch, _ = Channel.objects.get_or_create(
                team=team, name=name,
                defaults={
                    "display_name": display,
                    "description":  desc,
                    "is_private":   private,
                    "created_by":   alex,
                },
            )
            for u in members:
                ChannelMember.objects.get_or_create(channel=ch, user=u)
            channels[name] = ch

        self.stdout.write("  Channels created.")
        return channels

    # ── Messages ───────────────────────────────────────────────────────────────

    def _create_messages(self, channels: dict, users: dict) -> None:
        from apps.messaging.models import Message

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        priya = users["priya.kapoor@spectra-ai-demo.internal"]
        james = users["james.osei@spectra-ai-demo.internal"]
        sofia = users["sofia.martinez@spectra-ai-demo.internal"]
        liam  = users["liam.park@spectra-ai-demo.internal"]
        nadia = users["nadia.hassan@spectra-ai-demo.internal"]

        msg_specs = {
            "general": [
                (alex,  "Welcome to Spectra AI Labs on FlowTeam! All AI features are live — try the Daily Briefing on your dashboard."),
                (priya, "Engineering update: RAG Pipeline v2 sprint starts Monday. James has the capacity plan ready."),
                (james, "Sprint 7 goal: ship hybrid retrieval with cross-encoder reranking. Target 15% faithfulness improvement over v1."),
                (sofia, "Ran RAGAS eval on the new retrieval stack — faithfulness at 0.89, up from 0.61. Sharing full report in #data-science."),
                (liam,  "API latency on the embedding service is back to baseline. The connection pool fix worked."),
                (alex,  "Great week everyone. On track for the Series A demo next Thursday. Keep pushing."),
            ],
            "ml-platform": [
                (james, "Platform sprint priorities: (1) vector store migration to ChromaDB, (2) BM25 index rebuild, (3) reranker endpoint."),
                (sofia, "ChromaDB migration complete for dev. 2.3M embeddings transferred, p99 query latency 38ms. Staging next."),
                (liam,  "BM25 index rebuild done. Indexed 480k documents in 4.2 minutes using parallel workers."),
                (james, "Reranker endpoint is the current blocker — cross-encoder model serving needs GPU quota increase. Raised with infra."),
                (priya, "GPU quota approved. 2× A100 instances available from Tuesday. Unblock the reranker."),
                (sofia, "Hybrid retrieval A/B test design ready for review in the RAG Pipeline project."),
            ],
            "data-science": [
                (nadia, "RAGAS evaluation framework integrated into CI. Every retrieval PR now runs automated faithfulness + relevance checks."),
                (nadia, "Experiment EXP-041: cross-encoder reranking — preliminary results show +28% MRR on enterprise queries. Full report attached."),
                (sofia, "Anomaly detection baseline complete. Isolation Forest at 91.4% precision on validation set. Starting Z-score ensemble next."),
                (james, "For the ML Platform experiment summary feature — can you tag experiments with the `experiment` issue type? That's what triggers it."),
                (nadia, "All active experiments now tagged correctly. The AI experiment summary should work on EXP-041 and EXP-042."),
                (alex,  "Nadia — can you prepare a model card for EXP-041 before the Series A demo? Investors will want to see the evaluation methodology."),
            ],
            "incidents": [
                (liam,  "[INC-001] Embedding service OOM at 14:32 — restarted. Root cause: batch size not capped on large document uploads."),
                (sofia, "Temp fix: capped batch size to 512 tokens. Proper fix: streaming chunker in ML Platform sprint backlog."),
                (liam,  "[INC-001 RESOLVED] Service stable 20min post-restart. Monitoring in place. PIR scheduled for Friday."),
                (priya, "Post-incident: add memory limit to embedding service k8s pod spec. Liam please create the task."),
                (liam,  "Task created: 'Embedding service: add memory limit (OOM prevention)' — In Progress sprint."),
            ],
            "leadership": [
                (alex,  "Series A update: lead investor wants to see AI feature depth. James — run the full AI demo on Thursday."),
                (priya, "AI dashboard shows 247 credits used this week across all features. Health scores and briefings are the highest volume."),
                (james, "I'll walk through: daily briefing → project health (RAG project is At Risk) → workload balance → portfolio summary."),
                (alex,  "Perfect. Make sure the At Risk project is visible — it shows the AI is giving real signal, not just green lights."),
            ],
        }

        for ch_name, msgs in msg_specs.items():
            ch = channels.get(ch_name)
            if not ch:
                continue
            if ch.messages.exists():
                continue
            for i, (sender, text) in enumerate(msgs):
                Message.objects.create(
                    channel=ch,
                    sender=sender,
                    text=text,
                    client_id=f"seed-ai-demo-{ch_name}-{i}",
                )

        self.stdout.write("  Messages seeded.")

    # ── Projects ───────────────────────────────────────────────────────────────

    def _create_projects(self, team, users: dict) -> dict:
        from apps.projects.models import Project, Column, Label, Sprint, Milestone

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        james = users["james.osei@spectra-ai-demo.internal"]
        today = datetime.date.today()

        project_specs = [
            {
                "name":        "ML Platform Core",
                "description": "Core infrastructure: vector store, embedding service, hybrid retrieval, and model serving endpoints.",
                "color":       "#6366f1",
                "icon":        "🧠",
                "created_by":  james,
                "columns": [
                    ("Backlog",     "#94a3b8", False, 0),
                    ("In Progress", "#3b82f6", False, 1),
                    ("In Review",   "#f59e0b", False, 2),
                    ("Done",        "#22c55e", True,  3),
                ],
                "labels": [
                    ("infrastructure", "#6366f1"),
                    ("performance",    "#f59e0b"),
                    ("security",       "#ef4444"),
                    ("ml",             "#10b981"),
                ],
                "sprint": {
                    "name":           "Sprint 7 — Hybrid Retrieval",
                    "goal":           "Ship hybrid BM25 + vector retrieval with cross-encoder reranking",
                    "start_offset":   -7,
                    "end_offset":     7,
                    "capacity_hours": 120,
                },
                "milestone": {
                    "name":       "v2.0 Platform Launch",
                    "description": "Full hybrid retrieval stack live in production.",
                    "due_offset": 21,
                },
            },
            {
                "name":        "RAG Pipeline v2",
                "description": "Hybrid search (BM25 + vector) + cross-encoder reranking. Target: 90% RAGAS faithfulness score.",
                "color":       "#f59e0b",
                "icon":        "🔍",
                "created_by":  james,
                "columns": [
                    ("Backlog",     "#94a3b8", False, 0),
                    ("In Progress", "#3b82f6", False, 1),
                    ("Blocked",     "#ef4444", False, 2),
                    ("Done",        "#22c55e", True,  3),
                ],
                "labels": [
                    ("retrieval",  "#6366f1"),
                    ("evaluation", "#10b981"),
                    ("blocker",    "#ef4444"),
                    ("urgent",     "#f43f5e"),
                ],
                "sprint": {
                    "name":           "Sprint 3 — Reranker Integration",
                    "goal":           "Integrate cross-encoder reranker and hit 0.88 faithfulness on RAGAS eval suite",
                    "start_offset":   -14,
                    "end_offset":     -1,
                    "capacity_hours": 80,
                },
                "milestone": {
                    "name":       "90% Faithfulness Target",
                    "description": "RAGAS faithfulness >= 0.90 on production query set.",
                    "due_offset": 14,
                },
            },
            {
                "name":        "Anomaly Detection Engine",
                "description": "Real-time fraud and anomaly detection using Isolation Forest + Z-score ensemble, served via Kafka streaming.",
                "color":       "#ef4444",
                "icon":        "🚨",
                "created_by":  james,
                "columns": [
                    ("Backlog",     "#94a3b8", False, 0),
                    ("In Progress", "#3b82f6", False, 1),
                    ("In Review",   "#f59e0b", False, 2),
                    ("Done",        "#22c55e", True,  3),
                ],
                "labels": [
                    ("streaming",  "#6366f1"),
                    ("ml",         "#10b981"),
                    ("experiment", "#8b5cf6"),
                    ("kafka",      "#f59e0b"),
                ],
                "sprint": {
                    "name":           "Sprint 5 — Kafka Integration",
                    "goal":           "Live Kafka stream ingestion with sub-200ms p99 anomaly scoring",
                    "start_offset":   -5,
                    "end_offset":     9,
                    "capacity_hours": 100,
                },
                "milestone": {
                    "name":       "Production Go-Live",
                    "description": "Anomaly detection engine live in production with < 200ms p99.",
                    "due_offset": 30,
                },
            },
            {
                "name":        "Client Dashboard",
                "description": "Analytics dashboard for enterprise clients — real-time metrics, AI-generated summaries, and export capabilities.",
                "color":       "#10b981",
                "icon":        "📊",
                "created_by":  alex,
                "columns": [
                    ("Backlog",     "#94a3b8", False, 0),
                    ("In Progress", "#3b82f6", False, 1),
                    ("In Review",   "#f59e0b", False, 2),
                    ("Done",        "#22c55e", True,  3),
                ],
                "labels": [
                    ("frontend",  "#6366f1"),
                    ("api",       "#10b981"),
                    ("design",    "#ec4899"),
                    ("client",    "#f59e0b"),
                ],
                "sprint": {
                    "name":           "Sprint 2 — Core Metrics",
                    "goal":           "Ship core metrics views and AI summary panel for 3 enterprise pilots",
                    "start_offset":   -3,
                    "end_offset":     11,
                    "capacity_hours": 64,
                },
                "milestone": {
                    "name":       "Enterprise Pilot Launch",
                    "description": "Live for 3 enterprise pilot customers.",
                    "due_offset": 35,
                },
            },
        ]

        projects = {}
        for spec in project_specs:
            proj, _ = Project.objects.get_or_create(
                name=spec["name"], team=team,
                defaults={
                    "description": spec["description"],
                    "color":       spec["color"],
                    "icon":        spec["icon"],
                    "created_by":  spec["created_by"],
                    "status":      "active",
                },
            )

            columns = {}
            for col_name, col_color, is_done, order in spec["columns"]:
                col, _ = Column.objects.get_or_create(
                    project=proj, name=col_name,
                    defaults={"order": order, "color": col_color, "is_done_column": is_done},
                )
                columns[col_name] = col

            labels = {}
            for lbl_name, lbl_color in spec["labels"]:
                lbl, _ = Label.objects.get_or_create(
                    project=proj, name=lbl_name,
                    defaults={"color": lbl_color},
                )
                labels[lbl_name] = lbl

            sp = spec["sprint"]
            sprint, _ = Sprint.objects.get_or_create(
                project=proj, name=sp["name"],
                defaults={
                    "goal":           sp["goal"],
                    "start_date":     today + datetime.timedelta(days=sp["start_offset"]),
                    "end_date":       today + datetime.timedelta(days=sp["end_offset"]),
                    "capacity_hours": sp["capacity_hours"],
                    "status":         "active",
                    "created_by":     james,
                },
            )

            ms = spec["milestone"]
            Milestone.objects.get_or_create(
                project=proj, name=ms["name"],
                defaults={
                    "description": ms["description"],
                    "due_date":    today + datetime.timedelta(days=ms["due_offset"]),
                    "status":      "planned",
                    "created_by":  spec["created_by"],
                },
            )

            projects[spec["name"]] = {"project": proj, "columns": columns, "labels": labels, "sprint": sprint}
            self.stdout.write(f"  Project: {spec['name']}")

        return projects

    # ── Tasks ──────────────────────────────────────────────────────────────────

    def _create_tasks(self, projects: dict, users: dict) -> None:
        from apps.projects.models import Task

        james = users["james.osei@spectra-ai-demo.internal"]
        sofia = users["sofia.martinez@spectra-ai-demo.internal"]
        liam  = users["liam.park@spectra-ai-demo.internal"]
        nadia = users["nadia.hassan@spectra-ai-demo.internal"]
        priya = users["priya.kapoor@spectra-ai-demo.internal"]
        today = datetime.date.today()

        # (title, col, assignee, priority, issue_type, due_offset, in_sprint, labels, description)
        task_specs = {
            "ML Platform Core": [
                ("Migrate vector store to ChromaDB",
                 "Done", sofia, "high", "task", -2, False, ["infrastructure", "ml"],
                 "Migrate 2.3M embeddings from Pinecone to ChromaDB. Validate p99 query latency < 40ms."),
                ("Rebuild BM25 index with updated corpus",
                 "Done", liam, "normal", "task", -1, False, ["infrastructure"],
                 "Full rebuild after corpus update. 480k documents, parallel workers, target < 5min build time."),
                ("Cross-encoder reranker serving endpoint",
                 "In Progress", sofia, "urgent", "task", 3, True, ["ml", "performance"],
                 "Serve cross-encoder model via FastAPI. GPU quota now approved — A100 available Tuesday."),
                ("Embedding service: add memory limit (OOM prevention)",
                 "In Progress", liam, "high", "task", 4, True, ["infrastructure", "security"],
                 "Add k8s memory limit to embedding pod spec. Caused INC-001. Cap at 8Gi."),
                ("Streaming chunker for large document uploads",
                 "In Progress", liam, "normal", "task", 6, True, ["infrastructure"],
                 "Current batch upload causes OOM on docs > 50 pages. Implement streaming chunker."),
                ("A/B test framework for retrieval variants",
                 "Backlog", sofia, "normal", "story", 10, False, ["ml", "performance"],
                 "Infrastructure to route N% of queries to new retrieval variant and compare RAGAS metrics."),
                ("Reranker latency profiling and optimisation",
                 "Backlog", sofia, "normal", "task", 12, False, ["performance"],
                 "Profile cross-encoder latency per query. Target: p99 < 80ms before production rollout."),
            ],
            "RAG Pipeline v2": [
                ("Implement hybrid retrieval (BM25 + vector fusion)",
                 "Done", sofia, "high", "story", -5, False, ["retrieval"],
                 "Reciprocal rank fusion of BM25 and dense vector scores. Baseline RAGAS improvement +18%."),
                ("RAGAS evaluation suite — 200 enterprise queries",
                 "Done", nadia, "high", "task", -3, False, ["evaluation"],
                 "200-query golden set from enterprise customer support logs. Automated nightly eval run."),
                ("Cross-encoder reranking integration",
                 "Blocked", sofia, "urgent", "task", -1, True, ["retrieval", "blocker", "urgent"],
                 "Blocked on GPU quota for reranker serving endpoint. Escalated to Priya. ETA: Tuesday."),
                ("Faithfulness regression test in CI",
                 "Blocked", nadia, "high", "task", -2, True, ["evaluation", "blocker"],
                 "Waiting on reranker endpoint before CI eval can run the full hybrid pipeline."),
                ("Context window optimisation — chunk sizing",
                 "Backlog", nadia, "normal", "task", 5, False, ["retrieval"],
                 "Experiment with 256, 512, and 1024 token chunk sizes. Measure context precision per size."),
                ("Production rollout plan — hybrid retrieval",
                 "Backlog", james, "normal", "task", 8, False, ["retrieval"],
                 "Traffic split plan: 10% → 25% → 50% → 100%. Rollback criteria: faithfulness < 0.80."),
            ],
            "Anomaly Detection Engine": [
                ("Isolation Forest baseline — validation set",
                 "Done", nadia, "high", "experiment", -8, False, ["ml", "experiment"],
                 "Baseline Isolation Forest on 500k transaction records. Precision: 91.4%, Recall: 87.2%. "
                 "Hypothesis: contamination=0.01 optimal for our fraud rate. CONFIRMED."),
                ("Z-score filter as pre-model gate",
                 "Done", nadia, "normal", "experiment", -4, False, ["ml", "experiment"],
                 "Z-score 3σ filter before Isolation Forest reduces inference cost 34% with <0.5% precision loss. "
                 "Hypothesis: fast pre-filter reduces compute without meaningful quality regression. CONFIRMED."),
                ("Kafka stream ingestion — partition design",
                 "In Progress", liam, "urgent", "task", 4, True, ["kafka", "streaming"],
                 "Design topic partitioning per source (card, device, behaviour). Target: 50k events/sec throughput."),
                ("Feature store integration for low-latency serving",
                 "In Progress", sofia, "high", "task", 6, True, ["ml", "streaming"],
                 "Integrate Feast feature store for sub-10ms feature retrieval during Kafka stream inference."),
                ("Ensemble model: Isolation Forest + Z-score",
                 "In Review", nadia, "high", "experiment", 2, True, ["ml", "experiment"],
                 "Ensemble combining IF score and Z-score anomaly flag. Preliminary: precision 94.1%, recall 89.8%. "
                 "Hypothesis: ensemble beats individual models on precision while maintaining recall. VALIDATING."),
                ("Production monitoring — Grafana dashboard",
                 "Backlog", liam, "normal", "task", 14, False, ["streaming"],
                 "Anomaly rate, false positive rate, p99 latency, Kafka consumer lag — all visible in Grafana."),
            ],
            "Client Dashboard": [
                ("Core metrics API — 7 KPIs",
                 "Done", liam, "high", "task", -4, False, ["api"],
                 "REST endpoints for: daily active users, query volume, avg response time, accuracy score, cost/query."),
                ("Dashboard layout and chart components",
                 "Done", liam, "normal", "task", -2, False, ["frontend", "design"],
                 "Line charts, bar charts, and KPI cards using Recharts. Mobile responsive."),
                ("AI summary panel — weekly digest",
                 "In Progress", liam, "high", "task", 5, True, ["frontend", "api"],
                 "Panel that hits /ai/weekly-report/ and renders the AI-generated summary. Refresh button."),
                ("Client report export (PDF + CSV)",
                 "In Progress", liam, "normal", "task", 7, True, ["client", "api"],
                 "Export dashboard data as PDF (AI narrative) and CSV (raw metrics). Client-facing."),
                ("Pilot customer onboarding — Acme Corp",
                 "Backlog", priya, "high", "task", 11, False, ["client"],
                 "Onboard first enterprise pilot. Provision credentials, configure data source, run acceptance test."),
                ("Usage-based billing integration",
                 "Backlog", liam, "normal", "task", 20, False, ["api"],
                 "Track per-client query volume and feed into Stripe metered billing. Plan: 1000 free, then £0.002/query."),
            ],
        }

        for proj_name, tasks in task_specs.items():
            if proj_name not in projects:
                continue
            pd     = projects[proj_name]
            proj   = pd["project"]
            cols   = pd["columns"]
            lbls   = pd["labels"]
            sprint = pd["sprint"]

            for (title, col_name, assignee, priority, itype, due_off, in_sprint, lbl_names, desc) in tasks:
                col = cols.get(col_name) or list(cols.values())[0]
                task, created = Task.objects.get_or_create(
                    project=proj, title=title,
                    defaults={
                        "description":     desc,
                        "column":          col,
                        "assignee":        assignee,
                        "reporter":        james,
                        "priority":        priority,
                        "issue_type":      itype,
                        "due_date":        today + datetime.timedelta(days=due_off),
                        "sprint":          sprint if in_sprint else None,
                        "estimated_hours": random.choice([4, 6, 8, 12, 16]),
                    },
                )
                if created:
                    task.assignees.add(assignee)
                    for lbl_name in lbl_names:
                        lbl = lbls.get(lbl_name)
                        if lbl:
                            task.labels.add(lbl)

        self.stdout.write("  Tasks seeded.")

    # ── Meetings ───────────────────────────────────────────────────────────────

    def _create_meetings(self, team, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember
        from apps.meetings.models import Meeting

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        priya = users["priya.kapoor@spectra-ai-demo.internal"]
        james = users["james.osei@spectra-ai-demo.internal"]
        sofia = users["sofia.martinez@spectra-ai-demo.internal"]
        liam  = users["liam.park@spectra-ai-demo.internal"]
        nadia = users["nadia.hassan@spectra-ai-demo.internal"]
        now   = timezone.now()

        meeting_specs = [
            ("Sprint 7 Planning — ML Platform",
             "Plan sprint 7: hybrid retrieval scope, capacity, and risk review. AI sprint planner will suggest task assignment.",
             "video", 1, 10, 60, james,
             [alex, priya, james, sofia, liam],
             "Sprint planning transcript: capacity discussed, reranker blocker identified, GPU escalation approved."),
            ("RAG Pipeline — Reranker Unblock Session",
             "Unblock cross-encoder reranker integration. Review GPU quota status and update sprint plan.",
             "video", 0, 14, 30, james,
             [james, sofia, nadia],
             "Reranker endpoint blocker resolved. GPU quota approved. Sofia to deploy by Tuesday."),
            ("AI Demo — Series A Investor Presentation",
             "Live demo of FlowTeam AI features for Series A lead investor. Walk through briefing, health score, workload balance, portfolio summary.",
             "video", 3, 10, 45, alex,
             [alex, priya, james],
             None),
            ("Weekly Engineering Sync",
             "Weekly eng sync: sprint progress, incidents, tech debt, and upcoming milestones.",
             "audio", 2, 9, 30, priya,
             [priya, james, sofia, liam, nadia],
             None),
            ("Data Science — Experiment Review",
             "Review EXP-041 (cross-encoder) and EXP-042 (ensemble) results. Decide on production promotion.",
             "video", 4, 11, 45, james,
             [james, sofia, nadia],
             "EXP-041 promoted to production candidate. EXP-042 needs one more validation run."),
        ]

        for (title, desc, call_type, d_days, d_hour, duration, creator, attendees, transcript) in meeting_specs:
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
                team=team, name=channel_name,
                defaults={
                    "display_name": title,
                    "description":  f"Meeting channel: {title}",
                    "is_private":   False,
                    "created_by":   creator,
                },
            )
            for member in set(attendees):
                ChannelMember.objects.get_or_create(channel=channel, user=member)

            starts_at = now.replace(hour=d_hour, minute=0, second=0, microsecond=0) + datetime.timedelta(days=d_days)
            meeting = Meeting.objects.create(
                team=team,
                title=title,
                description=desc,
                call_type=call_type,
                starts_at=starts_at,
                duration_minutes=duration,
                status=Meeting.STATUS_SCHEDULED,
                is_instant=False,
                created_by=creator,
                channel=channel,
            )
            meeting.attendees.set(attendees)

        self.stdout.write("  Meetings seeded.")

    # ── AI Layer ───────────────────────────────────────────────────────────────

    def _seed_ai_layer(self, company, users: dict) -> None:
        from apps.ai.models import (
            AIFeaturePolicy, AILog, CompanyAIAccess, CompanyAICredits, DailyAIBudget,
        )

        alex  = users["alex.chen@spectra-ai-demo.internal"]
        priya = users["priya.kapoor@spectra-ai-demo.internal"]
        james = users["james.osei@spectra-ai-demo.internal"]
        sofia = users["sofia.martinez@spectra-ai-demo.internal"]
        liam  = users["liam.park@spectra-ai-demo.internal"]
        nadia = users["nadia.hassan@spectra-ai-demo.internal"]
        today = datetime.date.today()

        # 1. AI Access — platform-managed (no real key needed for demo)
        CompanyAIAccess.objects.get_or_create(
            company=company,
            defaults={
                "integration_mode": CompanyAIAccess.MODE_PLATFORM,
                "is_active":        True,
            },
        )

        # 2. AI Credits — 1,000 allocated, 247 used
        credits, _ = CompanyAICredits.objects.get_or_create(
            company=company,
            defaults={
                "total_allocated":          decimal.Decimal("1000.00"),
                "credits_used":             decimal.Decimal("247.35"),
                "alert_threshold_percentage": 80,
                "alert_triggered":          False,
                "last_replenished_at":      timezone.now() - datetime.timedelta(days=30),
            },
        )

        # 3. AI Feature Policy — all 21 features enabled, mixed tiers
        policy, _ = AIFeaturePolicy.objects.get_or_create(
            company=company,
            defaults={
                "ai_globally_enabled":          True,
                "feat_daily_briefing":          True,
                "feat_focus_recommend":         True,
                "feat_task_description":        True,
                "feat_task_summarize":          True,
                "feat_auto_label":              True,
                "feat_thread_reply_draft":      True,
                "feat_sprint_plan":             True,
                "feat_workload_balance":        True,
                "feat_retrospective":           True,
                "feat_project_health":          True,
                "feat_blocker_detect":          True,
                "feat_escalation_scan":         True,
                "feat_weekly_report":           True,
                "feat_channel_summary":         True,
                "feat_meeting_action_items":    True,
                "feat_client_report":           True,
                "feat_build_automation":        True,
                "feat_portfolio_summary":       True,
                "feat_generate_tasks":          True,
                "feat_experiment_summary":      True,
                "tier_individual":              AIFeaturePolicy.TIER_STANDARD,
                "tier_manager":                 AIFeaturePolicy.TIER_STANDARD,
                "tier_leadership":              AIFeaturePolicy.TIER_PREMIUM,
                "tier_ds":                      AIFeaturePolicy.TIER_STANDARD,
                "require_confirm_task_create":  True,
                "require_confirm_bulk_label":   True,
                "require_confirm_client_report": True,
                "allow_message_content":        True,
                "allow_document_content":       False,
                "allow_meeting_transcripts":    True,
                "log_retention_days":           90,
            },
        )

        # 4. AI Logs — 30 realistic entries showing feature usage, costs, and one blocked call
        if not AILog.objects.filter(company=company).exists():
            log_specs = [
                # (user, feature, provider, model, p_tok, c_tok, cost_usd, credits, latency_ms, status, trigger, rating, block_reason)
                (james, "daily_briefing",       "anthropic", "claude-sonnet-4-6", 420, 310, "0.001860", "0.19", 1240, "success", "scheduled",   5, ""),
                (sofia, "daily_briefing",       "anthropic", "claude-sonnet-4-6", 390, 290, "0.001710", "0.17", 1180, "success", "scheduled",   4, ""),
                (nadia, "daily_briefing",       "anthropic", "claude-sonnet-4-6", 410, 305, "0.001815", "0.18", 1210, "success", "scheduled",   5, ""),
                (liam,  "daily_briefing",       "anthropic", "claude-sonnet-4-6", 370, 280, "0.001650", "0.17", 1090, "success", "scheduled",   4, ""),
                (james, "focus_recommend",      "anthropic", "claude-sonnet-4-6", 580, 420, "0.002640", "0.26", 1650, "success", "user_action", 5, ""),
                (sofia, "focus_recommend",      "anthropic", "claude-sonnet-4-6", 540, 390, "0.002430", "0.24", 1520, "success", "user_action", 4, ""),
                (james, "project_health_score", "anthropic", "claude-sonnet-4-6", 620, 480, "0.003000", "0.30", 1890, "success", "scheduled",   4, ""),
                (james, "project_health_score", "anthropic", "claude-sonnet-4-6", 590, 450, "0.002820", "0.28", 1750, "success", "scheduled",   5, ""),
                (james, "project_health_score", "anthropic", "claude-sonnet-4-6", 610, 460, "0.002910", "0.29", 1810, "success", "scheduled",   3, ""),
                (james, "project_health_score", "anthropic", "claude-sonnet-4-6", 580, 430, "0.002730", "0.27", 1680, "success", "scheduled",   5, ""),
                (james, "sprint_plan",          "anthropic", "claude-sonnet-4-6", 840, 620, "0.004440", "0.44", 2310, "success", "user_action", 5, ""),
                (james, "workload_balance",     "anthropic", "claude-sonnet-4-6", 780, 570, "0.004050", "0.41", 2180, "success", "user_action", 4, ""),
                (james, "retrospective",        "anthropic", "claude-sonnet-4-6", 920, 680, "0.004800", "0.48", 2650, "success", "user_action", 5, ""),
                (james, "blocker_detect",       "anthropic", "claude-sonnet-4-6", 690, 510, "0.003630", "0.36", 1980, "success", "user_action", 5, ""),
                (james, "escalation_scan",      "anthropic", "claude-sonnet-4-6", 710, 520, "0.003720", "0.37", 2040, "success", "user_action", 4, ""),
                (james, "weekly_report",        "anthropic", "claude-sonnet-4-6", 1100, 820, "0.005820", "0.58", 3120, "success", "user_action", 5, ""),
                (priya, "portfolio_summary",    "anthropic", "claude-sonnet-4-6", 1400, 950, "0.008400", "0.84", 3890, "success", "user_action", 5, ""),
                (alex,  "portfolio_summary",    "anthropic", "claude-sonnet-4-6", 1380, 940, "0.008280", "0.83", 3820, "success", "user_action", 5, ""),
                (sofia, "task_description",     "anthropic", "claude-sonnet-4-6", 380, 520, "0.002640", "0.26", 1420, "success", "user_action", 4, ""),
                (liam,  "task_description",     "anthropic", "claude-sonnet-4-6", 360, 490, "0.002490", "0.25", 1380, "success", "user_action", 4, ""),
                (nadia, "experiment_summary",   "anthropic", "claude-sonnet-4-6", 750, 580, "0.004290", "0.43", 2240, "success", "user_action", 5, ""),
                (nadia, "experiment_summary",   "anthropic", "claude-sonnet-4-6", 720, 550, "0.004050", "0.41", 2180, "success", "user_action", 4, ""),
                (sofia, "auto_label",           "anthropic", "claude-sonnet-4-6", 290, 210, "0.001290", "0.13", 980,  "success", "user_action", 4, ""),
                (james, "channel_summary",      "anthropic", "claude-sonnet-4-6", 860, 630, "0.004500", "0.45", 2390, "success", "user_action", 4, ""),
                (james, "meeting_action_items", "anthropic", "claude-sonnet-4-6", 1200, 840, "0.006600", "0.66", 3410, "success", "user_action", 5, ""),
                (priya, "generate_tasks",       "anthropic", "claude-sonnet-4-6", 480, 680, "0.003900", "0.39", 1820, "success", "user_action", 4, ""),
                # A failed call
                (liam,  "task_description",     "anthropic", "claude-sonnet-4-6", 320, 0,   "0.000000", "0.00", 30200, "failed",  "user_action", None, ""),
                # A blocked call (prompt injection attempt — demo shows guardrails working)
                (None,  "task_description",     "anthropic", "claude-sonnet-4-6", 0,   0,   "0.000000", "0.00", 4,     "blocked", "user_action", None, "prompt_injection"),
                # Two scheduled briefings
                (james, "daily_briefing",       "anthropic", "claude-sonnet-4-6", 440, 320, "0.001920", "0.19", 1290, "success", "scheduled",   5, ""),
                (sofia, "daily_briefing",       "anthropic", "claude-sonnet-4-6", 420, 308, "0.001854", "0.19", 1240, "success", "scheduled",   4, ""),
            ]

            now = timezone.now()
            for i, (user, feature, provider, model, p_tok, c_tok, cost, credits_d, latency, status, trigger, rating, block_r) in enumerate(log_specs):
                # Spread logs over the last 7 days
                created_at = now - datetime.timedelta(days=random.randint(0, 6), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                AILog.objects.create(
                    company=company,
                    user=user,
                    feature_name=feature,
                    integration_mode="platform_managed",
                    provider=provider,
                    model_name=model,
                    prompt_tokens=p_tok,
                    completion_tokens=c_tok,
                    cost_usd=decimal.Decimal(cost),
                    credits_deducted=decimal.Decimal(credits_d),
                    latency_ms=latency,
                    status=status,
                    triggered_by=trigger,
                    feedback_rating=rating,
                    block_reason=block_r,
                    output_warnings=[],
                    request_summary=f"Demo seed — {feature}",
                    response_preview="[Seeded demo response]",
                )

        # 5. DailyAIBudget — 7 days of realistic per-feature usage
        feature_daily_calls = {
            "daily_briefing":       (6, "0.55"),
            "focus_recommend":      (4, "0.40"),
            "project_health_score": (4, "0.42"),
            "sprint_plan":          (1, "0.44"),
            "workload_balance":     (1, "0.41"),
            "retrospective":        (1, "0.48"),
            "blocker_detect":       (2, "0.36"),
            "escalation_scan":      (2, "0.37"),
            "weekly_report":        (1, "0.58"),
            "portfolio_summary":    (2, "0.84"),
            "task_description":     (5, "0.26"),
            "experiment_summary":   (3, "0.43"),
            "auto_label":           (3, "0.13"),
            "channel_summary":      (1, "0.45"),
            "meeting_action_items": (1, "0.66"),
            "generate_tasks":       (1, "0.39"),
        }

        for day_offset in range(7):
            date = today - datetime.timedelta(days=day_offset)
            for feature, (base_calls, base_credits) in feature_daily_calls.items():
                calls   = max(1, base_calls + random.randint(-1, 1))
                credits_used = decimal.Decimal(base_credits) * calls
                DailyAIBudget.objects.update_or_create(
                    company=company, date=date, feature=feature,
                    defaults={"calls": calls, "credits_used": credits_used},
                )

        self.stdout.write("  AI layer seeded (access, credits, policy, logs, daily budgets).")

    # ── Summary ────────────────────────────────────────────────────────────────

    def _print_summary(self, password: str) -> None:
        w = self.stdout.write
        S = self.style.SUCCESS
        B = self.style.HTTP_INFO

        w("")
        w(S("=" * 72))
        w(S("  SPECTRA AI LABS — FLOWTEAM AI DEMO SEEDED"))
        w(S("=" * 72))
        w("")
        w(B("  DEMO CREDENTIALS (share these)"))
        w("  " + "─" * 68)
        w(f"  {'Role':<10} {'Name':<18} {'Email':<44} Password")
        w("  " + "─" * 68)
        for full_name, email, role, title in USERS:
            w(f"  {role:<10} {full_name:<18} {email:<44} {password}")
        w("")
        w(B("  WHAT WAS CREATED"))
        w("  " + "─" * 68)
        w("  Company     : Spectra AI Labs (AI plan, platform-managed credits)")
        w("  Team        : Spectra AI Labs (6 members, 1 viewer)")
        w("  Channels    : #general, #ml-platform, #data-science, #incidents, #leadership")
        w("  Messages    : 6 per channel — realistic ML team conversations")
        w("  Projects    : 4 (ML Platform Core, RAG Pipeline v2, Anomaly Detection, Client Dashboard)")
        w("  Sprints     : 1 active per project (4 total)")
        w("  Milestones  : 1 per project (4 total)")
        w("  Tasks       : 28 total — across all columns, with overdue and blocked tasks")
        w("  Meetings    : 5 (sprint planning, unblock session, investor demo, eng sync, DS review)")
        w("")
        w(B("  AI LAYER"))
        w("  " + "─" * 68)
        w("  Credits     : 1,000 allocated / 247 used / 753 remaining")
        w("  Features    : All 21 AI features enabled")
        w("  Tiers       : Individual=Standard, Manager=Standard, Leadership=Premium")
        w("  AI Logs     : 30 entries (28 success, 1 failed, 1 blocked by guardrails)")
        w("  Daily Budget: 7 days of per-feature usage data (16 features)")
        w("")
        w(B("  DEMO SCRIPT"))
        w("  " + "─" * 68)
        w("  1. Log in as James Osei (ML Platform Lead / Manager)")
        w("     → Dashboard: Daily Briefing card + Focus Recommend card")
        w("     → AI shows overdue tasks in RAG Pipeline (blocked reranker)")
        w("")
        w("  2. Open RAG Pipeline v2 project")
        w("     → GET /api/ai/health-score/ → score: ~35, label: At Risk")
        w("     → 2 tasks in Blocked column with overdue dates")
        w("     → POST /api/ai/blocker-detect/ → reranker as critical blocker")
        w("     → POST /api/ai/escalation_scan/ → blocked tasks flagged for escalation")
        w("")
        w("  3. Open ML Platform Core project (healthy)")
        w("     → GET /api/ai/health-score/ → score: ~82, label: Healthy")
        w("     → POST /api/ai/sprint-plan/ → AI suggests task assignment for Sprint 7")
        w("     → POST /api/ai/workload-balance/ → balanced across Sofia, Liam")
        w("     → POST /api/ai/retrospective/ → Sprint 6 retro (Done tasks as input)")
        w("")
        w("  4. Open Anomaly Detection Engine — experiment tasks")
        w("     → Click EXP-041 task (issue_type=experiment)")
        w("     → POST /api/ai/experiment-summary/ → status, metrics, hypothesis assessment")
        w("     → POST /api/ai/model-card-draft/ → Hugging Face-format model card")
        w("")
        w("  5. Switch to Alex Chen (CEO) for leadership view")
        w("     → POST /api/ai/portfolio-summary/ → all 4 projects rolled up")
        w("     → GET /api/ai/dashboard/ → 30 log entries, cost breakdown, 7-day chart")
        w("     → GET /api/ai/feature-policy/ → all 21 features visible")
        w("")
        w("  6. Open Settings → AI Usage Dashboard")
        w("     → AIUsageDashboard component — live credit balance, per-feature breakdown")
        w("     → Show blocked log entry (prompt injection attempt — guardrails demo)")
        w("     → Show failed log entry (timeout — shows observability)")
        w("")
        w("  7. Open #data-science channel")
        w("     → POST /api/ai/channel-summary/ → 48h conversation digest")
        w("     → POST /api/ai/thread-reply-draft/ → draft a reply to Nadia's eval report")
        w("")
        w("  TO RESET:")
        w("  python manage.py seed_ai_demo --reset --confirm")
        w(S("=" * 72))
        w("")
