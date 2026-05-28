from django.urls import path
from .views import (
    TeamListCreateView, TeamDetailView, TeamMembersView,
    TeamMemberDetailView, InviteCreateView, AcceptInviteView,
)
from .role_views import (
    CustomRoleListCreateView, CustomRoleDetailView,
    MemberCustomRoleView, MemberPermissionsView, TeamCapabilitiesView,
)

urlpatterns = [
    path("", TeamListCreateView.as_view(), name="team_list_create"),
    path("<uuid:id>/", TeamDetailView.as_view(), name="team_detail"),
    path("<uuid:id>/capabilities/", TeamCapabilitiesView.as_view(), name="team_capabilities"),
    path("<uuid:id>/members/", TeamMembersView.as_view(), name="team_members"),
    path("<uuid:id>/members/<uuid:uid>/", TeamMemberDetailView.as_view(), name="team_member_detail"),
    path("<uuid:id>/members/<uuid:uid>/role/", MemberCustomRoleView.as_view(), name="member_custom_role"),
    path("<uuid:id>/members/<uuid:uid>/permissions/", MemberPermissionsView.as_view(), name="member_permissions"),
    path("<uuid:id>/roles/", CustomRoleListCreateView.as_view(), name="custom_role_list_create"),
    path("<uuid:id>/roles/<uuid:role_id>/", CustomRoleDetailView.as_view(), name="custom_role_detail"),
    path("<uuid:id>/invite/", InviteCreateView.as_view(), name="team_invite"),
    path("invites/<uuid:token>/accept/", AcceptInviteView.as_view(), name="accept_invite"),
]
