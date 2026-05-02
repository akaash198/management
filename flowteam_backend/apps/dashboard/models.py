from django.db import models
from apps.users.models import User
from apps.projects.models import Project

class UserProjectVisit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="visits")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="visits")
    visited_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "project")
        ordering = ["-visited_at"]

    def __str__(self):
        return f"{self.user.email} visited {self.project.name}"
