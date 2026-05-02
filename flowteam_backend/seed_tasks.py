from apps.projects.models import Project, Column, Task
from apps.users.models import User

debug_p = Project.objects.get(name='Debug Project')
flowteam_p = Project.objects.get(name='FlowTeam Core')
sarah = User.objects.get(email='manager@example.com')
akaash = User.objects.get(email='akaash@example.com')

def seed_project(project, assignee, reporter):
    cols = {c.name: c for c in Column.objects.filter(project=project)}
    print(f'Seeding: {project.name} | Cols: {list(cols.keys())}')
    tasks_data = [
        {'title': 'Set up CI/CD pipeline', 'col': 'To Do', 'priority': 'high', 'assignee': assignee},
        {'title': 'Write unit tests for auth flow', 'col': 'To Do', 'priority': 'normal', 'assignee': assignee},
        {'title': 'Fix login redirect bug', 'col': 'In Progress', 'priority': 'urgent', 'assignee': reporter},
        {'title': 'Review PR #42 - performance', 'col': 'In Review', 'priority': 'high', 'assignee': assignee},
        {'title': 'Deploy v1.0 to staging', 'col': 'Done', 'priority': 'normal', 'assignee': reporter},
    ]
    for i, td in enumerate(tasks_data):
        col = cols.get(td['col'])
        if col:
            t, created = Task.objects.get_or_create(
                title=td['title'],
                project=project,
                defaults={
                    'column': col,
                    'priority': td['priority'],
                    'assignee': td['assignee'],
                    'reporter': reporter,
                    'order': i,
                }
            )
            print(f'  {"Created" if created else "Exists"}: {t.title}')

seed_project(debug_p, sarah, akaash)
print('Done!')
