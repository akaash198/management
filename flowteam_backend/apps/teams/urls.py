from django.urls import path
from .views import (
    TeamListCreateView, TeamDetailView, TeamMembersView, 
    TeamMemberDetailView, InviteCreateView, AcceptInviteView, TeamCapabilitiesView
)

urlpatterns = [
    path("", TeamListCreateView.as_view(), name="team_list_create"),
    path("<uuid:id>/", TeamDetailView.as_view(), name="team_detail"),
    path("<uuid:id>/members/", TeamMembersView.as_view(), name="team_members"),
    path("<uuid:id>/members/<uuid:uid>/", TeamMemberDetailView.as_view(), name="team_member_detail"),
    path("<uuid:id>/capabilities/", TeamCapabilitiesView.as_view(), name="team_capabilities"),
    path("<uuid:id>/invite/", InviteCreateView.as_view(), name="team_invite"),
    path("invites/<uuid:token>/accept/", AcceptInviteView.as_view(), name="accept_invite"),
]
