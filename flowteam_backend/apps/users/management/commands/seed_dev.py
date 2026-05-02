from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.teams.models import Team, TeamMember
from apps.projects.models import Project, Column, Task, TaskActivity, ProjectRole
from django.utils import timezone
from guardian.shortcuts import assign_perm

User = get_user_model()

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        self.stdout.write("Atomic Wipe...")
        Task.objects.all().delete()
        Project.objects.all().delete()
        Team.objects.all().delete()

        ceo = User.objects.get(email="akaash@example.com")
        mgr = User.objects.get(email="manager@example.com")
        dev = User.objects.get(email="dev@example.com")

        team = Team.objects.create(name="FlowTeam Corp", created_by=ceo)
        TeamMember.objects.create(team=team, user=ceo, role="ceo")
        TeamMember.objects.create(team=team, user=mgr, role="manager")
        TeamMember.objects.create(team=team, user=dev, role="member")

        # Create project with Sarah as an explicit ADMIN in ProjectRole
        p1 = Project.objects.create(name="FlowTeam Core", team=team, created_by=ceo, color="#6366f1", icon="⚡")
        ProjectRole.objects.create(project=p1, user=mgr, role="project_admin")
        
        # Explicitly assign Guardian perms just in case the bypass has a ghost
        assign_perm("projects.view_project", mgr, p1)
        assign_perm("projects.edit_project", mgr, p1)
        assign_perm("projects.manage_project", mgr, p1)

        # Get columns (they should be created by signal)
        todo = p1.columns.get(name="To Do")
        prog = p1.columns.get(name="In Progress")
        
        # Create tasks
        Task.objects.create(title="Finalizing RBAC", project=p1, column=prog, priority="urgent", assignee=mgr, reporter=ceo)
        Task.objects.create(title="UI Polish", project=p1, column=todo, priority="high", assignee=dev, reporter=mgr)

        self.stdout.write(self.style.SUCCESS("Wipe-and-Seed successful. Project: 'FlowTeam Core'"))
