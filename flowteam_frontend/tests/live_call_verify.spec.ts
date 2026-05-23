/**
 * Live server call verification
 * Runs against http://65.21.111.177 with two browser contexts (caller + receiver)
 */
import { test, expect, chromium } from "@playwright/test";

const BASE = "http://65.21.111.177";

// Credentials — update if these don't exist on the server
const CALLER  = { email: "sarah@nova-agency.com", password: "Demo@123" };
const RECEIVER = { email: "alex@nova-agency.com", password: "Demo@123" };

// Fake media args so getUserMedia doesn't prompt / fail in headless
const MEDIA_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "--no-sandbox",
];

async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"], #email, input[name="email"]', { timeout: 15000 });
  await page.fill('input[type="email"], #email, input[name="email"]', email);
  await page.fill('input[type="password"], #password, input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|messages|onboarding)/, { timeout: 20000 });
  console.log(`[login] ${email} → ${page.url()}`);
}

test.describe("Live call E2E", () => {
  test("audio call: caller initiates, receiver gets banner, connect, hang up", async () => {
    const browser = await chromium.launch({ args: MEDIA_ARGS });

    const callerCtx   = await browser.newContext({ permissions: ["microphone", "camera"] });
    const receiverCtx = await browser.newContext({ permissions: ["microphone", "camera"] });
    const callerPage   = await callerCtx.newPage();
    const receiverPage = await receiverCtx.newPage();

    // ── 1. Login both users ────────────────────────────────────────────────
    console.log("Step 1: logging in both users");
    await Promise.all([
      login(callerPage, CALLER.email, CALLER.password),
      login(receiverPage, RECEIVER.email, RECEIVER.password),
    ]);
    await callerPage.screenshot({ path: "test-results/01-caller-logged-in.png" });
    await receiverPage.screenshot({ path: "test-results/01-receiver-logged-in.png" });

    // ── 2. Both navigate to Messages ───────────────────────────────────────
    console.log("Step 2: both navigate to /messages");
    await Promise.all([
      callerPage.goto(`${BASE}/messages`),
      receiverPage.goto(`${BASE}/messages`),
    ]);
    await callerPage.waitForURL(/\/messages/, { timeout: 15000 });
    await receiverPage.waitForURL(/\/messages/, { timeout: 15000 });
    // Wait for channel list to load
    await callerPage.waitForTimeout(2000);
    await receiverPage.waitForTimeout(2000);
    await callerPage.screenshot({ path: "test-results/02-caller-messages.png" });
    await receiverPage.screenshot({ path: "test-results/02-receiver-messages.png" });

    // ── 3. Caller selects first available channel ──────────────────────────
    console.log("Step 3: caller selects a channel");
    // Try to click a channel in the sidebar
    const channelLink = callerPage.locator('[class*="channel"], [class*="Channel"], [href*="channel"]').first();
    const hasChannel = await channelLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasChannel) {
      await channelLink.click();
      await callerPage.waitForTimeout(1500);
    }
    await callerPage.screenshot({ path: "test-results/03-caller-channel-selected.png" });

    // ── 4. Caller initiates audio call ─────────────────────────────────────
    console.log("Step 4: initiating audio call");
    // Look for the audio call / phone button in the chat header
    const audioCallBtn = callerPage.locator('button[title*="udio"], button[aria-label*="udio"], button[title*="call"], button[aria-label*="call"]').first();
    const hasBtn = await audioCallBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBtn) {
      // Try the huddle / phone icon in the toolbar
      const phoneBtn = callerPage.locator('svg[class*="Phone"], [data-icon="phone"]').first();
      const hasSvg = await phoneBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasSvg) await phoneBtn.click();
      else {
        console.log("⚠️  No audio call button found — taking screenshot for inspection");
        await callerPage.screenshot({ path: "test-results/04-no-call-button.png" });
      }
    } else {
      await audioCallBtn.click();
    }

    await callerPage.waitForTimeout(2000);
    await callerPage.screenshot({ path: "test-results/04-caller-calling.png" });

    // Verify calling UI appears on caller side
    const callingUI = callerPage.locator('text=/calling/i, text=/Audio calling/i, [class*="CallComponent"], [role="dialog"]').first();
    const callingVisible = await callingUI.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[check] Calling UI visible on caller: ${callingVisible}`);

    // ── 5. Check receiver gets incoming call banner ────────────────────────
    console.log("Step 5: waiting for incoming call on receiver (up to 10s)");
    await receiverPage.waitForTimeout(3000); // give WebSocket time
    await receiverPage.screenshot({ path: "test-results/05-receiver-before-poll.png" });

    // Wait up to 10s total for incoming call banner (polling happens every 5s)
    const incomingBanner = receiverPage.locator('text=/incoming/i, text=/Incoming/i, button:has-text("Accept")').first();
    const bannerVisible = await incomingBanner.waitFor({ state: "visible", timeout: 12000 })
      .then(() => true)
      .catch(() => false);
    console.log(`[check] Incoming call banner visible on receiver: ${bannerVisible}`);
    await receiverPage.screenshot({ path: "test-results/05-receiver-incoming-call.png" });

    if (bannerVisible) {
      // ── 6. Receiver accepts the call ──────────────────────────────────────
      console.log("Step 6: receiver accepts call");
      const acceptBtn = receiverPage.locator('button:has-text("Accept")').first();
      await acceptBtn.click();
      await receiverPage.waitForTimeout(3000);
      await receiverPage.screenshot({ path: "test-results/06-receiver-accepted.png" });
      await callerPage.screenshot({ path: "test-results/06-caller-after-accept.png" });

      // Check if call connected (look for connected status, duration timer, or call UI)
      const connectedIndicator = receiverPage.locator('text=/connected/i, text=/00:0/').first();
      const connected = await connectedIndicator.isVisible({ timeout: 8000 }).catch(() => false);
      console.log(`[check] Call connected indicator visible: ${connected}`);

      // ── 7. Test mute toggle ───────────────────────────────────────────────
      console.log("Step 7: testing mute toggle");
      const muteBtn = callerPage.locator('button[title*="ute"], button[aria-label*="ute"], [class*="mute"], svg[class*="Mic"]').first();
      const hasMute = await muteBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasMute) {
        await muteBtn.click();
        await callerPage.waitForTimeout(500);
        await callerPage.screenshot({ path: "test-results/07-caller-muted.png" });
        console.log("[check] Mute toggled");
        // Unmute
        await muteBtn.click();
        await callerPage.waitForTimeout(500);
      }

      // ── 8. Receiver ends call ─────────────────────────────────────────────
      console.log("Step 8: receiver ends call");
      const endBtn = receiverPage.locator('button[title*="end"], button[aria-label*="end"], [class*="phone-off"], svg[class*="PhoneOff"]').first();
      const hasEnd = await endBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasEnd) {
        await endBtn.click();
        await receiverPage.waitForTimeout(2000);
        await receiverPage.screenshot({ path: "test-results/08-receiver-ended.png" });
        await callerPage.screenshot({ path: "test-results/08-caller-after-end.png" });
        console.log("[check] Call ended by receiver");

        // Verify caller UI also dismissed
        const callerCallStillOpen = await callerPage.locator('[role="dialog"], [class*="CallComponent"]').first().isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`[check] Caller call UI still open after receiver hung up: ${callerCallStillOpen}`);
      }
    } else {
      console.log("⚠️  Incoming call banner did not appear — will try Decline path instead");
      // End the call from caller side to clean up
      const endBtn = callerPage.locator('button[aria-label*="end"], svg[class*="PhoneOff"]').first();
      if (await endBtn.isVisible({ timeout: 2000 }).catch(() => false)) await endBtn.click();
    }

    // ── 9. Check meetings page ────────────────────────────────────────────
    console.log("Step 9: checking meetings page");
    await callerPage.goto(`${BASE}/meetings`);
    await callerPage.waitForTimeout(2000);
    await callerPage.screenshot({ path: "test-results/09-meetings-page.png" });
    const meetingsLoaded = await callerPage.locator('text=/meeting/i, text=/Meeting/i, text=/schedule/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Meetings page loaded: ${meetingsLoaded}`);

    await browser.close();
  });

  test("video call: initiation and UI check", async () => {
    const browser = await chromium.launch({ args: MEDIA_ARGS });
    const ctx  = await browser.newContext({ permissions: ["microphone", "camera"] });
    const page = await ctx.newPage();

    await login(page, CALLER.email, CALLER.password);
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(2000);

    // Select channel
    const ch = page.locator('[class*="channel"]').first();
    if (await ch.isVisible({ timeout: 3000 }).catch(() => false)) await ch.click();
    await page.waitForTimeout(1000);

    // Look for video call button
    const videoBtn = page.locator('button[title*="ideo"], button[aria-label*="ideo"], svg[class*="Video"]').first();
    const hasVideo = await videoBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Video call button visible: ${hasVideo}`);
    await page.screenshot({ path: "test-results/10-video-btn.png" });

    if (hasVideo) {
      await videoBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-results/10-video-calling.png" });

      const callUI = page.locator('[role="dialog"], text=/Video calling/i, text=/calling/i').first();
      const visible = await callUI.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`[check] Video call UI appeared: ${visible}`);

      // End it
      const endBtn = page.locator('svg[class*="PhoneOff"]').first();
      if (await endBtn.isVisible({ timeout: 2000 }).catch(() => false)) await endBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/10-video-ended.png" });
    }

    await browser.close();
  });
});
