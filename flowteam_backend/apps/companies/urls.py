from django.urls import path
from .views import CompanyListCreateView, CompanyDetailView, CompanyTeamsView, CompanyAssignTeamView

urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="company_list_create"),
    path("<uuid:id>/", CompanyDetailView.as_view(), name="company_detail"),
    path("<uuid:id>/teams/", CompanyTeamsView.as_view(), name="company_teams"),
    path("<uuid:id>/assign-team/", CompanyAssignTeamView.as_view(), name="company_assign_team"),
]
