from __future__ import annotations

import hashlib
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.integrations.models import SlackWebhook
from apps.meetings.models import Meeting, create_meeting_channel, ensure_channel_membership
from apps.messaging.models import Channel, ChannelMember, Notification
from apps.messaging.services import create_message_with_seq
from apps.projects.models import Column, Label, Milestone, Project, Sprint, SprintCapacity, Task
from apps.teams.models import Team, TeamMember
from apps.users.models import User


def _get_or_create_user(*, email: str, full_name: str, password: str, reset_password: bool) -> User:
    user, created = User.objects.get_or_create(email=email, defaults={"full_name": full_name})
    if created:
        user.set_password(password)
        user.save(update_fields=["password"])
    else:
        if reset_password:
            user.set_password(password)
            user.save(update_fields=["password"])
        if user.full_name != full_name:
            user.full_name = full_name
            user.save(update_fields=["full_name"])
    return user


def _ensure_team_member(*, team: Team, user: User, role: str, invited_by: User | None = None) -> TeamMember:
    member, _ = TeamMember.objects.update_or_create(
        team=team,
        user=user,
        defaults={"role": role, "invited_by": invited_by},
    )
    return member


def _ensure_channel_member(*, channel: Channel, user: User):
    ChannelMember.objects.get_or_create(channel=channel, user=user)


def _ensure_public_channel(*, team: Team, name: str, display_name: str, created_by: User) -> Channel:
    channel, created = Channel.objects.get_or_create(
        team=team,
        name=name,
        defaults={
            "display_name": display_name,
            "description": f"Demo channel: {display_name}",
            "is_private": False,
            "created_by": created_by,
        },
    )
    if not created and channel.display_name != display_name:
        channel.display_name = display_name
        channel.save(update_fields=["display_name"])
    return channel


def _ensure_private_channel(*, team: Team, name: str, display_name: str, created_by: User) -> Channel:
    channel, created = Channel.objects.get_or_create(
        team=team,
        name=name,
        defaults={
            "display_name": display_name[:100],
            "description": "Demo private channel",
            "is_private": True,
            "created_by": created_by,
        },
    )
    if not created and channel.display_name != display_name:
        channel.display_name = display_name[:100]
        channel.save(update_fields=["display_name"])
    return channel


def _dm_name(user_a_id: str, user_b_id: str) -> str:
    ids = sorted([str(user_a_id), str(user_b_id)])
    digest = hashlib.sha1(("|".join(ids)).encode("utf-8")).hexdigest()[:16]
    return f"dm-{digest}"


def _ensure_dm_channel(*, team: Team, user_a: User, user_b: User, created_by: User) -> Channel:
    channel = _ensure_private_channel(
        team=team,
        name=_dm_name(str(user_a.id), str(user_b.id)),
        display_name="Direct message",
        created_by=created_by,
    )
    _ensure_channel_member(channel=channel, user=user_a)
    _ensure_channel_member(channel=channel, user=user_b)
    return channel


def _ensure_project(*, team: Team, name: str, created_by: User, description: str, color: str, icon: str) -> Project:
    project, created = Project.objects.get_or_create(
        team=team,
        name=name,
        defaults={"description": description, "created_by": created_by, "color": color, "icon": icon},
    )
    if not created:
        updates = {}
        if project.description != description:
            updates["description"] = description
        if project.color != color:
            updates["color"] = color
        if project.icon != icon:
            updates["icon"] = icon
        if updates:
            for k, v in updates.items():
                setattr(project, k, v)
            project.save(update_fields=list(updates.keys()))
    return project


def _ensure_columns(project: Project) -> dict[str, Column]:
    cols = [
        ("Backlog", 0, None, False),
        ("In Progress", 1, None, False),
        ("Review", 2, None, False),
        ("Done", 3, None, True),
    ]
    out: dict[str, Column] = {}
    for name, order, color, is_done in cols:
        col, _ = Column.objects.get_or_create(
            project=project,
            name=name,
            defaults={"order": order, "color": color, "is_done_column": is_done},
        )
        out[name] = col
    return out


def _ensure_label(project: Project, name: str, color: str) -> Label:
    label, _ = Label.objects.get_or_create(project=project, name=name, defaults={"color": color})
    return label


def _ensure_task(
    *,
    project: Project,
    column: Column,
    reporter: User,
    assignee: User | None,
    title: str,
    description: str,
    priority: str,
    issue_type: str,
    due_date,
    order: int,
    labels: list[Label] | None = None,
) -> Task:
    task, created = Task.objects.get_or_create(
        project=project,
        title=title,
        defaults={
            "column": column,
            "reporter": reporter,
            "assignee": assignee,
            "description": description,
            "priority": priority,
            "issue_type": issue_type,
            "due_date": due_date,
            "order": order,
        },
    )
    if not created:
        updates = {
            "column": column,
            "assignee": assignee,
            "description": description,
            "priority": priority,
            "issue_type": issue_type,
            "due_date": due_date,
            "order": order,
        }
        for k, v in updates.items():
            setattr(task, k, v)
        task.save(update_fields=list(updates.keys()))
    if labels is not None:
        task.labels.set(labels)
    return task


class Command(BaseCommand):
    help = "Create a demo account and seed realistic sample data across modules (projects, messages, meetings, calendar)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="demo@flowteam.local", help="Demo account email")
        parser.add_argument("--password", default="Test@123", help="Demo account password")
        parser.add_argument("--team-name", default="FlowTeam Demo", help="Demo team/workspace name")
        parser.add_argument(
            "--reset-password",
            action="store_true",
            default=True,
            help="Reset passwords for demo accounts to the provided --password (default: on).",
        )
        parser.add_argument(
            "--no-reset-password",
            action="store_false",
            dest="reset_password",
            help="Do not change passwords for existing demo accounts.",
        )

    def handle(self, *args, **options):
        email: str = options["email"]
        password: str = options["password"]
        team_name: str = options["team_name"]
        reset_password: bool = bool(options.get("reset_password", True))

        now = timezone.now()
        today = now.date()

        with transaction.atomic():
            demo = _get_or_create_user(email=email, full_name="Demo", password=password, reset_password=reset_password)
            admin = _get_or_create_user(email="admin.demo@flowteam.local", full_name="Ben Admin", password=password, reset_password=reset_password)
            manager = _get_or_create_user(email="manager.demo@flowteam.local", full_name="Mia Manager", password=password, reset_password=reset_password)
            employee = _get_or_create_user(email="employee.demo@flowteam.local", full_name="Eli Employee", password=password, reset_password=reset_password)
            viewer = _get_or_create_user(email="viewer.demo@flowteam.local", full_name="Vera Viewer", password=password, reset_password=reset_password)

            team, created = Team.objects.get_or_create(
                name=team_name,
                defaults={"created_by": demo, "plan": "ai", "ai_enabled": True},
            )
            if not created:
                updates = {}
                if team.created_by_id != demo.id:
                    updates["created_by"] = demo
                if team.plan != "ai":
                    updates["plan"] = "ai"
                if not team.ai_enabled:
                    updates["ai_enabled"] = True
                if updates:
                    for k, v in updates.items():
                        setattr(team, k, v)
                    team.save(update_fields=list(updates.keys()))

            _ensure_team_member(team=team, user=demo, role=TeamMember.CEO, invited_by=demo)
            _ensure_team_member(team=team, user=admin, role=TeamMember.ADMIN, invited_by=demo)
            _ensure_team_member(team=team, user=manager, role=TeamMember.MANAGER, invited_by=demo)
            _ensure_team_member(team=team, user=employee, role=TeamMember.MEMBER, invited_by=demo)
            _ensure_team_member(team=team, user=viewer, role=TeamMember.VIEWER, invited_by=demo)

            SlackWebhook.objects.get_or_create(
                team=team,
                name="Demo (disabled)",
                defaults={"webhook_url": "https://example.com/disabled-webhook", "enabled": False, "created_by": demo},
            )

            project_a = _ensure_project(
                team=team,
                name="Website Redesign",
                created_by=demo,
                description="Sprint-based redesign for the marketing site.",
                color="#6366f1",
                icon="🚀",
            )
            project_b = _ensure_project(
                team=team,
                name="Q2 Launch",
                created_by=manager,
                description="Launch checklist, rollout plan, and stakeholder updates.",
                color="#06b6d4",
                icon="📣",
            )

            cols_a = _ensure_columns(project_a)
            cols_b = _ensure_columns(project_b)

            label_design = _ensure_label(project_a, "Design", "#a855f7")
            label_frontend = _ensure_label(project_a, "Frontend", "#22c55e")
            label_marketing = _ensure_label(project_a, "Marketing", "#f59e0b")
            label_bug = _ensure_label(project_a, "Bug", "#ef4444")

            t1 = _ensure_task(
                project=project_a,
                column=cols_a["Backlog"],
                reporter=manager,
                assignee=employee,
                title="Landing: implement hero section",
                description="Goal: ship a high-conversion hero.\nAcceptance: responsive, fast, matches design spec.",
                priority="high",
                issue_type=Task.ISSUE_TYPE_TASK,
                due_date=today + timedelta(days=3),
                order=0,
                labels=[label_frontend],
            )
            t2 = _ensure_task(
                project=project_a,
                column=cols_a["In Progress"],
                reporter=demo,
                assignee=employee,
                title="Design: finalize color tokens",
                description="Pick primary/secondary tokens and document usage. Link to Figma in comments.",
                priority="normal",
                issue_type=Task.ISSUE_TYPE_STORY,
                due_date=today + timedelta(days=1),
                order=1,
                labels=[label_design],
            )
            t3 = _ensure_task(
                project=project_a,
                column=cols_a["Review"],
                reporter=manager,
                assignee=admin,
                title="QA: verify calendar meeting creation",
                description="Check scheduled meeting shows in /calendar and /meetings list. Validate filters.",
                priority="urgent",
                issue_type=Task.ISSUE_TYPE_BUG,
                due_date=today - timedelta(days=1),
                order=2,
                labels=[label_bug],
            )
            _ensure_task(
                project=project_a,
                column=cols_a["Done"],
                reporter=demo,
                assignee=admin,
                title="Ops: configure Slack webhook (disabled)",
                description="Add a Slack webhook in Settings -> Integrations. Keep disabled for demo safety.",
                priority="low",
                issue_type=Task.ISSUE_TYPE_TASK,
                due_date=today - timedelta(days=2),
                order=3,
                labels=[label_marketing],
            )

            _ensure_task(
                project=project_b,
                column=cols_b["Backlog"],
                reporter=manager,
                assignee=None,
                title="Write launch announcement draft",
                description="Draft announcement for stakeholders. Include timeline + key links.",
                priority="normal",
                issue_type=Task.ISSUE_TYPE_TASK,
                due_date=today + timedelta(days=7),
                order=0,
                labels=[],
            )

            sprint_name = f"Sprint {today.isocalendar().week}"
            sprint, _ = Sprint.objects.get_or_create(
                project=project_a,
                name=sprint_name,
                defaults={
                    "goal": "Ship website redesign MVP",
                    "start_date": today,
                    "end_date": today + timedelta(days=13),
                    "capacity_hours": 120,
                    "status": Sprint.STATUS_ACTIVE,
                    "created_by": manager,
                },
            )
            SprintCapacity.objects.update_or_create(
                sprint=sprint, user=employee, defaults={"capacity_hours": 32, "notes": "Frontend focus"}
            )
            SprintCapacity.objects.update_or_create(
                sprint=sprint, user=admin, defaults={"capacity_hours": 16, "notes": "Ops + QA support"}
            )
            if t1.sprint_id != sprint.id:
                t1.sprint = sprint
                t1.save(update_fields=["sprint"])
            if t2.sprint_id != sprint.id:
                t2.sprint = sprint
                t2.save(update_fields=["sprint"])

            Milestone.objects.get_or_create(
                project=project_a,
                name="MVP Launch",
                defaults={
                    "description": "Minimum viable redesign shipped.",
                    "due_date": today + timedelta(days=14),
                    "status": Milestone.STATUS_PLANNED,
                    "created_by": demo,
                },
            )

            general = _ensure_public_channel(team=team, name="general", display_name="General", created_by=demo)
            announcements = _ensure_public_channel(team=team, name="announcements", display_name="Announcements", created_by=admin)
            design = _ensure_public_channel(team=team, name="design", display_name="Design", created_by=manager)
            exec_room = _ensure_private_channel(team=team, name="exec", display_name="Exec Room", created_by=demo)
            dm_demo_mgr = _ensure_dm_channel(team=team, user_a=demo, user_b=manager, created_by=demo)

            for ch in [general, announcements, design]:
                for u in [demo, admin, manager, employee, viewer]:
                    _ensure_channel_member(channel=ch, user=u)
            for u in [demo, admin, manager]:
                _ensure_channel_member(channel=exec_room, user=u)

            create_message_with_seq(channel_id=general.id, sender=demo, text="Welcome to the FlowTeam demo workspace!", client_id="seed-1")
            create_message_with_seq(
                channel_id=general.id,
                sender=manager,
                text=f"@{employee.full_name.split(' ')[0]} please start on the landing hero task today.",
                client_id="seed-2",
            )
            create_message_with_seq(
                channel_id=announcements.id,
                sender=admin,
                text="Demo note: Slack webhook is disabled by default so no external posts happen.",
                client_id="seed-3",
            )
            create_message_with_seq(
                channel_id=design.id,
                sender=employee,
                text="Color tokens draft is ready for review. I’ll post the link in the task comments.",
                client_id="seed-4",
            )
            create_message_with_seq(
                channel_id=exec_room.id,
                sender=demo,
                text="Leadership: review the Q2 Launch checklist and confirm timeline.",
                client_id="seed-5",
            )
            create_message_with_seq(
                channel_id=dm_demo_mgr.id,
                sender=manager,
                text="Can you approve the sprint goal? I set it to 'Ship website redesign MVP'.",
                client_id="seed-6",
            )

            import uuid as _uuid

            scheduled_uuid = _uuid.uuid5(_uuid.NAMESPACE_URL, f"flowteam-demo:{team.id}:weekly")
            if not Meeting.objects.filter(id=scheduled_uuid).exists():
                channel = create_meeting_channel(team=team, created_by=manager, meeting_id=scheduled_uuid, title="Weekly sprint planning")
                meeting = Meeting.objects.create(
                    id=scheduled_uuid,
                    team=team,
                    title="Weekly sprint planning",
                    description="Agenda: sprint goal, capacity, key risks, and next milestones.",
                    call_type=Meeting.CALL_VIDEO,
                    starts_at=now + timedelta(days=1),
                    duration_minutes=60,
                    status=Meeting.STATUS_SCHEDULED,
                    is_instant=False,
                    created_by=manager,
                    channel=channel,
                )
                attendee_ids = [str(demo.id), str(admin.id), str(manager.id), str(employee.id)]
                meeting.attendees.set(attendee_ids)
                ensure_channel_membership(channel=channel, user_ids=attendee_ids)

            instant_uuid = _uuid.uuid5(_uuid.NAMESPACE_URL, f"flowteam-demo:{team.id}:{today.isoformat()}:instant")
            if not Meeting.objects.filter(id=instant_uuid).exists():
                channel = create_meeting_channel(team=team, created_by=demo, meeting_id=instant_uuid, title="Instant demo call")
                meeting = Meeting.objects.create(
                    id=instant_uuid,
                    team=team,
                    title="Instant demo call",
                    description="Use this meeting to demo voice/audio and attendee flow.",
                    call_type=Meeting.CALL_AUDIO,
                    starts_at=now,
                    duration_minutes=30,
                    status=Meeting.STATUS_ACTIVE,
                    is_instant=True,
                    created_by=demo,
                    channel=channel,
                )
                attendee_ids = [str(demo.id), str(manager.id), str(employee.id)]
                meeting.attendees.set(attendee_ids)
                ensure_channel_membership(channel=channel, user_ids=attendee_ids)

            Notification.objects.get_or_create(
                recipient=employee,
                type="task_assigned",
                reference_type="task",
                reference_id=t1.id,
                defaults={
                    "title": "Task assigned: Landing hero",
                    "body": "You were assigned 'Landing: implement hero section'.",
                    "action_url": f"/projects/{project_a.id}?task={t1.id}",
                    "delivery_channel": "in_app",
                },
            )
            Notification.objects.get_or_create(
                recipient=admin,
                type="task_overdue",
                reference_type="task",
                reference_id=t3.id,
                defaults={
                    "title": "Overdue: Calendar meeting creation QA",
                    "body": "QA task is overdue. Please review and close the loop.",
                    "action_url": f"/projects/{project_a.id}?task={t3.id}",
                    "delivery_channel": "in_app",
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo seed completed."))
        self.stdout.write("")
        self.stdout.write("Login credentials (local demo):")
        self.stdout.write(f"- demo:     {email} / {password}")
        self.stdout.write(f"- admin:    admin.demo@flowteam.local / {password}")
        self.stdout.write(f"- manager:  manager.demo@flowteam.local / {password}")
        self.stdout.write(f"- employee: employee.demo@flowteam.local / {password}")
        self.stdout.write(f"- viewer:   viewer.demo@flowteam.local / {password}")
        self.stdout.write("")
        self.stdout.write("Open:")
        self.stdout.write("- http://localhost:3000/dashboard")
        self.stdout.write("- http://localhost:3000/projects")
        self.stdout.write("- http://localhost:3000/messages")
        self.stdout.write("- http://localhost:3000/meetings")
        self.stdout.write("- http://localhost:3000/calendar")
