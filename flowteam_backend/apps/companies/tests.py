from __future__ import annotations

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.companies.models import Company, CompanyMember
from apps.teams.models import Team
from apps.projects.models import Project, ProjectDocument

User = get_user_model()

class SuperAdminIsolationTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(email="admin@platform.com", password="password123", full_name="Platform Admin")
        self.ceo_user = User.objects.create_user(email="ceo@acme.com", password="password123", full_name="Acme CEO")
        self.employee_user = User.objects.create_user(email="employee@acme.com", password="password123", full_name="John Employee")

        self.company = Company.objects.create(
            name="Acme Inc.",
            slug="acme",
            ceo=self.ceo_user,
            website="https://acme.inc",
            settings_json={"ai_enabled": True, "byok_secret": "sensitive-api-token-xyz"}
        )

        CompanyMember.objects.create(company=self.company, user=self.ceo_user, role=CompanyMember.CEO)
        CompanyMember.objects.create(company=self.company, user=self.employee_user, role=CompanyMember.MEMBER)

        self.team = Team.objects.create(
            name="Engineering Team",
            company=self.company,
            created_by=self.ceo_user
        )

        self.project = Project.objects.create(
            name="Project Alpha",
            team=self.team,
            created_by=self.ceo_user
        )

        self.document = ProjectDocument.objects.create(
            project=self.project,
            title="Confidential Privacy Policy",
            content="Sensitive company data...",
            created_by=self.ceo_user
        )

    def test_company_detail_masking_for_superuser(self):
        """Super Admin gets masked CEO details, restricted website, and stripped settings."""
        client = APIClient()
        client.force_authenticate(user=self.superuser)

        url = f"/api/companies/{self.company.id}/"
        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        data = response.data["data"]
        # CEO details are masked
        self.assertEqual(data["ceo"]["email"], "c*o@acme.com")
        self.assertEqual(data["ceo"]["full_name"], "A**e C*O")
        # Website is restricted
        self.assertEqual(data["website"], "[RESTRICTED]")
        # settings_json is stripped of sensitive keys
        self.assertTrue(data["settings_json"]["ai_enabled"])
        self.assertNotIn("byok_secret", data["settings_json"])

    def test_company_detail_unmasked_for_ceo(self):
        """Company members (like the CEO) get plaintext details and full settings."""
        client = APIClient()
        client.force_authenticate(user=self.ceo_user)

        url = f"/api/companies/{self.company.id}/"
        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        data = response.data["data"]
        # Plaintext details
        self.assertEqual(data["ceo"]["email"], "ceo@acme.com")
        self.assertEqual(data["ceo"]["full_name"], "Acme CEO")
        self.assertEqual(data["website"], "https://acme.inc")
        self.assertEqual(data["settings_json"]["byok_secret"], "sensitive-api-token-xyz")

    def test_superuser_blocked_from_ai_settings(self):
        """Super Admin is denied access to view or edit AI/BYOK settings views."""
        client = APIClient()
        client.force_authenticate(user=self.superuser)

        url = f"/api/companies/{self.company.id}/ai-settings/"
        response = client.get(url)
        self.assertEqual(response.status_code, 403)

        response = client.patch(url, {"integration_mode": "byok"})
        self.assertEqual(response.status_code, 403)

    def test_member_masking_for_superuser(self):
        """Super Admin sees masked names and emails in the company member roster."""
        client = APIClient()
        client.force_authenticate(user=self.superuser)

        url = f"/api/companies/{self.company.id}/members/"
        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        members = response.data["data"]
        ceo_member = next(m for m in members if m["user"]["id"] == str(self.ceo_user.id))
        employee_member = next(m for m in members if m["user"]["id"] == str(self.employee_user.id))

        self.assertEqual(ceo_member["user"]["email"], "c*o@acme.com")
        self.assertEqual(ceo_member["user"]["full_name"], "A**e C*O")
        self.assertEqual(employee_member["user"]["email"], "e******e@acme.com")
        self.assertEqual(employee_member["user"]["full_name"], "J**n E******e")

    def test_superuser_cannot_access_project_documents(self):
        """Super Admin cannot fetch or view documents belonging to a company's project."""
        client = APIClient()
        client.force_authenticate(user=self.superuser)

        # Retrieve documents list
        url = "/api/projects/documents/"
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 0) # empty list

        # Direct retrieve returns 404 since it falls outside superuser queryset scope
        detail_url = f"/api/projects/documents/{self.document.id}/"
        response = client.get(detail_url)
        self.assertEqual(response.status_code, 404)
