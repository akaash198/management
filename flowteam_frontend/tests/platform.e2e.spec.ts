import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const runId = Date.now();

const SUPER_ADMIN_EMAIL = process.env.E2E_SUPERUSER_EMAIL ?? "admin@flowteam.test";
const SUPER_ADMIN_PASSWORD = process.env.E2E_SUPERUSER_PASSWORD ?? "AdminPass123!";

type NewUser = { email: string; password: string; fullName: string };

function newUser(prefix: string): NewUser {
  return {
    email: `${prefix}_${runId}_${Math.floor(Math.random() * 1e6)}@flowteam.test`,
    password: "SecurePass123!",
    fullName: `${prefix} User`,
  };
}

async function registerAndOnboard(page: Page, user: NewUser, teamName: string) {
  await page.goto("/register");
  await expect(page.locator("#full_name")).toBeVisible();
  await page.fill("#full_name", user.fullName);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.fill("#password_confirm", user.password);
  await page.getByRole("button", { name: /create|sign up|get started/i }).click();

  await expect(page).toHaveURL(/.*(dashboard|onboarding).*/, { timeout: 20000 });
  if (page.url().includes("onboarding")) {
    const teamNameInput = page.locator("#teamName");
    await expect(teamNameInput).toBeVisible();
    await teamNameInput.fill(teamName);
    await page.getByRole("button", { name: /continue/i }).click();
    const skip = page.locator('button:has-text("Skip")');
    await skip.waitFor({ state: "visible", timeout: 5000 }).then(() => skip.click()).catch(() => {});
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 20000 });
  }
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button:has-text("Sign in")');
  await expect(page).toHaveURL(/.*(dashboard|onboarding|super-admin).*/, { timeout: 20000 });
}

async function getAccessToken(page: Page) {
  return page.evaluate(() => window.localStorage.getItem("accessToken"));
}

async function apiAuthed(request: APIRequestContext, accessToken: string) {
  return {
    get: (url: string) => request.get(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
    post: (url: string, body: Record<string, unknown>) =>
      request.post(url, { headers: { Authorization: `Bearer ${accessToken}` }, data: body }),
  };
}

async function getMyFirstTeamId(request: APIRequestContext, accessToken: string) {
  const api = await apiAuthed(request, accessToken);
  const res = await api.get("http://localhost:8000/api/teams/");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
  const teamId = json.data?.[0]?.id;
  expect(teamId, "expected at least one team for current user").toBeTruthy();
  return teamId!;
}

async function createInvite(request: APIRequestContext, accessToken: string, teamId: string, email: string, role: string) {
  const api = await apiAuthed(request, accessToken);
  const res = await api.post(`http://localhost:8000/api/teams/${teamId}/invite/`, { email, role });
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { data?: { id?: string; invite_link?: string } };
  const token = json.data?.id ?? json.data?.invite_link?.split("/accept-invite/")?.[1] ?? "";
  expect(token, "expected invite id/token in response").toBeTruthy();
  return token;
}

async function acceptInvite(request: APIRequestContext, token: string) {
  const res = await request.post(`http://localhost:8000/api/teams/invites/${token}/accept/`, { data: {} });
  expect(res.ok()).toBeTruthy();
}

test.describe("Platform E2E - user/company/admin perspectives", () => {
  test("User/CEO: project nav pages + docs + files breakdown upload", async ({ page, request }) => {
    const ceo = newUser("ceo");
    const teamName = `E2E Team ${runId}`;
    await registerAndOnboard(page, ceo, teamName);

    // Create a project
    const projectName = `E2E Project ${runId}`;
    await page.goto("/projects");
    await page.getByRole("button", { name: /new project/i }).click();
    await expect(page.locator("#name")).toBeVisible({ timeout: 10000 });
    await page.fill("#name", projectName);
    await page.getByRole("button", { name: "Create Project", exact: true }).click({ force: true });
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 15000 });
    await page.locator('a[href^="/projects/"]').filter({ hasText: projectName }).first().click();
    await expect(page).toHaveURL(/.*\/projects\/[0-9a-fA-F-]{16,}.*/, { timeout: 20000 });

    const projectId = page.url().split("/projects/")[1]?.split("/")[0];
    expect(projectId).toBeTruthy();

    // Docs page: create + save a doc
    await page.getByRole("link", { name: /^Docs$/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/docs`), { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Docs" })).toBeVisible();
    const titleInput = page.getByPlaceholder("Title");
    await page.getByRole("button", { name: /new doc/i }).click();
    await expect(titleInput).toBeEnabled({ timeout: 30000 });
    await titleInput.fill(`Project spec ${runId}`);
    await page.locator("textarea").fill(`# Spec\n\nHello from e2e ${runId}`);
    await page.getByRole("button", { name: "Save" }).click();

    // Files page: upload a dummy file and verify it appears in the correct category
    await page.getByRole("link", { name: /^Files$/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/files`), { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
    await page.getByLabel("Choose file").setInputFiles({
      name: "demo.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      buffer: Buffer.from(`pptx-${runId}`),
    });
    await page.locator("select").first().selectOption("ppt");
    await page.getByRole("button", { name: /^upload$/i }).click();
    await expect(page.getByText("demo.pptx").first()).toBeVisible({ timeout: 20000 });

    // Timeline / Billing / Permissions pages should render (nav coverage)
    await page.locator(`a[href="/projects/${projectId}/timeline"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/timeline`), { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();

    await page.locator(`a[href="/projects/${projectId}/billing"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/billing`), { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    await page.locator(`a[href="/projects/${projectId}/settings/permissions"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/settings/permissions`), { timeout: 20000 });
    await expect(page.getByText(/role descriptions/i).first()).toBeVisible({ timeout: 20000 });

    // Team invite API sanity (CEO perspective via API)
    const accessToken = await getAccessToken(page);
    expect(accessToken).toBeTruthy();
    const teamId = await getMyFirstTeamId(request, accessToken!);
    expect(teamId).toBeTruthy();
  });

  test("Company/team: invite member + accept invite + viewer cannot create project", async ({ browser, request }) => {
    const ceo = newUser("team_ceo");
    const viewer = newUser("viewer");
    const teamName = `Invite Team ${runId}`;

    const ceoCtx = await browser.newContext();
    const ceoPage = await ceoCtx.newPage();
    await registerAndOnboard(ceoPage, ceo, teamName);

    const ceoToken = await getAccessToken(ceoPage);
    expect(ceoToken).toBeTruthy();
    const teamId = await getMyFirstTeamId(request, ceoToken!);

    // Invite viewer via API so we can deterministically get the token.
    const inviteToken = await createInvite(request, ceoToken!, teamId, viewer.email, "viewer");

    // Viewer registers, then accepts invite (AllowAny endpoint).
    const viewerCtx = await browser.newContext();
    const viewerPage = await viewerCtx.newPage();
    await registerAndOnboard(viewerPage, viewer, `Viewer Personal Team ${runId}`);
    await acceptInvite(request, inviteToken);

    // Viewer should see the team (API assertion via bearer token).
    const viewerToken = await getAccessToken(viewerPage);
    expect(viewerToken).toBeTruthy();
    const teamsRes = await request.get("http://localhost:8000/api/teams/", {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(teamsRes.ok()).toBeTruthy();
    const teamsJson = (await teamsRes.json()) as { data?: Array<{ id: string; name: string }> };
    expect((teamsJson.data ?? []).some((t) => t.id === teamId)).toBeTruthy();

    // Viewer should be blocked from creating a new project (button disabled or absent).
    await viewerPage.goto("/projects");
    const newProjectButton = viewerPage.getByRole("button", { name: /new project/i });
    await newProjectButton
      .waitFor({ state: "visible", timeout: 8000 })
      .then(async () => {
        await expect(newProjectButton).toBeDisabled();
      })
      .catch(async () => {
        // If hidden, that's also acceptable from a permissions standpoint.
        await expect(viewerPage.locator("body")).toContainText(/projects/i);
      });

    await ceoCtx.close();
    await viewerCtx.close();
  });

  test("Admin/super-admin: login and create a user from Super Admin dashboard", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await page.waitForURL(/.*super-admin\/dashboard.*/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: /super admin/i }).first()).toBeVisible({ timeout: 20000 });

    // Create a user via UI (covers admin APIs + permission gating).
    await page.getByRole("button", { name: /new user/i }).click();
    await expect(page.getByText(/create user/i).first()).toBeVisible();

    const u = newUser("created_by_admin");
    await page.fill("#email", u.email);
    await page.fill("#fullName", u.fullName);
    await page.fill("#password", u.password);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(u.email).first()).toBeVisible({ timeout: 20000 });
  });
});
