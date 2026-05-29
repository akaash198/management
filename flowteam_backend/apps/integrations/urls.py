from django.urls import path

from apps.integrations.bitbucket_webhook import BitbucketWebhookView
from apps.integrations.calendar import (
    CalendarAccountsView,
    CalendarEventsView,
    CalendarOAuthCallbackView,
    CalendarOAuthStartView,
)
from apps.integrations.github_webhook import GitHubWebhookView
from apps.integrations.gitlab_webhook import GitLabWebhookView
from apps.integrations.views import (
    ProjectBitbucketIntegrationView,
    ProjectGitHubIntegrationView,
    ProjectGitHubWebhookDeliveriesView,
    ProjectGitHubWebhookDeliveryRetryView,
    ProjectGitHubWebhookReregisterView,
    ProjectGitLabIntegrationView,
    SlackWebhookDetailView,
    SlackWebhookListCreateView,
)

urlpatterns = [
    path("teams/<uuid:team_id>/slack-webhooks/", SlackWebhookListCreateView.as_view(), name="slack-webhook-list"),
    path("teams/<uuid:team_id>/calendar-accounts/", CalendarAccountsView.as_view(), name="calendar-accounts"),
    path("projects/<uuid:project_id>/github/", ProjectGitHubIntegrationView.as_view(), name="project-github-integration"),
    path("projects/<uuid:project_id>/github/webhooks/", ProjectGitHubWebhookDeliveriesView.as_view(), name="project-github-webhook-deliveries"),
    path("projects/<uuid:project_id>/github/webhooks/<uuid:delivery_id>/retry/", ProjectGitHubWebhookDeliveryRetryView.as_view(), name="project-github-webhook-delivery-retry"),
    path("projects/<uuid:project_id>/github/webhooks/reregister/", ProjectGitHubWebhookReregisterView.as_view(), name="project-github-webhook-reregister"),
    path("projects/<uuid:project_id>/gitlab/", ProjectGitLabIntegrationView.as_view(), name="project-gitlab-integration"),
    path("projects/<uuid:project_id>/bitbucket/", ProjectBitbucketIntegrationView.as_view(), name="project-bitbucket-integration"),
    path("github/webhook/", GitHubWebhookView.as_view(), name="github-webhook"),
    path("gitlab/webhook/", GitLabWebhookView.as_view(), name="gitlab-webhook"),
    path("bitbucket/webhook/", BitbucketWebhookView.as_view(), name="bitbucket-webhook"),
    path("calendar/events/", CalendarEventsView.as_view(), name="calendar-events"),
    path("calendar/<str:provider>/start/", CalendarOAuthStartView.as_view(), name="calendar-oauth-start"),
    path("calendar/<str:provider>/callback/", CalendarOAuthCallbackView.as_view(), name="calendar-oauth-callback"),
    path(
        "teams/<uuid:team_id>/slack-webhooks/<uuid:wid>/",
        SlackWebhookDetailView.as_view(),
        name="slack-webhook-detail",
    ),
]
