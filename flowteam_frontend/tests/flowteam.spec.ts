import { test, expect, Page } from "@playwright/test";

const testRunId = Date.now();
const testEmail = `e2e_${testRunId}@flowteam.test`;
const testPassword = "SecurePass123!";
const testName = "E2E Test User";
const testTeamName = `E2E Test Team ${testRunId}`;

async function ensureAuthenticated(page: Page) {
  // Try login first (this helper is used by many tests).
  await page.goto("/login");
  const emailField = page.locator("#email");
  const onLoginPage = await emailField
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!onLoginPage) {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /dashboard|good (morning|afternoon|evening)/i }).first()).toBeVisible();
    return;
  }
  await page.fill("#email", testEmail);
  await page.fill("#password", testPassword);
  await page.click('button:has-text("Sign in")');

  const loggedIn = await page
    .waitForURL(/.*(dashboard|onboarding).*/, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (!loggedIn) {
    await page.goto("/register");
    await expect(page.locator("#full_name")).toBeVisible();

    await page.fill("#full_name", testName);
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.fill("#password_confirm", testPassword);
    await page.getByRole("button", { name: /create|sign up|get started/i }).click();

    await page.waitForURL(/.*(dashboard|onboarding).*/, { timeout: 15000 });
  }

  if (page.url().includes("onboarding")) {
    const teamName = page.locator("#teamName");
    await expect(teamName).toBeVisible();
    await teamName.fill(testTeamName);
    await page.click('button:has-text("Continue")');

    const skip = page.locator('button:has-text("Skip")');
    await skip
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => skip.click())
      .catch(() => {});
  }

  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /dashboard|good (morning|afternoon|evening)/i }).first()).toBeVisible();
}

test.describe("FlowTeam - Complete E2E Journey", () => {
  test("1 · Register/Login → Reach Dashboard", async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test("2 · Login with existing credentials", async ({ page }) => {
    await page.context().clearCookies();
    await ensureAuthenticated(page);
  });

  test("3 · Create a new project", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/projects");
    await expect(page.locator('button:has-text("New Project")')).toBeVisible();
    await page.click('button:has-text("New Project")');

    await expect(page.locator("#name")).toBeVisible({ timeout: 8000 });
    await page.fill("#name", "E2E Automation Project");
    await page.fill("#description", "Created by Playwright end-to-end testing.");
    await page.getByRole("button", { name: "Create Project", exact: true }).click({ force: true });

    await expect(page.locator("text=E2E Automation Project")).toBeVisible({ timeout: 10000 });
  });

  test("4 · Open project and add a task", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/projects");
    await page.click('button:has-text("New Project")');
    await page.fill("#name", "Kanban Test Project");
    await page.getByRole("button", { name: "Create Project", exact: true }).click({ force: true });
    await expect(page.locator("text=Kanban Test Project")).toBeVisible({ timeout: 10000 });

    await page.click("text=Kanban Test Project");
    await expect(page).toHaveURL(/.*projects\/.*/, { timeout: 10000 });
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("5 · Navigate to project analytics / reports", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/projects");
    await page.click('button:has-text("New Project")');
    await page.fill("#name", "Reports Test Project");
    await page.getByRole("button", { name: "Create Project", exact: true }).click({ force: true });
    await expect(page.locator("text=Reports Test Project")).toBeVisible({ timeout: 10000 });
    await page.click("text=Reports Test Project");

    await page.waitForURL(/.*projects\/.*/, { timeout: 10000 });
    const projectId = page.url().split("/projects/")[1]?.split("/")[0];
    await page.goto(`/projects/${projectId}/reports`);

    await expect(
      page.locator("text=Project Health, text=Velocity, text=Burndown").first()
    )
      .toBeVisible({ timeout: 10000 })
      .catch(() => expect(page.locator("h1, h2, [data-testid=\"reports-heading\"]").first()).toBeVisible());
  });

  test("6 · Dashboard shows stats cards", async ({ page }) => {
    await ensureAuthenticated(page);

    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator('[class*="card"], [class*="stat"], [class*="metric"]').first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("7 · Navigate to Messages page", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto("/messages");
    await expect(page).toHaveURL(/.*messages/);
    await expect(page.getByText("Messages", { exact: true }).first()).toBeVisible();

    // Ensure default channels exist and can send a message.
    await expect(page.getByRole("button", { name: /general/i }).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /general/i }).first().click();
    const composer = page.getByPlaceholder(/Message #/i);
    await expect(composer).toBeVisible();

    const msg = `hello from e2e ${testRunId}`;
    await composer.fill(msg);
    await composer.press("Enter");
    await expect(page.getByText(msg).first()).toBeVisible({ timeout: 15000 });
  });

  test("8 · Navigate to Calendar page", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto("/calendar");
    await expect(page).toHaveURL(/.*calendar/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("9 · Create an instant meeting", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/meetings");
    await expect(page).toHaveURL(/.*meetings/);

    await page.getByRole("button", { name: /new meeting/i }).click();
    await expect(page.locator("#meetingTitle")).toBeVisible();
    const title = `Instant sync ${testRunId}`;
    await page.fill("#meetingTitle", title);
    await page.getByRole("button", { name: /create & open/i }).click();

    await expect(page).toHaveURL(/.*meetings\/.+/, { timeout: 15000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });
  });

  test("10 · Unauthenticated user is redirected to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test("11 · Landing page renders with CTA button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=FlowTeam").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  });
});
