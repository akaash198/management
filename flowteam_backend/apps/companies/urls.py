from django.urls import path
from .views import (
    CompanyListCreateView,
    CompanyDetailView,
    CompanyTeamsView,
    CompanyAssignTeamView,
    CompanyOnboardingView,
    CompanyOnboardingInvitesView,
    CompanySettingsView,
    CompanyDomainVerifyView,
)

urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="company_list_create"),
    path("<uuid:id>/", CompanyDetailView.as_view(), name="company_detail"),
    path("<uuid:id>/teams/", CompanyTeamsView.as_view(), name="company_teams"),
    path("<uuid:id>/assign-team/", CompanyAssignTeamView.as_view(), name="company_assign_team"),
    path("<uuid:id>/onboarding/", CompanyOnboardingView.as_view(), name="company_onboarding"),
    path("<uuid:id>/onboarding/invites/", CompanyOnboardingInvitesView.as_view(), name="company_onboarding_invites"),
    path("<uuid:id>/settings/", CompanySettingsView.as_view(), name="company_settings"),
    path("<uuid:id>/verify-domain/", CompanyDomainVerifyView.as_view(), name="company_verify_domain"),
]
