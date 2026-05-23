import { test, expect, Page } from "@playwright/test";

const testRunId = Date.now();
const testEmail = `e2e_meeting_${testRunId}@flowteam.test`;
const testPassword = "SecurePass123!";
const testName = "E2E Meeting User";
const testTeamName = `E2E Meeting Team ${testRunId}`;

async function ensureAuthenticated(page: Page) {
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

test.describe("FlowTeam - Meeting Calling and WebRTC E2E", () => {
  test("Should join meeting call, sit in the room alone, and leave call", async ({ page }) => {
    // 1. Authenticate and reach dashboard
    await ensureAuthenticated(page);

    // 2. Go to meetings page
    await page.goto("/meetings");
    await expect(page).toHaveURL(/.*meetings/);

    // 3. Create a new meeting
    await page.getByRole("button", { name: /instant/i }).first().click();
    await expect(page.locator("#meetingTitle")).toBeVisible();
    const title = `E2E Call Meeting ${testRunId}`;
    await page.fill("#meetingTitle", title);
    await page.getByRole("button", { name: /create & open/i }).click();

    // 4. Wait for meeting details page to load
    await expect(page).toHaveURL(/.*meetings\/.+/, { timeout: 15000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });

    // 5. Start call
    const startCallButton = page.getByRole("button", { name: /Start call/i }).first();
    await expect(startCallButton).toBeVisible();
    await startCallButton.click();

    // 6. Verify CallComponent is open and transitions to connected immediately
    // Wait for the hangup button ("End call") to be visible.
    const hangupButton = page.getByTitle("End call");
    await expect(hangupButton).toBeVisible({ timeout: 15000 });

    // Ensure we are NOT on the calling screen (e.g. no "calling..." or "connecting..." status text)
    const callingText = page.locator("text=/calling|connecting/i");
    await expect(callingText).not.toBeVisible();

    // Wait 5 seconds to verify no answer timeout occurs (normal timeout is 45s)
    await page.waitForTimeout(5000);

    // Hover/move mouse over the page to wake up controls overlay
    await page.mouse.move(400, 300);
    await expect(hangupButton).toBeVisible();

    // 7. Click hangup button
    await hangupButton.click();

    // 8. Verify call modal closes
    await expect(hangupButton).not.toBeVisible({ timeout: 10000 });
    await expect(startCallButton).toBeVisible({ timeout: 10000 });
  });
});
