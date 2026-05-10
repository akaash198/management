from django.urls import path
from .views import (
    CompanyListCreateView,
    CompanyDetailView,
    CompanyMembersView,
    CompanyMemberDetailView,
    CompanyInviteListCreateView,
    CompanyInviteDeleteView,
    CompanyInviteAcceptView,
    CompanyCapabilitiesView,
    CompanyTeamsView,
    CompanyAssignTeamView,
    CompanyOnboardingView,
    CompanyOnboardingInvitesView,
    CompanySettingsView,
    CompanyDomainVerifyView,
)

urlpatterns = [
    # Company CRUD
    path("", CompanyListCreateView.as_view(), name="company_list_create"),
    path("<uuid:id>/", CompanyDetailView.as_view(), name="company_detail"),

    # Members
    path("<uuid:id>/members/", CompanyMembersView.as_view(), name="company_members"),
    path("<uuid:id>/members/<uuid:uid>/", CompanyMemberDetailView.as_view(), name="company_member_detail"),

    # Invites
    path("<uuid:id>/invites/", CompanyInviteListCreateView.as_view(), name="company_invites"),
    path("<uuid:id>/invites/<uuid:invite_id>/", CompanyInviteDeleteView.as_view(), name="company_invite_delete"),
    path("invites/<str:token>/accept/", CompanyInviteAcceptView.as_view(), name="company_invite_accept"),

    # Capabilities
    path("<uuid:id>/capabilities/", CompanyCapabilitiesView.as_view(), name="company_capabilities"),

    # Teams
    path("<uuid:id>/teams/", CompanyTeamsView.as_view(), name="company_teams"),
    path("<uuid:id>/assign-team/", CompanyAssignTeamView.as_view(), name="company_assign_team"),

    # Onboarding wizard
    path("<uuid:id>/onboarding/", CompanyOnboardingView.as_view(), name="company_onboarding"),
    path("<uuid:id>/onboarding/invites/", CompanyOnboardingInvitesView.as_view(), name="company_onboarding_invites"),

    # Settings & domain
    path("<uuid:id>/settings/", CompanySettingsView.as_view(), name="company_settings"),
    path("<uuid:id>/verify-domain/", CompanyDomainVerifyView.as_view(), name="company_verify_domain"),
]
