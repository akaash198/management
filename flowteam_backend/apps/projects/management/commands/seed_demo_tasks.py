"""
Management command to seed demo tasks into all projects.
"""
from django.core.management.base import BaseCommand
from apps.projects.models import Project, Column, Task
from apps.users.models import User


class Command(BaseCommand):
    help = 'Seed demo tasks into projects'

    def handle(self, *args, **options):
        sarah = User.objects.filter(email='manager@example.com').first()
        akaash = User.objects.filter(email='akaash@example.com').first()
        dev = User.objects.filter(email='dev@example.com').first() or sarah

        if not sarah or not akaash:
            self.stdout.write(self.style.ERROR('Required users not found'))
            return

        projects = Project.objects.all()
        for project in projects:
            cols = {c.name: c for c in Column.objects.filter(project=project).order_by('order')}
            col_names = list(cols.keys())
            self.stdout.write(f'Project: {project.name} | Cols: {col_names}')

            if not col_names:
                self.stdout.write(self.style.WARNING('  No columns, skipping'))
                continue

            c0 = cols.get(col_names[0])
            c1 = cols.get(col_names[1]) if len(col_names) > 1 else c0
            c2 = cols.get(col_names[2]) if len(col_names) > 2 else c1
            c3 = cols.get(col_names[3]) if len(col_names) > 3 else c2

            tasks_data = [
                ('Set up CI/CD pipeline', c0, 'high', sarah),
                ('Write unit tests for auth flow', c0, 'normal', dev),
                ('Fix login redirect bug', c1, 'urgent', akaash),
                ('Review PR #42 - performance optimizations', c2, 'high', sarah),
                ('Deploy v1.0.0 to staging', c3, 'normal', akaash),
            ]

            for i, (title, col, priority, assignee) in enumerate(tasks_data):
                if col is None:
                    continue
                t, created = Task.objects.get_or_create(
                    title=title,
                    project=project,
                    defaults={
                        'column': col,
                        'priority': priority,
                        'assignee': assignee,
                        'reporter': akaash,
                        'order': i,
                    }
                )
                status = 'Created' if created else 'Exists'
                self.stdout.write(f'  {status}: {t.title}')

        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
