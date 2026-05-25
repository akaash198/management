"""
seed_jpmorgan_demo — Creates a complete JPMorgan Chase & Co. demo on Cowrkflow
covering all four core divisions:

  - Investment Banking   (M&A deal teams, client coverage, pitch books)
  - Equities Research    (TMT, Healthcare, Energy, Financials analysts)
  - Asset Management     (fund managers, risk, compliance, client relations)
  - Technology           (platform engineering, security, product, DevOps)

Each division has:
  - A dedicated team with realistic JP Morgan roles
  - 4 channels with 8 seeded messages each
  - 6 scheduled meetings
  - 2 projects with columns, labels, sprint, milestone, and 4-5 tasks

Production-safe:
  - Demo emails use @jpmorgan-demo.internal — no real domain conflicts
  - email_domain_verified = False
  - All objects tagged with DEMO_MARKER for precise reset
  - --reset --confirm required for deletion

Usage:
    python manage.py seed_jpmorgan_demo
    python manage.py seed_jpmorgan_demo --reset --confirm
    DEMO_PASSWORD=JPMorgan@Demo25 python manage.py seed_jpmorgan_demo
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

DEMO_MARKER  = "[jpmorgan-demo]"
COMPANY_NAME = "JPMorgan Chase & Co. — Cowrkflow Demo"
COMPANY_SLUG = "jpmorgan-demo"
EMAIL_DOMAIN = "jpmorgan-demo.internal"

# ─── Users ──────────────────────────────────────────────────────────────────
# (full_name, email, company_role, division, title)
USERS = [
    # ── HQ / Firm-Wide
    ("Richard Hartley",    "richard.hartley@jpmorgan-demo.internal",    "ceo",     "HQ",          "Global Head of Markets Operations"),
    ("Caroline Webb",      "caroline.webb@jpmorgan-demo.internal",       "admin",   "HQ",          "Chief of Staff — Global Markets"),

    # ── Investment Banking
    ("James Thornton",     "james.thornton@jpmorgan-demo.internal",      "manager", "IB",          "Managing Director — M&A Coverage"),
    ("Natasha Reeves",     "natasha.reeves@jpmorgan-demo.internal",      "member",  "IB",          "Vice President — M&A Advisory"),
    ("William Chen",       "william.chen@jpmorgan-demo.internal",        "member",  "IB",          "Associate — M&A"),
    ("Priya Kapoor",       "priya.kapoor@jpmorgan-demo.internal",        "member",  "IB",          "Associate — ECM"),
    ("Tom Bradley",        "tom.bradley@jpmorgan-demo.internal",         "member",  "IB",          "Analyst — Investment Banking"),

    # ── Equities Research
    ("Dr. Alicia Fong",    "alicia.fong@jpmorgan-demo.internal",         "manager", "Research",    "Head of Equities Research — EMEA"),
    ("Marcus Webb",        "marcus.webb@jpmorgan-demo.internal",         "member",  "Research",    "Senior Analyst — TMT"),
    ("Sophia Okafor",      "sophia.okafor@jpmorgan-demo.internal",       "member",  "Research",    "Senior Analyst — Healthcare"),
    ("Daniel Price",       "daniel.price@jpmorgan-demo.internal",        "member",  "Research",    "Senior Analyst — Energy & Utilities"),
    ("Leila Mansouri",     "leila.mansouri@jpmorgan-demo.internal",      "member",  "Research",    "Analyst — Financials"),

    # ── Asset Management
    ("Oliver Grant",       "oliver.grant@jpmorgan-demo.internal",        "manager", "AM",          "Head of Asset Management — UK"),
    ("Charlotte Davies",   "charlotte.davies@jpmorgan-demo.internal",    "member",  "AM",          "Portfolio Manager — Global Equities"),
    ("Rajan Mehta",        "rajan.mehta@jpmorgan-demo.internal",         "member",  "AM",          "Risk Analyst — Multi-Asset"),
    ("Fiona Stewart",      "fiona.stewart@jpmorgan-demo.internal",       "member",  "AM",          "Compliance Officer — Investment Management"),
    ("Hugo Blanc",         "hugo.blanc@jpmorgan-demo.internal",          "member",  "AM",          "Client Relations — UHNW & Family Office"),

    # ── Technology & Engineering
    ("Aisha Rahman",       "aisha.rahman@jpmorgan-demo.internal",        "manager", "Tech",        "Chief Technology Officer — Markets Tech"),
    ("Ben Holloway",       "ben.holloway@jpmorgan-demo.internal",        "member",  "Tech",        "Platform Engineering Lead"),
    ("Mei Lin",            "mei.lin@jpmorgan-demo.internal",             "member",  "Tech",        "Security Engineer — Zero Trust"),
    ("Jake Osei",          "jake.osei@jpmorgan-demo.internal",           "member",  "Tech",        "Product Manager — Trading Platform"),
    ("Anya Kuznetsova",    "anya.kuznetsova@jpmorgan-demo.internal",     "member",  "Tech",        "DevOps Engineer — Cloud Infrastructure"),
]


class Command(BaseCommand):
    help = "Seed JPMorgan Chase & Co. demo — 4 divisions. Production-safe."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Delete existing JPMorgan demo data before re-seeding.")
        parser.add_argument("--confirm", action="store_true",
                            help="Required with --reset to prevent accidental deletion.")

    def handle(self, *args, **options):
        if options["reset"]:
            if not options["confirm"]:
                raise CommandError(
                    "Pass --confirm together with --reset.\n"
                    "Example: python manage.py seed_jpmorgan_demo --reset --confirm"
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

    # ─── Reset ─────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.companies.models import Company
        self.stdout.write(self.style.WARNING("Resetting JPMorgan demo data..."))
        emails = [u[1] for u in USERS]
        deleted_co, _    = Company.objects.filter(slug=COMPANY_SLUG).delete()
        deleted_users, _ = User.objects.filter(email__in=emails).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Reset complete: {deleted_co} companies, {deleted_users} users removed."
        ))

    # ─── Users ─────────────────────────────────────────────────────────────

    def _create_users(self, password: str) -> dict:
        users = {}
        for full_name, email, _role, _div, _title in USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "is_active": True},
            )
            user.set_password(password)
            user.save(update_fields=["password"] if not created else None)
            self.stdout.write(f"  {'Created' if created else 'Updated'} user: {email}")
            users[email] = user
        return users

    # ─── Company ───────────────────────────────────────────────────────────

    def _create_company(self, users: dict) -> "Company":
        from apps.companies.models import Company, CompanyMember

        richard  = users["richard.hartley@jpmorgan-demo.internal"]
        role_map = {email: role for _, email, role, _, _ in USERS}

        company, created = Company.objects.get_or_create(
            slug=COMPANY_SLUG,
            defaults={
                "name":                     COMPANY_NAME,
                "website":                  "https://www.jpmorgan.com",
                "industry":                 "financial_services",
                "size":                     "10000+",
                "country":                  "United Kingdom",
                "ceo":                      richard,
                "created_by":               richard,
                "onboarding_status":        "active",
                "onboarding_completed_at":  timezone.now(),
                "email_domain":             EMAIL_DOMAIN,
                "email_domain_verified":    False,
                "notes":                    f"{DEMO_MARKER} JPMorgan demo — safe to delete",
                "settings_json": {
                    "ai_enabled":           True,
                    "notifications_enabled": True,
                    "allowed_plan":         "ai",
                    "max_members":          None,
                },
            },
        )
        if not created:
            self.stdout.write("  Company already exists — updating members.")

        for email, user in users.items():
            CompanyMember.objects.get_or_create(
                company=company, user=user,
                defaults={"role": role_map.get(email, "member"), "invited_by": richard},
            )

        self.stdout.write(self.style.SUCCESS(f"  Company '{COMPANY_NAME}' ready."))
        return company

    # ─── Teams ─────────────────────────────────────────────────────────────

    def _create_teams(self, company: "Company", users: dict) -> dict:
        from apps.teams.models import Team, TeamMember

        richard  = users["richard.hartley@jpmorgan-demo.internal"]
        caroline = users["caroline.webb@jpmorgan-demo.internal"]

        division_specs = [
            {
                "div":          "IB",
                "name":         "Investment Banking",
                "manager_email": "james.thornton@jpmorgan-demo.internal",
                "member_emails": [
                    "natasha.reeves@jpmorgan-demo.internal",
                    "william.chen@jpmorgan-demo.internal",
                    "priya.kapoor@jpmorgan-demo.internal",
                    "tom.bradley@jpmorgan-demo.internal",
                ],
            },
            {
                "div":          "Research",
                "name":         "Equities Research",
                "manager_email": "alicia.fong@jpmorgan-demo.internal",
                "member_emails": [
                    "marcus.webb@jpmorgan-demo.internal",
                    "sophia.okafor@jpmorgan-demo.internal",
                    "daniel.price@jpmorgan-demo.internal",
                    "leila.mansouri@jpmorgan-demo.internal",
                ],
            },
            {
                "div":          "AM",
                "name":         "Asset Management",
                "manager_email": "oliver.grant@jpmorgan-demo.internal",
                "member_emails": [
                    "charlotte.davies@jpmorgan-demo.internal",
                    "rajan.mehta@jpmorgan-demo.internal",
                    "fiona.stewart@jpmorgan-demo.internal",
                    "hugo.blanc@jpmorgan-demo.internal",
                ],
            },
            {
                "div":          "Tech",
                "name":         "Technology & Engineering",
                "manager_email": "aisha.rahman@jpmorgan-demo.internal",
                "member_emails": [
                    "ben.holloway@jpmorgan-demo.internal",
                    "mei.lin@jpmorgan-demo.internal",
                    "jake.osei@jpmorgan-demo.internal",
                    "anya.kuznetsova@jpmorgan-demo.internal",
                ],
            },
        ]

        teams = {}
        for spec in division_specs:
            manager = users[spec["manager_email"]]
            team, _ = Team.objects.get_or_create(
                name=spec["name"],
                created_by=richard,
                defaults={"company": company, "plan": "ai", "ai_enabled": True},
            )
            if team.company_id != company.id:
                team.company = company
                team.save()

            for hq_user, hq_role in [(richard, "ceo"), (caroline, "admin")]:
                TeamMember.objects.get_or_create(
                    team=team, user=hq_user,
                    defaults={"role": hq_role, "invited_by": richard},
                )
            TeamMember.objects.get_or_create(
                team=team, user=manager,
                defaults={"role": "manager", "invited_by": richard},
            )
            for email in spec["member_emails"]:
                TeamMember.objects.get_or_create(
                    team=team, user=users[email],
                    defaults={"role": "member", "invited_by": manager},
                )

            teams[spec["div"]] = team
            self.stdout.write(f"  Team: {spec['name']}")

        return teams

    # ─── Channels & Messages ───────────────────────────────────────────────

    def _create_channels_and_messages(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember, Message

        richard  = users["richard.hartley@jpmorgan-demo.internal"]
        caroline = users["caroline.webb@jpmorgan-demo.internal"]

        # Shortcuts
        jt  = users["james.thornton@jpmorgan-demo.internal"]
        nr  = users["natasha.reeves@jpmorgan-demo.internal"]
        wc  = users["william.chen@jpmorgan-demo.internal"]
        pk  = users["priya.kapoor@jpmorgan-demo.internal"]
        tb  = users["tom.bradley@jpmorgan-demo.internal"]

        af  = users["alicia.fong@jpmorgan-demo.internal"]
        mw  = users["marcus.webb@jpmorgan-demo.internal"]
        so  = users["sophia.okafor@jpmorgan-demo.internal"]
        dp  = users["daniel.price@jpmorgan-demo.internal"]
        lm  = users["leila.mansouri@jpmorgan-demo.internal"]

        og  = users["oliver.grant@jpmorgan-demo.internal"]
        cd  = users["charlotte.davies@jpmorgan-demo.internal"]
        rm  = users["rajan.mehta@jpmorgan-demo.internal"]
        fs  = users["fiona.stewart@jpmorgan-demo.internal"]
        hb  = users["hugo.blanc@jpmorgan-demo.internal"]

        ar  = users["aisha.rahman@jpmorgan-demo.internal"]
        bh  = users["ben.holloway@jpmorgan-demo.internal"]
        ml  = users["mei.lin@jpmorgan-demo.internal"]
        jo  = users["jake.osei@jpmorgan-demo.internal"]
        ak  = users["anya.kuznetsova@jpmorgan-demo.internal"]

        all_ib       = [richard, caroline, jt, nr, wc, pk, tb]
        all_research = [richard, caroline, af, mw, so, dp, lm]
        all_am       = [richard, caroline, og, cd, rm, fs, hb]
        all_tech     = [richard, caroline, ar, bh, ml, jo, ak]

        channel_data = {
            "IB": [
                {
                    "name": "deal-flow", "display_name": "Deal Flow",
                    "description": "Live M&A pipeline updates, mandate tracking, and NDA counterparty activity.",
                    "is_private": False, "members": all_ib,
                    "messages": [
                        (jt,       "Team — Project Falcon (Horizon Pharma) has moved to exclusivity. DD teams confirmed: legal (Clifford Chance), financial (us), tax (KPMG). NDA countersigned. Kick-off Monday 09:00."),
                        (nr,       "Data room access granted. Working through the financial model — EBITDA margin assumptions look optimistic at 34%. Running our own build."),
                        (wc,       "Comparable transactions screened: Astra/AZ, Reckitt/Mead. Median EV/EBITDA 14.2×. Falcon's asking 16.5× on forward numbers. We'll need a strong synergy case."),
                        (jt,       "Separate thread for Falcon financials please. Here: Mandel Capital inbound — potential sell-side mandate on their UK logistics portfolio. £800M+ estimated. Call Friday 16:00."),
                        (pk,       "ECM pipeline: Greenwave IPO. Roadshow draft ready. Lead left bookrunner slot confirmed. Target filing in 6 weeks, pricing late Q3."),
                        (tb,       "Greenwave prospectus financial section first draft uploaded to SharePoint. Ready for VP review."),
                        (nr,       "Mandel call confirmed — prepped sector comps and a quick M&A market overview. Circulating deck tonight."),
                        (richard,  "Strong pipeline. Make sure conflicts cleared before Mandel engagement. Caroline will coordinate. Falcon is priority — every hour counts during exclusivity."),
                    ],
                },
                {
                    "name": "client-coverage", "display_name": "Client Coverage",
                    "description": "Relationship management updates, client meetings, and coverage priorities.",
                    "is_private": False, "members": all_ib,
                    "messages": [
                        (jt,       "Client review: Horizon Pharma CFO meeting went well. They want a 3-scenario valuation by Wednesday. Tom — can you lead the model with Natasha reviewing?"),
                        (tb,       "On it. Base / upside / downside built around 3 revenue growth assumptions. Will have a first cut by Tuesday close of business."),
                        (nr,       "Reminder: Mandel Capital relationship is sensitive — they've been burned by two banks on confidentiality. No emails, all calls logged."),
                        (pk,       "Greenwave CEO meeting scheduled for Thursday 14:00. They want a global investor appetite update. Pulling syndicate data now."),
                        (caroline, "Coverage calendar updated for Q2. 3 new targets added: Halo Diagnostics, BioArch, and RetailNet. Briefing packs circulated separately."),
                        (jt,       "Halo Diagnostics — early-stage conversation. Their CFO has a long relationship with Deutsche, so it's a rebuild. Quality over speed here."),
                        (wc,       "RetailNet situation: press rumours of a break-up. Worth calling their board advisor to understand the timeline before competitors do."),
                        (richard,  "Agree on RetailNet. James — take the call. If there's a live process, we want to be on the shortlist before the formal mandate hits the street."),
                    ],
                },
                {
                    "name": "pitch-book-reviews", "display_name": "Pitch Book Reviews",
                    "description": "Deck reviews, formatting standards, and presentation feedback.",
                    "is_private": False, "members": [jt, nr, wc, pk, tb],
                    "messages": [
                        (tb,       "Mandel Capital pitch deck v0.1 uploaded. Executive summary and M&A market slide done. Sector comp table placeholder — need to align on methodology before I populate."),
                        (nr,       "Methodology: use trailing 12-month EV/EBITDA and EV/Revenue. Exclude outlier transactions >3 years old. Let's keep it clean."),
                        (wc,       "Reviewed intro section. Slide 3 headline is too hedged — say 'JPMorgan has executed 12 comparable transactions in the past 24 months' not 'has been active.' Numbers build credibility."),
                        (tb,       "Updated. Slide 4 — should we lead with our logistics sector credentials or our UK M&A league table position?"),
                        (jt,       "Lead with the sector credentials. They're a logistics business — they need to feel we know their world. League tables come second."),
                        (pk,       "Greenwave IPO deck: roadshow story is strong but the ESG section feels thin. They'll get hammered by ESG-focused funds. Can we get more on their Scope 1/2 metrics?"),
                        (nr,       "Chased IR team — they have the GHG data but it's not audited. Recommend we note 'management estimate' and flag they're targeting third-party verification for the full prospectus."),
                        (jt,       "Good catch Priya. Tom — add a footnote on slide 18. Investors will probe. Better we acknowledge it upfront."),
                    ],
                },
                {
                    "name": "general", "display_name": "General",
                    "description": "General announcements and team updates for Investment Banking.",
                    "is_private": False, "members": all_ib,
                    "messages": [
                        (jt,       "Welcome to the IB Cowrkflow workspace. Using this for deal comms, coverage tracking, and pitch book coordination. Questions to me or Caroline."),
                        (caroline, "Team directories and coverage assignments uploaded to the Files tab. Please review and flag any errors by Friday."),
                        (nr,       "Reminder: all deal-related documents must go through Clifford Chance DMS for Project Falcon. No attachments here or on email."),
                        (tb,       "Q1 deal log submitted — 3 completed mandates, 2 live, 7 in pipeline. Sharing with compliance for their records."),
                        (pk,       "Market window update: IPO calendar is crowded in September. Greenwave timing still holds but we have less buffer. Flagging to the team."),
                        (wc,       "New hire starting Monday — Harry Lim, Analyst joining from Deutsche. James to do the desk intro Monday morning."),
                        (jt,       "Harry joining from Deutsche's healthcare team — good sector knowledge. He'll support Falcon and cover Halo Diagnostics. Tom, please share the deal onboarding checklist."),
                        (richard,  "Q1 fee revenue tracking ahead of target. Great work across the team. Focus now on converting Mandel and closing Greenwave on schedule."),
                    ],
                },
            ],

            "Research": [
                {
                    "name": "market-updates", "display_name": "Market Updates",
                    "description": "Pre-market updates, macro events, and intraday colour for the research team.",
                    "is_private": False, "members": all_research,
                    "messages": [
                        (af,       "Pre-open: FTSE futures +0.4%, driven by energy names following Saudi Aramco output comments. US CPI tomorrow — consensus 3.1% YoY. Watch rates impact on financials."),
                        (mw,       "TMT: NVIDIA after-hours +8% on data centre beat. ARM London ADR following. Semi-equipment names worth watching at open."),
                        (so,       "Healthcare: Pfizer down 4% pre-market — Phase 3 miss on obesity drug. Our Overweight on AstraZeneca looking even more differentiated. Note going out at 07:30."),
                        (dp,       "Energy: North Sea Brent +2.1% post-OPEC+ statement. Our Q3 Brent forecast £92/bbl on track. Shell upgrade to Overweight timing looks good — today?"),
                        (af,       "Daniel — yes, publish the Shell upgrade. Make sure distribution covers all institutional accounts before 08:00."),
                        (lm,       "Financials: Barclays trading update better than feared. Revenue beat vs consensus. I'll revise my model and push a brief note. NII guidance the key number to watch."),
                        (mw,       "TSMC capex guidance out — raising semi-equipment target prices. Note in review — circulating to the team before publication."),
                        (richard,  "Strong morning from the team. Sophia's AstraZeneca differentiated call is already getting traction from clients. Keep up the quality."),
                    ],
                },
                {
                    "name": "research-pipeline", "display_name": "Research Pipeline",
                    "description": "Publication schedule, model update tracker, and initiation planning.",
                    "is_private": False, "members": all_research,
                    "messages": [
                        (af,       "Publication schedule for this week: Monday — Shell upgrade (Daniel), Wednesday — Barclays note (Leila), Friday — UK Clean Energy initiation preview (Daniel + Marcus)."),
                        (dp,       "Shell upgrade published 08:02. Already 12 client calls inbound. IB flagged it links to a potential advisory mandate — keeping separate but flagged to compliance."),
                        (mw,       "UK Clean Energy initiation: 8 names screened, 4 initiating with coverage. Orsted, SSE, RWE, and National Grid. Target prices and ratings ready for peer review."),
                        (so,       "Q2 earnings season starts in 3 weeks. Proposing a healthcare coverage call this Thursday to align on expectations vs consensus. 14 names, ~2h."),
                        (lm,       "Barclays note in final edits. Key call: NII guidance conservative — upside risk if rates stay higher for longer. Publishing Wednesday 07:45."),
                        (af,       "Reminder: all notes with a rating change must go through compliance review 24h before publication. No exceptions after last quarter's timing issue."),
                        (dp,       "Noted. Shell note was pre-cleared — sent to compliance Sunday evening for Monday AM publication. Process working."),
                        (mw,       "Clean Energy initiation draft sent to Alicia for review. Seeking publication slot next Friday — enough time for the full peer review process."),
                    ],
                },
                {
                    "name": "model-reviews", "display_name": "Model Reviews",
                    "description": "Financial model peer reviews, assumption challenges, and version control.",
                    "is_private": False, "members": [af, mw, so, dp, lm],
                    "messages": [
                        (mw,       "SSE model v1.2 shared in Files. Key assumption: RPI-linked revenue growth at 5.8% through 2027. Pushback from Marcus — 4.5% is more realistic post-regulatory reset."),
                        (af,       "Agree with the conservative case. Run both scenarios. The bear case is what institutional clients will probe on — make it defensible."),
                        (dp,       "Shell model — new segment disclosure means I've had to rebuild the Integrated Gas contribution. FY24 EPS moving +6% vs prior. Will re-run consensus comparison tonight."),
                        (so,       "AstraZeneca model update: added Farxiga Phase 4 indication potential. Bull case DCF moves 14% on longer patent runway. Client question yesterday pushed me to model it out."),
                        (lm,       "Barclays model: revised NII trajectory — consensus is too pessimistic on rate sensitivity in the UK retail book. My 2025E NII is 8% above street. That's the differentiated call."),
                        (af,       "Leila — make sure the rate sensitivity table is the hero on page 2. That's what PMs will trade against. Make it scannable in 30 seconds."),
                        (mw,       "Clean Energy models: Orsted is the tricky one — Danish rate environment doesn't map cleanly to UK comps. Anyone modelled Orsted before?"),
                        (dp,       "I covered Orsted briefly in 2022. Happy to peer-review the WACC assumptions. Send me the model when ready."),
                    ],
                },
                {
                    "name": "general", "display_name": "General",
                    "description": "General announcements and admin for the Equities Research team.",
                    "is_private": False, "members": all_research,
                    "messages": [
                        (af,       "Welcome to Research on Cowrkflow. Using this for model reviews, publication coordination, and intraday market colour. Keep it focused — no client-facing content here."),
                        (caroline, "Compliance reminder: all research must go through the formal review workflow. No informal distribution of unpublished ratings or target prices — including here."),
                        (so,       "AstraZeneca Overweight has been our top-performing call this quarter — +22% vs FTSE 100 +8%. Client feedback has been very positive. Thanks to the team for the model support."),
                        (mw,       "Bloomberg terminal upgrade scheduled for next Tuesday. Backup access via the research portal — instructions shared by IT."),
                        (dp,       "Energy sector trip to Aberdeen in 3 weeks — visiting 2 operators and 1 services company. Notes will be shared under the usual embargo protocol."),
                        (lm,       "New coverage universe tool rolled out — easier to track consensus vs our estimates across all 40 names. Link in Files."),
                        (af,       "Q2 sector review meeting: Friday 15:00. All analysts to bring their top conviction idea and the biggest risk to their current view. 10 minutes each."),
                        (richard,  "Research is our institutional franchise. The AstraZeneca call is exactly the differentiated work that strengthens our client relationships. Keep pushing on quality."),
                    ],
                },
            ],

            "AM": [
                {
                    "name": "portfolio-alerts", "display_name": "Portfolio Alerts",
                    "description": "Real-time portfolio drift, rebalancing triggers, and trade alerts.",
                    "is_private": False, "members": all_am,
                    "messages": [
                        (cd,       "Alert: Global Equity Fund — Tech sector weight at 28.4%, drift threshold 28% breached. Proposing trim of £12M NVIDIA + £8M Microsoft. Sending rebalance proposal to Oliver."),
                        (og,       "Approved. Execute at VWAP today. Document rationale under IPS guidelines and log in the rebalance tracker."),
                        (rm,       "Risk flag: USD/GBP move overnight +1.8%. FX hedge on US equity sleeve needs review — coverage ratio now 74%, target 80%. Charlotte — priority today."),
                        (cd,       "On it. Adding £40M of 3-month USD/GBP forward. Executing through FX desk — confirmation by 11:00."),
                        (og,       "Q2 rebalance window opens Monday. Pre-trade analysis circulated — 6 names above drift threshold, 3 below. Committee sign-off meeting Thursday 09:00."),
                        (rm,       "Portfolio beta has crept up to 1.08 vs target 1.00 following the tech rally. Recommending index futures overlay to reduce tactically."),
                        (cd,       "FX hedge confirmed. USD/GBP forward executed at 1.2714. Coverage back to 81% — within tolerance."),
                        (hb,       "Client query from Pemberton Family Office: how is the fund positioned ahead of the Fed meeting? Charlotte — can you put together a 1-pager on rates exposure?"),
                    ],
                },
                {
                    "name": "risk-monitoring", "display_name": "Risk Monitoring",
                    "description": "VaR, stress tests, factor exposure, and risk committee prep.",
                    "is_private": False, "members": [og, cd, rm, fs],
                    "messages": [
                        (rm,       "Weekly risk report: Fund VaR (95%, 1-day) = £1.8M vs £2.0M limit. Factor exposures within tolerance. Main concern: concentrated position in European Financials — 18% of fund."),
                        (og,       "Financials concentration has been deliberate — Barclays and BNP are key conviction positions. Rajan — model the drawdown scenario if financials correct 15%."),
                        (rm,       "Stress test complete: 15% financials correction scenario → fund drawdown -4.2% vs benchmark -2.8%. Alpha drag within acceptable range given conviction level."),
                        (fs,       "Compliance note: MiFID II transaction reporting for March filed. 2 late flags from custody — resolved. No material breaches. Filing confirmation in the compliance tracker."),
                        (rm,       "Liquidity update: 92% of the portfolio tradeable within 5 business days at 20% ADV. Three illiquid positions flagged — all pre-approved by Investment Committee."),
                        (cd,       "Q2 risk committee pack circulated. Key items: EM allocation proposal (+3% from current 7%), Infrastructure sleeve introduction, Tech weight limit increase to 30%."),
                        (og,       "Good pack Charlotte. Add a slide on the FX hedge effectiveness — it came up in the last client meeting and will come up in the committee."),
                        (rm,       "FX slide added. Net currency exposure and hedge ratio by currency — GBP, USD, EUR, JPY. Hedge effectiveness ratio 97.3% over trailing 12 months."),
                    ],
                },
                {
                    "name": "compliance", "display_name": "Compliance",
                    "description": "Regulatory filings, suitability reviews, client documentation, and audit prep.",
                    "is_private": False, "members": [og, fs, caroline],
                    "messages": [
                        (fs,       "Q1 suitability reviews complete — 94 client accounts reviewed, all within risk tolerance. 3 accounts flagged for mandate refresh — clients contacted."),
                        (og,       "Good. The 3 flagged accounts — are they at risk of redemption or just routine refresh?"),
                        (fs,       "2 are routine annual reviews. 1 — the Thornton Estate — has had a beneficiary change that may shift risk appetite. Hugo is managing the client relationship side."),
                        (hb,       "Thornton Estate meeting scheduled for next Tuesday. I'll brief Fiona on the updated beneficiary structure before the meeting so the suitability assessment is ready."),
                        (fs,       "FCA Consumer Duty annual assessment due in 6 weeks. Starting the data pull now. Charlotte — I'll need the performance attribution data broken down by client segment."),
                        (cd,       "Performance data by client segment: will have it to Fiona by Thursday. Includes cost transparency data as required under Consumer Duty."),
                        (fs,       "AIFMD Annex IV reporting for Q1 submitted. Leverage ratios, liquidity profile, and risk exposure tables all filed on time."),
                        (caroline, "Firm-wide compliance training module updated for MiFID II best execution requirements. All team members to complete by end of month — link in Files."),
                    ],
                },
                {
                    "name": "general", "display_name": "General",
                    "description": "General announcements and team updates for Asset Management.",
                    "is_private": False, "members": all_am,
                    "messages": [
                        (og,       "Welcome to Asset Management on Cowrkflow. Using this for portfolio coordination, risk monitoring, compliance, and client communications. Keep all client names out of public channels."),
                        (caroline, "New AUM milestone: Global Equity Fund crossed £2.1bn AUM — well done to the team. Performance has been strong and client inflows reflect it."),
                        (cd,       "Q1 performance: Global Equity Fund +6.4% vs benchmark +5.1%. Outperformance driven by Financials overweight and tech quality bias. Attribution report circulated."),
                        (rm,       "Risk-adjusted return update: Sharpe ratio 0.94 vs benchmark 0.71. Information ratio 0.62 — top quartile among peers for the rolling 3-year period."),
                        (hb,       "Client event scheduled: London Investor Day, June 12th. Venue confirmed — Canary Wharf. 18 clients confirmed attendance. Oliver presenting investment strategy."),
                        (fs,       "Reminder: all client meetings to be logged in Salesforce within 24 hours. MiFID II requires documentation of investment advice provided."),
                        (og,       "Investor Day prep starting next week. Charlotte — please prepare the 5-year performance track record slide. Rajan — risk-adjusted metrics. Hugo — client testimonials (anonymised)."),
                        (richard,  "Asset Management is a key growth priority for the firm. £2.1bn AUM and top-quartile performance is exactly the foundation to build on. Well done."),
                    ],
                },
            ],

            "Tech": [
                {
                    "name": "deployments", "display_name": "Deployments",
                    "description": "Production deployments, release notes, and rollback decisions.",
                    "is_private": False, "members": all_tech,
                    "messages": [
                        (bh,       "Trading Platform v3.4.1 deployed to prod at 06:15 this morning. Zero downtime. Latency P99 improved from 18ms to 11ms on order routing. Rollout complete."),
                        (ak,       "EKS cluster autoscaling config updated — max nodes raised to 80 for Q2 peak trading. Canary deploy tested Friday, promoted to prod 06:00."),
                        (jo,       "Portfolio Analytics API v2.1 live — adds real-time P&L breakdown by sector. AM team has been using it in UAT for 2 weeks. Official launch announcement going to stakeholders today."),
                        (bh,       "v3.4.2 patch in pipeline — fixes an edge case in the FX rate feed when two liquidity providers return conflicting mid-prices. Review tomorrow, deploy Thursday window."),
                        (ak,       "Thursday deploy window confirmed: 06:00–08:00. Change record raised. DR runbook updated. Rollback procedure tested in staging."),
                        (ml,       "Security: v3.4.1 passed vulnerability scan — zero critical, 2 medium (both patched in 3.4.2). SAST and DAST complete. No blockers for Thursday."),
                        (jo,       "Stakeholder comms: Portfolio Analytics v2.1 announcement well received by Asset Management. 3 feature requests already in — adding to the backlog."),
                        (ar,       "Excellent release cadence this quarter — 9 deployments, zero rollbacks, one minor incident (contained in 12 minutes). Team is operating well."),
                    ],
                },
                {
                    "name": "incidents", "display_name": "Incidents",
                    "description": "Incident response, postmortem tracking, and on-call coordination.",
                    "is_private": False, "members": all_tech,
                    "messages": [
                        (bh,       "[INC-2024-041] 09:47 — FX rate feed latency spike detected. P99 jumped from 8ms to 340ms. Trading operations aware. Investigating."),
                        (ak,       "Isolating: 2 pods in the FX ingestion service showing memory pressure. Restarting now."),
                        (bh,       "09:54 RESOLVED — pod restart fixed. Root cause: memory leak in the Reuters feed adapter on high-volume symbols. P99 back to 9ms. Zero trade impact — buffer held."),
                        (ml,       "Post-mortem draft: root cause confirmed memory leak in Reuters adapter v2.3.1. Fix: upgrade to v2.3.3 (patches the leak). Testing in staging now."),
                        (ar,       "Good response, 7 minutes resolution. MTR target is 15 minutes — well within. Post-mortem actions assigned: Ben owns the adapter upgrade, Anya owns the memory alert threshold."),
                        (bh,       "[INC-2024-042] 14:22 — Portfolio Analytics API elevated error rate: 0.8% of requests returning 503. Load balancer health checks passing. Drilling into pod logs."),
                        (jo,       "Escalating from AM team — Charlotte flagged some P&L dashboard timeouts. Correlates with the 503s. Can we route AM traffic to the second cluster while you investigate?"),
                        (bh,       "Traffic routed to cluster-2. Error rate dropped to 0.02%. Root cause: database connection pool exhaustion on cluster-1. Increase pool size deployed. Monitoring."),
                    ],
                },
                {
                    "name": "product-roadmap", "display_name": "Product Roadmap",
                    "description": "Feature planning, backlog grooming, and stakeholder alignment on the trading platform roadmap.",
                    "is_private": False, "members": all_tech,
                    "messages": [
                        (jo,       "Q3 roadmap priorities confirmed after stakeholder sessions: (1) Real-time risk dashboard for AM, (2) Algo order execution improvements for trading, (3) Zero Trust rollout Phase 2."),
                        (ar,       "Zero Trust Phase 2 is a compliance commitment — must be in Q3. Ben and Mei, capacity planning for this should take priority over discretionary features."),
                        (ml,       "Zero Trust Phase 2 scope: device attestation for all trading terminals, privileged access management (PAM) for prod systems, and automated certificate rotation. Estimate: 8 sprints."),
                        (bh,       "Real-time risk dashboard: API layer is ready (Portfolio Analytics v2.1). Frontend work is 4–6 sprints. Proposing we start Sprint 1 after the v3.4.2 patch lands Thursday."),
                        (jo,       "Stakeholder update sent to AM and IB. AM confirmed real-time risk dashboard is their highest priority. IB wants multi-currency deal timeline feature added to Q3 — pushing to Q4 given capacity."),
                        (ak,       "Infra capacity for Q3 roadmap: no blockers. Cloud spend headroom £180k — sufficient. GPU instances for the risk dashboard ML inference layer: pre-approved."),
                        (ml,       "Vendor review for PAM solution complete. Recommendation: CyberArk EPM over BeyondTrust — better API for our bespoke trading terminal fleet. Sending procurement summary to Aisha."),
                        (ar,       "CyberArk approved. Procurement in motion. Mei — start the integration design doc. We need to be in implementation by Week 3 of Q3."),
                    ],
                },
                {
                    "name": "general", "display_name": "General",
                    "description": "General announcements and team updates for Technology & Engineering.",
                    "is_private": False, "members": all_tech,
                    "messages": [
                        (ar,       "Welcome to Tech & Engineering on Cowrkflow. Using this for deployments, incidents, roadmap coordination, and architecture discussions."),
                        (caroline, "Firm-wide: all engineering teams to complete the updated Information Security training by end of month. Link in Files."),
                        (bh,       "Engineering all-hands recap: Q1 highlights — 9 deployments, 99.97% uptime, 2 incidents both resolved within SLA. Full slides in Confluence."),
                        (ml,       "Zero Trust Phase 1 complete: MFA enforced across all 847 trading terminal accounts. No legacy auth paths remain. Audit evidence packaged for FCA review."),
                        (jo,       "User research sessions complete for the new risk dashboard — 6 Portfolio Managers interviewed. Key insight: they want intraday factor exposure as the hero metric, not just VaR."),
                        (ak,       "Cloud cost optimisation Q1: saved £42k via reserved instance purchases and 3 decommissioned idle clusters. Targeting £60k savings in Q2."),
                        (bh,       "Team reminder: code freeze for Q2 audit period starts June 20th. All non-critical PRs must be merged by June 18th EOD."),
                        (richard,  "Technology is a strategic differentiator at JPMorgan. The platform uptime, Zero Trust progress, and the new risk dashboard are all outstanding contributions to the firm."),
                    ],
                },
            ],
        }

        for div, team in teams.items():
            div_channels = channel_data.get(div, [])
            mgr_email_map = {
                "IB": "james.thornton@jpmorgan-demo.internal",
                "Research": "alicia.fong@jpmorgan-demo.internal",
                "AM": "oliver.grant@jpmorgan-demo.internal",
                "Tech": "aisha.rahman@jpmorgan-demo.internal",
            }
            mgr = users[mgr_email_map[div]]

            for spec in div_channels:
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
                            client_id=f"seed-jpmorgan-{div}-{spec['name']}-{i}",
                        )

            self.stdout.write(f"  Channels + messages: {div}")

    # ─── Meetings ──────────────────────────────────────────────────────────

    def _create_meetings(self, teams: dict, users: dict) -> None:
        from apps.messaging.models import Channel, ChannelMember
        from apps.meetings.models import Meeting

        richard  = users["richard.hartley@jpmorgan-demo.internal"]
        caroline = users["caroline.webb@jpmorgan-demo.internal"]
        now      = timezone.now()

        # (email_key, full_name_for_vars)
        mgr_map = {
            "IB":       users["james.thornton@jpmorgan-demo.internal"],
            "Research": users["alicia.fong@jpmorgan-demo.internal"],
            "AM":       users["oliver.grant@jpmorgan-demo.internal"],
            "Tech":     users["aisha.rahman@jpmorgan-demo.internal"],
        }

        div_members = {
            "IB": [
                users["james.thornton@jpmorgan-demo.internal"],
                users["natasha.reeves@jpmorgan-demo.internal"],
                users["william.chen@jpmorgan-demo.internal"],
                users["priya.kapoor@jpmorgan-demo.internal"],
                users["tom.bradley@jpmorgan-demo.internal"],
            ],
            "Research": [
                users["alicia.fong@jpmorgan-demo.internal"],
                users["marcus.webb@jpmorgan-demo.internal"],
                users["sophia.okafor@jpmorgan-demo.internal"],
                users["daniel.price@jpmorgan-demo.internal"],
                users["leila.mansouri@jpmorgan-demo.internal"],
            ],
            "AM": [
                users["oliver.grant@jpmorgan-demo.internal"],
                users["charlotte.davies@jpmorgan-demo.internal"],
                users["rajan.mehta@jpmorgan-demo.internal"],
                users["fiona.stewart@jpmorgan-demo.internal"],
                users["hugo.blanc@jpmorgan-demo.internal"],
            ],
            "Tech": [
                users["aisha.rahman@jpmorgan-demo.internal"],
                users["ben.holloway@jpmorgan-demo.internal"],
                users["mei.lin@jpmorgan-demo.internal"],
                users["jake.osei@jpmorgan-demo.internal"],
                users["anya.kuznetsova@jpmorgan-demo.internal"],
            ],
        }

        # (title, description, call_type, delta_days, hour, duration_min, attendees_override_or_None)
        meetings_by_div = {
            "IB": [
                ("IB Morning Deal Review",
                 "Daily 15-minute review of active deal pipeline, overnight developments, and priority client actions.",
                 "audio", 1, 8, 15, None),
                ("Project Falcon — M&A Update Call",
                 "Exclusivity phase update: financial model progress, DD findings, valuation scenarios, and next steps with Clifford Chance.",
                 "video", 0, 10, 60, None),
                ("Mandel Capital — Pitch Preparation",
                 "Pre-brief before Mandel Capital call: sector positioning, deal credentials review, and question preparation.",
                 "video", 2, 9, 30,
                 [users["james.thornton@jpmorgan-demo.internal"], users["natasha.reeves@jpmorgan-demo.internal"], users["william.chen@jpmorgan-demo.internal"]]),
                ("Greenwave IPO — Roadshow Prep",
                 "Roadshow dry run: investor narrative, ESG section, financial highlights, and anticipated Q&A from key fund managers.",
                 "video", 3, 14, 45, None),
                ("IB Weekly Fee & Pipeline Review",
                 "Weekly review of deal revenues, mandate conversion rates, and pipeline quality vs target.",
                 "video", 4, 16, 30,
                 [users["richard.hartley@jpmorgan-demo.internal"], users["caroline.webb@jpmorgan-demo.internal"],
                  users["james.thornton@jpmorgan-demo.internal"], users["natasha.reeves@jpmorgan-demo.internal"]]),
                ("Quarterly Mandate Strategy — IB & Coverage",
                 "Quarterly review of sector coverage strategy, target client list, competitor positioning, and mandate win/loss analysis.",
                 "video", 7, 15, 90,
                 [users["richard.hartley@jpmorgan-demo.internal"], users["james.thornton@jpmorgan-demo.internal"],
                  users["natasha.reeves@jpmorgan-demo.internal"]]),
            ],
            "Research": [
                ("Research Morning Brief",
                 "Pre-market briefing: overnight macro, sector moves, publication schedule for the day, and key data releases.",
                 "audio", 1, 7, 20, None),
                ("Sector Coverage — Q2 Earnings Prep",
                 "Align analyst expectations vs consensus across 14 healthcare names ahead of Q2 earnings season. Flag divergent calls.",
                 "video", 3, 14, 120, None),
                ("Clean Energy Initiation — Peer Review",
                 "Peer review of the UK Clean Energy sector initiation: valuation methodology, target prices, and rating rationale for all 4 names.",
                 "video", 2, 10, 60,
                 [users["alicia.fong@jpmorgan-demo.internal"], users["marcus.webb@jpmorgan-demo.internal"], users["daniel.price@jpmorgan-demo.internal"]]),
                ("Model Methodology Alignment",
                 "Standardise DCF and EV/EBITDA methodology across all sector teams. Address feedback from the compliance model audit.",
                 "video", 5, 11, 45, None),
                ("Research Q2 Sector Strategy Review",
                 "Each analyst presents top conviction idea and biggest risk to current view. 10 minutes per analyst.",
                 "video", 4, 15, 60, None),
                ("Research & IB Coordination — Information Barriers",
                 "Quarterly review of information barrier protocols between research and IB. Compliance-led. Mandatory for all research staff.",
                 "video", 6, 10, 45,
                 [users["richard.hartley@jpmorgan-demo.internal"], users["caroline.webb@jpmorgan-demo.internal"],
                  users["alicia.fong@jpmorgan-demo.internal"]]),
            ],
            "AM": [
                ("AM Morning Portfolio Standup",
                 "Daily 20-minute standup: overnight moves, portfolio drift, FX hedge status, and client queries requiring same-day response.",
                 "audio", 1, 8, 20, None),
                ("Investment Committee — Q2 Rebalance",
                 "Q2 rebalance proposal review: 6 names above drift, 3 below, EM allocation proposal, and infrastructure sleeve introduction.",
                 "video", 2, 9, 90,
                 [users["richard.hartley@jpmorgan-demo.internal"], users["oliver.grant@jpmorgan-demo.internal"],
                  users["charlotte.davies@jpmorgan-demo.internal"], users["rajan.mehta@jpmorgan-demo.internal"]]),
                ("Risk Committee Quarterly",
                 "Q2 risk review: VaR attribution, factor exposures, stress test results, liquidity profile, and emerging risk flags.",
                 "video", 4, 14, 60,
                 [users["oliver.grant@jpmorgan-demo.internal"], users["charlotte.davies@jpmorgan-demo.internal"],
                  users["rajan.mehta@jpmorgan-demo.internal"], users["fiona.stewart@jpmorgan-demo.internal"]]),
                ("Client Quarterly Update — Pemberton Family Office",
                 "Quarterly performance review with Pemberton Family Office: portfolio attribution, market outlook, and positioning rationale.",
                 "video", 3, 10, 60,
                 [users["oliver.grant@jpmorgan-demo.internal"], users["charlotte.davies@jpmorgan-demo.internal"],
                  users["hugo.blanc@jpmorgan-demo.internal"]]),
                ("FCA Consumer Duty — Compliance Prep",
                 "Prepare for FCA Consumer Duty annual assessment: data completeness review, client segment outcomes, and action log.",
                 "video", 5, 14, 45,
                 [users["oliver.grant@jpmorgan-demo.internal"], users["fiona.stewart@jpmorgan-demo.internal"], users["caroline.webb@jpmorgan-demo.internal"]]),
                ("Investor Day Preparation",
                 "London Investor Day (June 12th) preparation: strategy presentation review, performance slides, and client Q&A rehearsal.",
                 "video", 6, 15, 60, None),
            ],
            "Tech": [
                ("Daily Engineering Standup",
                 "Daily 15-minute standup: overnight incidents, deployment queue, blocker escalations, and priority for the day.",
                 "audio", 1, 9, 15, None),
                ("v3.4.2 Patch — Pre-Deploy Review",
                 "Pre-deployment review for v3.4.2: FX rate feed fix validation, security scan results, rollback plan confirmation.",
                 "video", 0, 14, 30,
                 [users["aisha.rahman@jpmorgan-demo.internal"], users["ben.holloway@jpmorgan-demo.internal"],
                  users["mei.lin@jpmorgan-demo.internal"], users["anya.kuznetsova@jpmorgan-demo.internal"]]),
                ("Zero Trust Phase 2 — Architecture Review",
                 "Design review for Zero Trust Phase 2: device attestation, PAM integration with CyberArk, and certificate rotation automation.",
                 "video", 2, 11, 90, None),
                ("Real-Time Risk Dashboard — Sprint Planning",
                 "Sprint 1 planning for the real-time risk dashboard: API integration, frontend scaffolding, intraday factor exposure widget.",
                 "video", 3, 10, 60,
                 [users["aisha.rahman@jpmorgan-demo.internal"], users["ben.holloway@jpmorgan-demo.internal"],
                  users["jake.osei@jpmorgan-demo.internal"]]),
                ("Incident Post-Mortem — INC-2024-041 & 042",
                 "Post-mortem review for the FX feed memory leak and Portfolio Analytics 503s. Action owners, preventive measures, and alert improvements.",
                 "video", 2, 15, 45, None),
                ("Q3 Tech Roadmap — Stakeholder Alignment",
                 "Quarterly roadmap review with IB and AM stakeholders: roadmap priorities, capacity commitments, and delivery confidence.",
                 "video", 5, 14, 60,
                 [users["richard.hartley@jpmorgan-demo.internal"], users["aisha.rahman@jpmorgan-demo.internal"],
                  users["jake.osei@jpmorgan-demo.internal"], users["james.thornton@jpmorgan-demo.internal"],
                  users["oliver.grant@jpmorgan-demo.internal"]]),
            ],
        }

        for div, team in teams.items():
            mgr       = mgr_map[div]
            members   = div_members[div]

            for (title, desc, call_type, d_days, d_hour, duration, attendees_override) in meetings_by_div[div]:
                starts_at = now.replace(hour=d_hour, minute=0, second=0, microsecond=0) + datetime.timedelta(days=d_days)
                attendees = attendees_override if attendees_override is not None else members

                if Meeting.objects.filter(team=team, title=title).exists():
                    continue

                safe_name = (
                    title.lower()
                    .replace(" ", "-")
                    .replace("—", "")
                    .replace("&", "and")
                    .replace("/", "-")
                    .replace(".", "")
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
                for member in set(attendees):
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
                meeting.attendees.set(attendees)

            self.stdout.write(f"  Meetings: {div}")

    # ─── Projects ──────────────────────────────────────────────────────────

    def _create_projects(self, teams: dict, users: dict) -> dict:
        from apps.projects.models import Project, Column, Label

        project_specs = {
            "IB": [
                {
                    "name":        "Project Falcon — Horizon Pharma M&A",
                    "description": "Full M&A advisory mandate: due diligence coordination, valuation, SPA negotiation, and regulatory filings for the Horizon Pharma acquisition.",
                    "color": "#1e40af", "icon": "🦅",
                    "manager": "james.thornton@jpmorgan-demo.internal",
                    "columns": [("Scoping","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Closed","#22c55e",True)],
                    "labels":  [("valuation","#6366f1"),("due-diligence","#0ea5e9"),("legal","#8b5cf6"),("regulatory","#f59e0b"),("urgent","#ef4444")],
                },
                {
                    "name":        "EMEA Client Coverage — Q2 2025",
                    "description": "Q2 client coverage programme: target client prioritisation, pitch book preparation, and mandate conversion tracking across EMEA.",
                    "color": "#0f766e", "icon": "🤝",
                    "manager": "james.thornton@jpmorgan-demo.internal",
                    "columns": [("Target","#94a3b8",False),("Engaged","#3b82f6",False),("Pitch Sent","#f59e0b",False),("Won","#22c55e",True)],
                    "labels":  [("M&A","#6366f1"),("ECM","#10b981"),("DCM","#0ea5e9"),("high-priority","#ef4444")],
                },
            ],
            "Research": [
                {
                    "name":        "Q2 Earnings Coverage — 40 Names",
                    "description": "Q2 earnings season: model updates, earnings previews, and post-results notes across the 40-name coverage universe.",
                    "color": "#7c3aed", "icon": "📊",
                    "manager": "alicia.fong@jpmorgan-demo.internal",
                    "columns": [("Scheduled","#94a3b8",False),("Modelling","#3b82f6",False),("In Review","#f59e0b",False),("Published","#22c55e",True)],
                    "labels":  [("TMT","#6366f1"),("healthcare","#10b981"),("energy","#f59e0b"),("financials","#0ea5e9"),("rating-change","#ef4444")],
                },
                {
                    "name":        "UK Clean Energy — Sector Initiation",
                    "description": "Initiation of coverage on 4 UK clean energy names: Orsted, SSE, RWE, National Grid. Full DCF models, target prices, and sector overview note.",
                    "color": "#059669", "icon": "⚡",
                    "manager": "alicia.fong@jpmorgan-demo.internal",
                    "columns": [("Research","#94a3b8",False),("Modelling","#3b82f6",False),("Peer Review","#f59e0b",False),("Published","#22c55e",True)],
                    "labels":  [("initiation","#6366f1"),("DCF","#8b5cf6"),("ESG","#10b981"),("compliance","#0ea5e9")],
                },
            ],
            "AM": [
                {
                    "name":        "Global Equity Fund — Q2 Rebalance",
                    "description": "Q2 portfolio rebalance: drift resolution, EM allocation increase, infrastructure sleeve introduction, and FX hedge adjustment.",
                    "color": "#b45309", "icon": "⚖️",
                    "manager": "oliver.grant@jpmorgan-demo.internal",
                    "columns": [("Analysis","#94a3b8",False),("Proposed","#3b82f6",False),("IC Approved","#f59e0b",False),("Executed","#22c55e",True)],
                    "labels":  [("equities","#6366f1"),("FX","#10b981"),("risk","#ef4444"),("IC-approval","#f59e0b")],
                },
                {
                    "name":        "Regulatory Compliance — FCA 2025",
                    "description": "FCA Consumer Duty annual assessment, AIFMD reporting uplift, and MiFID II best execution review for 2025.",
                    "color": "#dc2626", "icon": "⚖️",
                    "manager": "fiona.stewart@jpmorgan-demo.internal",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Filed","#22c55e",True)],
                    "labels":  [("consumer-duty","#6366f1"),("AIFMD","#0ea5e9"),("MiFID-II","#8b5cf6"),("urgent","#ef4444")],
                },
            ],
            "Tech": [
                {
                    "name":        "Trading Platform — Core v3 Migration",
                    "description": "Migration of the core trading platform to v3 architecture: microservices decomposition, latency improvements, and new Portfolio Analytics API.",
                    "color": "#1d4ed8", "icon": "⚙️",
                    "manager": "aisha.rahman@jpmorgan-demo.internal",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Done","#22c55e",True)],
                    "labels":  [("backend","#6366f1"),("frontend","#10b981"),("infra","#0ea5e9"),("performance","#f59e0b"),("urgent","#ef4444")],
                },
                {
                    "name":        "Zero Trust Security Programme",
                    "description": "Firm-wide Zero Trust implementation: MFA enforcement (Phase 1 complete), device attestation, PAM with CyberArk, and automated certificate rotation (Phase 2).",
                    "color": "#991b1b", "icon": "🔒",
                    "manager": "mei.lin@jpmorgan-demo.internal",
                    "columns": [("Backlog","#94a3b8",False),("In Progress","#3b82f6",False),("In Review","#f59e0b",False),("Done","#22c55e",True)],
                    "labels":  [("zero-trust","#6366f1"),("PAM","#8b5cf6"),("compliance","#0ea5e9"),("phase-2","#f59e0b"),("critical","#ef4444")],
                },
            ],
        }

        projects = {}
        for div, specs in project_specs.items():
            team = teams[div]
            projects[div] = {}
            for spec in specs:
                manager = users[spec["manager"]]
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

                projects[div][spec["name"]] = {"project": project, "columns": columns, "labels": labels}
                self.stdout.write(f"  Project: {spec['name']}")

        return projects

    # ─── Tasks ─────────────────────────────────────────────────────────────

    def _create_tasks(self, projects: dict, users: dict) -> None:
        from apps.projects.models import Task, Sprint, Milestone

        today = datetime.date.today()
        sfx   = "@jpmorgan-demo.internal"

        # (title, col_name, assignee_slug, priority, itype, start_off, due_off, labels, description)
        tasks_by_div = {
            "IB": {
                "Project Falcon — Horizon Pharma M&A": [
                    ("Build 3-scenario valuation model",
                     "In Progress", "william.chen", "urgent", "task", -2, 3,
                     ["valuation", "urgent"],
                     "Base / upside / downside DCF and EV/EBITDA. Incorporate synergy assumptions from mgmt. presentation. TB to review before MD sign-off."),
                    ("Coordinate financial DD with KPMG",
                     "In Progress", "natasha.reeves", "high", "task", -1, 5,
                     ["due-diligence"],
                     "KPMG DD workstream: revenue quality, working capital normalisation, capex maintenance vs growth split. Weekly DD calls Thursday 10:00."),
                    ("Prepare SPA negotiation points",
                     "Scoping", "james.thornton", "normal", "task", None, 14,
                     ["legal", "valuation"],
                     "Draft key commercial negotiation positions for SPA: reps & warranties, locked-box mechanism, MAC definition, and earn-out structure."),
                    ("CMA pre-notification assessment",
                     "Scoping", "natasha.reeves", "high", "task", None, 10,
                     ["regulatory"],
                     "Assess CMA Phase 1 review likelihood given combined market share in UK pharma distribution. Engage King & Spalding for a preliminary opinion."),
                    ("Falcon fairness opinion — board pack",
                     "In Review", "james.thornton", "urgent", "task", -5, 2,
                     ["valuation", "urgent"],
                     "Fairness opinion for Horizon Pharma board presentation. Summarise valuation range, comparables, and our independent assessment. MD sign-off required."),
                ],
                "EMEA Client Coverage — Q2 2025": [
                    ("Mandel Capital — pitch book final",
                     "In Progress", "natasha.reeves", "urgent", "story", -3, 4,
                     ["M&A", "high-priority"],
                     "Finalise logistics sector pitch: JPMorgan credentials, transaction comparables, indicative valuation range for the portfolio. Review with James Thursday."),
                    ("Greenwave IPO — investor targeting list",
                     "In Progress", "priya.kapoor", "high", "task", -2, 3,
                     ["ECM"],
                     "Build institutional investor targeting list: ESG funds, growth equity, UK small-cap specialists. Cross-reference with syndicate desk appetite signals."),
                    ("Halo Diagnostics — relationship rebuild plan",
                     "Target", "james.thornton", "normal", "task", None, 21,
                     ["M&A"],
                     "Halo CFO has long Deutsche relationship. Plan: quarterly touch-points, bespoke diagnostics M&A landscape note, invite to JPMorgan Healthcare Conference."),
                    ("RetailNet — board advisor call",
                     "Engaged", "james.thornton", "urgent", "task", -1, 2,
                     ["M&A", "high-priority"],
                     "Call with RetailNet board advisor re: break-up rumours. Objective: understand if a formal process is imminent and position JPMorgan on the shortlist."),
                ],
            },
            "Research": {
                "Q2 Earnings Coverage — 40 Names": [
                    ("AstraZeneca Q2 earnings model update",
                     "Modelling", "sophia.okafor", "urgent", "task", -1, 3,
                     ["healthcare", "rating-change"],
                     "Update model for Q2 actuals. Key watch: Farxiga US sales vs guidance, R&D pipeline spend vs prior year. Consider PT upgrade given YTD performance."),
                    ("Shell Q2 earnings preview note",
                     "In Review", "daniel.price", "high", "task", -3, 2,
                     ["energy"],
                     "Preview note for Shell Q2: integrated gas production guidance, buyback acceleration potential, and 2025 capex sensitivity to Brent vs our £92/bbl assumption."),
                    ("Barclays H1 results note",
                     "Modelling", "leila.mansouri", "high", "task", -2, 4,
                     ["financials"],
                     "H1 results note: NII delivery vs our above-consensus forecast, capital returns update, and FY25 EPS revision. Aim to be first coverage with a note."),
                    ("TSMC — data centre demand deep-dive",
                     "Scheduled", "marcus.webb", "normal", "story", None, 10,
                     ["TMT"],
                     "Standalone thematic note: TSMC as infrastructure for AI data centre demand. Model semiconductor content per MW of data centre capex. Client appetite high."),
                    ("Compliance model audit — 8 names",
                     "In Review", "alicia.fong", "urgent", "task", -4, 1,
                     ["compliance"],
                     "Compliance flagged methodology inconsistencies across 8 names in Q1 audit. Standardise WACC inputs, terminal growth rates, and peer group selection. Sign off before Q2 publications."),
                ],
                "UK Clean Energy — Sector Initiation": [
                    ("SSE financial model — v1 to v2",
                     "Modelling", "marcus.webb", "high", "task", -4, 5,
                     ["DCF", "initiation"],
                     "Rebuild SSE model with updated regulatory reset assumptions (4.5% revenue growth). Run bear/base/bull scenarios. Peer review with Daniel on WACC."),
                    ("Orsted WACC and DCF — peer review",
                     "Peer Review", "daniel.price", "high", "task", -2, 3,
                     ["DCF", "initiation"],
                     "Peer review Orsted model: Danish rate environment WACC translation, offshore wind capacity factor assumptions, and government subsidy sensitivity."),
                    ("Sector overview note — 25-page draft",
                     "Research", "alicia.fong", "normal", "task", None, 12,
                     ["initiation", "ESG"],
                     "Lead sector note: UK energy transition investment case, policy backdrop, grid constraint analysis, and the 4-company relative value framework."),
                    ("Compliance pre-clearance — 4 initiations",
                     "Research", "alicia.fong", "urgent", "task", None, 7,
                     ["compliance", "initiation"],
                     "Submit all 4 initiation reports to compliance for pre-clearance 24h before publication. Confirm no investment banking conflicts with any of the 4 names."),
                ],
            },
            "AM": {
                "Global Equity Fund — Q2 Rebalance": [
                    ("Tech sector trim — NVIDIA & Microsoft",
                     "IC Approved", "charlotte.davies", "urgent", "task", -1, 1,
                     ["equities", "IC-approval"],
                     "Execute £12M NVIDIA + £8M Microsoft trim at VWAP. Sector weight target: 26.5%. Document under IPS drift guidelines. Rebalance tracker updated."),
                    ("EM allocation increase — +3% proposal",
                     "Proposed", "charlotte.davies", "high", "story", -3, 5,
                     ["equities", "IC-approval"],
                     "IC proposal: raise EM allocation from 7% to 10%. Rationale: valuation discount to DM at historical extreme, improving macro backdrop. Stress-test in Rajan's risk model."),
                    ("Infrastructure sleeve — investment case",
                     "Analysis", "rajan.mehta", "normal", "task", None, 14,
                     ["equities", "risk"],
                     "Build IC paper for introducing a 5% infrastructure sleeve: diversification benefits, duration matching for long-term liability clients, liquidity constraints."),
                    ("FX hedge rebalance — post equity trades",
                     "IC Approved", "charlotte.davies", "high", "task", -1, 2,
                     ["FX"],
                     "Post equity rebalance: recalculate USD/GBP and EUR/GBP hedge ratios. Target 80% coverage. Execute forward contracts through FX desk. Confirm by 11:00."),
                    ("Q2 rebalance client communication",
                     "Proposed", "hugo.blanc", "normal", "task", None, 7,
                     ["equities"],
                     "Draft client communication explaining the Q2 rebalance rationale: tech trim, EM increase, and infrastructure. Tailored versions for institutional vs family office clients."),
                ],
                "Regulatory Compliance — FCA 2025": [
                    ("FCA Consumer Duty — data pack",
                     "In Progress", "fiona.stewart", "urgent", "task", -3, 5,
                     ["consumer-duty", "urgent"],
                     "Pull performance attribution by client segment, cost transparency data, and client outcome metrics. Charlotte providing attribution data by Thursday."),
                    ("AIFMD Annex IV — Q2 filing",
                     "Backlog", "fiona.stewart", "high", "task", None, 20,
                     ["AIFMD"],
                     "Prepare Q2 Annex IV filing: leverage ratios, liquidity profile, risk exposure tables. Q1 filing complete — build from same template with Q2 actuals."),
                    ("MiFID II best execution review",
                     "In Review", "fiona.stewart", "normal", "task", -5, 3,
                     ["MiFID-II"],
                     "Annual best execution review: execution quality analysis across 12 brokers, venue analysis for equities, and FX execution review against benchmarks."),
                    ("Thornton Estate — suitability refresh",
                     "In Progress", "hugo.blanc", "high", "task", -1, 4,
                     ["consumer-duty"],
                     "Beneficiary change means new risk appetite assessment needed. Hugo to lead client meeting Tuesday. Fiona to prepare updated suitability documentation pre-meeting."),
                ],
            },
            "Tech": {
                "Trading Platform — Core v3 Migration": [
                    ("FX rate feed — Reuters adapter v2.3.3 upgrade",
                     "In Progress", "ben.holloway", "urgent", "task", -1, 2,
                     ["backend", "urgent"],
                     "Memory leak in Reuters adapter v2.3.1 caused INC-2024-041. Upgrade to v2.3.3 patches the leak. Test in staging, deploy Thursday 06:00 window."),
                    ("Portfolio Analytics API v2.2 — intraday factor exposure",
                     "In Progress", "ben.holloway", "high", "story", -3, 7,
                     ["backend", "frontend"],
                     "Add intraday factor exposure endpoint for the real-time risk dashboard. AM team requirement from user research. API spec agreed with Jake O."),
                    ("Real-time risk dashboard — frontend Sprint 1",
                     "Backlog", "jake.osei", "high", "story", None, 14,
                     ["frontend", "performance"],
                     "Sprint 1 scope: dashboard scaffold, real-time P&L tile, intraday factor exposure widget. Backend API ready post v2.2. Designs signed off by AM stakeholders."),
                    ("EKS autoscaling — Q2 peak capacity",
                     "Done", "anya.kuznetsova", "normal", "task", -5, -1,
                     ["infra"],
                     "Raised max nodes to 80 for Q2 peak trading volumes. Canary tested Friday, promoted Sunday. Load tested at 120% normal peak volume — no issues."),
                    ("Memory alert threshold — FX ingestion pods",
                     "In Progress", "anya.kuznetsova", "urgent", "task", -1, 3,
                     ["infra", "urgent"],
                     "Post-mortem action from INC-2024-041: add memory pressure alert at 75% threshold for FX ingestion pods. PagerDuty integration. Test in staging."),
                ],
                "Zero Trust Security Programme": [
                    ("CyberArk PAM — integration design doc",
                     "In Progress", "mei.lin", "urgent", "task", -2, 5,
                     ["PAM", "phase-2", "critical"],
                     "Design the CyberArk EPM integration for trading terminal fleet: agent deployment, policy definition, session recording scope, and break-glass procedure."),
                    ("Device attestation — trading terminal pilot",
                     "Backlog", "mei.lin", "high", "story", None, 14,
                     ["zero-trust", "phase-2"],
                     "Pilot device attestation on 20 trading terminals in the London office. Success criteria: zero auth failures, <200ms attestation latency at market open."),
                    ("Automated certificate rotation — design",
                     "Backlog", "ben.holloway", "normal", "task", None, 21,
                     ["zero-trust", "infra"],
                     "Design cert rotation automation for 340 production services. Target: no manual renewals, automated alerts at 30-day expiry, zero-downtime rotation."),
                    ("Zero Trust Phase 1 — FCA audit evidence pack",
                     "Done", "mei.lin", "high", "task", -10, -3,
                     ["compliance", "zero-trust"],
                     "Packaged MFA enforcement evidence: 847 accounts, all legacy auth paths removed. FCA audit pack submitted. Zero findings from auditor."),
                    ("PAM vendor procurement — CyberArk",
                     "In Review", "aisha.rahman", "high", "task", -5, 2,
                     ["PAM", "critical"],
                     "CyberArk EPM selected over BeyondTrust. Procurement summary sent to approver. Legal reviewing MSA. Target: contract signed, implementation start Week 3 Q3."),
                ],
            },
        }

        sprint_names = {
            "Project Falcon — Horizon Pharma M&A":   "Exclusivity Phase — Valuation & DD",
            "EMEA Client Coverage — Q2 2025":         "Q2 Coverage Sprint — Mandel & Greenwave",
            "Q2 Earnings Coverage — 40 Names":        "Q2 Earnings Season — Wave 1",
            "UK Clean Energy — Sector Initiation":    "Clean Energy Initiation Sprint",
            "Global Equity Fund — Q2 Rebalance":      "Q2 Rebalance Execution",
            "Regulatory Compliance — FCA 2025":       "FCA Consumer Duty Assessment",
            "Trading Platform — Core v3 Migration":   "Sprint 12 — v3.4.x Stabilisation",
            "Zero Trust Security Programme":          "Phase 2 Sprint 1 — PAM & Attestation",
        }

        milestone_names = {
            "Project Falcon — Horizon Pharma M&A":   ("Falcon Deal Signing", 30, "Exclusivity → SPA signing. Valuation, DD, regulatory, and board approvals complete."),
            "EMEA Client Coverage — Q2 2025":         ("Q2 Mandate Target — 3 New Mandates", 45, "Convert Mandel Capital, Greenwave, and one additional mandate in Q2."),
            "Q2 Earnings Coverage — 40 Names":        ("Q2 Earnings Season Complete", 35, "All 40 names published with post-results notes within 24h of announcement."),
            "UK Clean Energy — Sector Initiation":    ("Clean Energy Initiation Published", 20, "All 4 initiations published with full notes and client distribution complete."),
            "Global Equity Fund — Q2 Rebalance":      ("Q2 Rebalance Executed", 10, "All trades executed, hedge ratios adjusted, and client communications sent."),
            "Regulatory Compliance — FCA 2025":       ("FCA Consumer Duty Filing", 40, "Annual Consumer Duty assessment submitted to FCA on time with no material findings."),
            "Trading Platform — Core v3 Migration":   ("v3.5 GA Release", 60, "Full v3 migration complete: all services migrated, latency targets met, zero regressions."),
            "Zero Trust Security Programme":          ("Zero Trust Phase 2 Complete", 90, "Device attestation, PAM, and cert rotation live across all production systems. FCA evidence ready."),
        }

        for div, div_projs in tasks_by_div.items():
            for proj_name, task_specs in div_projs.items():
                if proj_name not in projects.get(div, {}):
                    continue
                pd   = projects[div][proj_name]
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

                ms_name, ms_off, ms_desc = milestone_names.get(
                    proj_name,
                    (f"Q2 Target — {proj_name[:30]}", 45, "Q2 milestone.")
                )
                Milestone.objects.get_or_create(
                    project=proj,
                    name=ms_name,
                    defaults={
                        "description": ms_desc,
                        "due_date":    today + datetime.timedelta(days=ms_off),
                        "status":      "planned",
                        "created_by":  proj.created_by,
                    },
                )

                for (title, col_name, assignee_slug, priority, itype, s_off, d_off, lbl_names, desc) in task_specs:
                    col      = cols.get(col_name) or list(cols.values())[0]
                    assignee = users.get(f"{assignee_slug}{sfx}")
                    start_d  = (today + datetime.timedelta(days=s_off)) if s_off is not None else None
                    due_d    = (today + datetime.timedelta(days=d_off))  if d_off is not None else None
                    in_sprint = col_name not in ("Backlog", "Scoping", "Scheduled", "Target", "Analysis", "Research", "Done", "Closed", "Published", "Won", "Filed", "Executed")

                    Task.objects.get_or_create(
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
                            "estimated_hours": random.choice([4, 6, 8, 12, 16]),
                        },
                    )

        self.stdout.write("  Tasks, sprints, and milestones created.")

    # ─── Summary ───────────────────────────────────────────────────────────

    def _print_summary(self, password: str) -> None:
        w = self.stdout.write
        S = self.style.SUCCESS

        w("")
        w(S("=" * 72))
        w(S("  JPMORGAN CHASE & CO. — COWRKFLOW DEMO SEEDED"))
        w(S("=" * 72))
        w("")
        w("  DEMO URL  :  https://app.cowrkflow.com")
        w("  PASSWORD  :  " + password + "  (all accounts)")
        w("")
        w("  ── FIRM-WIDE LEADERSHIP " + "─" * 47)
        for name, email, _, div, title in USERS:
            if div == "HQ":
                w(f"  {name:<24} {email:<46} {title}")
        w("")
        for div_key, div_label, area in [
            ("IB",       "INVESTMENT BANKING",      "M&A, ECM, Client Coverage"),
            ("Research", "EQUITIES RESEARCH",       "TMT · Healthcare · Energy · Financials"),
            ("AM",       "ASSET MANAGEMENT",        "Global Equities, Risk, Compliance, Client Relations"),
            ("Tech",     "TECHNOLOGY & ENGINEERING","Platform, Security, Product, DevOps"),
        ]:
            w(f"  ── {div_label} ({area}) " + "─" * max(1, 50 - len(div_label) - len(area)))
            for name, email, _, div, title in USERS:
                if div == div_key:
                    w(f"  {name:<24} {email:<46} {title}")
            w("")
        w("  ── WHAT WAS CREATED " + "─" * 51)
        w("  Company    : JPMorgan Chase & Co. — Cowrkflow Demo (AI plan)")
        w("  Teams      : Investment Banking / Equities Research / Asset Mgmt / Tech")
        w("  Channels   : 4 per division × 4 = 16 channels")
        w("               IB: #deal-flow, #client-coverage, #pitch-book-reviews, #general")
        w("               Research: #market-updates, #research-pipeline, #model-reviews, #general")
        w("               AM: #portfolio-alerts, #risk-monitoring, #compliance, #general")
        w("               Tech: #deployments, #incidents, #product-roadmap, #general")
        w("  Messages   : 8 per channel × 16 = 128 messages — realistic banking operations")
        w("  Meetings   : 6 per division × 4 = 24 scheduled meetings")
        w("  Projects   : 2 per division × 4 = 8 projects")
        w("  Sprints    : 1 active per project (8 total)")
        w("  Milestones : 1 per project (8 total)")
        w("  Tasks      : 4–5 per project × 8 = 38 tasks")
        w("")
        w("  ── DEMO SCRIPT " + "─" * 57)
        w("  1. Log in as James Thornton (MD — M&A Coverage)")
        w("     → #deal-flow: Falcon exclusivity update, Mandel Capital inbound")
        w("     → Project Falcon: valuation model task, fairness opinion in review")
        w("     → Meetings: 'Project Falcon M&A Update Call' scheduled")
        w("  2. Switch to Alicia Fong (Head of Equities Research)")
        w("     → #market-updates: AstraZeneca upgrade, Shell upgrade, pre-market colour")
        w("     → #research-pipeline: publication schedule, compliance pre-clearance")
        w("     → Clean Energy Initiation project: 4-name coverage build")
        w("  3. Switch to Oliver Grant (Head of Asset Management)")
        w("     → #portfolio-alerts: tech drift breach, FX hedge rebalance")
        w("     → Q2 Rebalance project: IC-approved tech trim, EM proposal")
        w("     → Investment Committee meeting scheduled")
        w("  4. Switch to Aisha Rahman (CTO — Markets Tech)")
        w("     → #incidents: FX feed memory leak + Portfolio Analytics 503s")
        w("     → Zero Trust project: PAM integration, Phase 2 sprint in progress")
        w("     → Q3 roadmap meeting with IB + AM stakeholders")
        w("  5. Log in as Richard Hartley (Global Head of Operations)")
        w("     → Sees all 4 division teams from one account")
        w("     → Cross-division 'Q3 Tech Roadmap' meeting with IB + AM + Tech")
        w("")
        w("  TO RESET:")
        w("  python manage.py seed_jpmorgan_demo --reset --confirm")
        w(S("=" * 72))
        w("")
