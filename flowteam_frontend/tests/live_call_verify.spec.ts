/**
 * Live server call verification
 * Runs against http://65.21.111.177 with two browser contexts (caller + receiver)
 */
import { test, expect, chromium } from "@playwright/test";

const BASE = "http://65.21.111.177";

const CALLER  = { email: "sarah@nova-agency.com", password: "Demo@123" };
const RECEIVER = { email: "alex@nova-agency.com",  password: "Demo@123" };

const MEDIA_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "--no-sandbox",
];

async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|messages|onboarding)/, { timeout: 20000 });
  console.log(`[login] ${email} → ${page.url()}`);
}

// Click the hang-up button (red circle with PhoneOff icon)
async function hangUp(page: any) {
  // Connected screen: button has title="End call" and class bg-red-500
  // Calling screen: button has class bg-red-500 (no title)
  const btn = page.locator('button[title="End call"], button.bg-red-500').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  return false;
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
    // Wait for channel list and WebSocket connections to establish
    await callerPage.waitForTimeout(3000);
    await receiverPage.waitForTimeout(3000);
    await callerPage.screenshot({ path: "test-results/02-caller-messages.png" });
    await receiverPage.screenshot({ path: "test-results/02-receiver-messages.png" });

    // ── 3. Caller selects first available channel ──────────────────────────
    console.log("Step 3: caller selects a channel");
    const channelLink = callerPage.locator('[class*="channel"], [class*="Channel"], [href*="channel"]').first();
    if (await channelLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await channelLink.click();
      await callerPage.waitForTimeout(1500);
    }
    await callerPage.screenshot({ path: "test-results/03-caller-channel-selected.png" });

    // ── 4. Caller initiates audio call ─────────────────────────────────────
    console.log("Step 4: initiating audio call");
    // The Huddle button has title="Start audio call" and text "Huddle"
    const huddleBtn = callerPage.locator('button[title="Start audio call"], button:has-text("Huddle")').first();
    const hasHuddle = await huddleBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasHuddle) {
      await huddleBtn.click();
    } else {
      console.log("⚠️  No call button found — screenshotting for inspection");
      await callerPage.screenshot({ path: "test-results/04-no-call-button.png" });
    }

    // Wait for calling UI to appear (the "Audio calling..." overlay)
    await callerPage.waitForTimeout(2000);
    await callerPage.screenshot({ path: "test-results/04-caller-calling.png" });

    // Check for calling overlay — matches "Audio calling…" (unicode ellipsis)
    const callingText = callerPage.locator(':text-matches("calling", "i")').first();
    const callingVisible = await callingText.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[check] Calling UI visible on caller: ${callingVisible}`);

    // ── 5. Check receiver gets incoming call banner ────────────────────────
    console.log("Step 5: waiting for incoming call on receiver (up to 15s)");
    // Give WebSocket + polling time to deliver the call.started event
    // After our fix: channel WS delivers immediately + 2s polling fallback
    await receiverPage.screenshot({ path: "test-results/05-receiver-before-poll.png" });

    // The banner shows "Incoming audio call…" text and an "Accept" button
    const incomingBanner = receiverPage.locator('button:has-text("Accept")').first();
    const bannerVisible = await incomingBanner.waitFor({ state: "visible", timeout: 18000 })
      .then(() => true)
      .catch(() => false);
    console.log(`[check] Incoming call banner visible on receiver: ${bannerVisible}`);
    await receiverPage.screenshot({ path: "test-results/05-receiver-incoming-call.png" });

    if (bannerVisible) {
      // ── 6. Receiver accepts the call ──────────────────────────────────────
      console.log("Step 6: receiver accepts call");
      await incomingBanner.click();
      await receiverPage.waitForTimeout(3000);
      await receiverPage.screenshot({ path: "test-results/06-receiver-accepted.png" });
      await callerPage.screenshot({ path: "test-results/06-caller-after-accept.png" });

      // Check call connected: look for duration timer (00:0x format) or "connected" text
      const connectedIndicator = receiverPage.locator(':text-matches("00:0[0-9]")').first();
      const connected = await connectedIndicator.isVisible({ timeout: 10000 }).catch(() => false);
      console.log(`[check] Call connected (timer visible on receiver): ${connected}`);

      // ── 7. Test mute toggle on caller ─────────────────────────────────────
      console.log("Step 7: testing mute toggle on caller");
      // The mute button has title="Mute" or title="Unmute"
      const muteBtn = callerPage.locator('button[title="Mute"], button[title="Unmute"]').first();
      const hasMute = await muteBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasMute) {
        await muteBtn.click();
        await callerPage.waitForTimeout(500);
        await callerPage.screenshot({ path: "test-results/07-caller-muted.png" });
        console.log("[check] Mute toggled");
        await muteBtn.click(); // unmute
        await callerPage.waitForTimeout(500);
      } else {
        console.log("⚠️  Mute button not found");
        await callerPage.screenshot({ path: "test-results/07-no-mute-btn.png" });
      }

      // ── 8. Receiver ends call ──────────────────────────────────────────────
      console.log("Step 8: receiver ends call");
      const ended = await hangUp(receiverPage);
      await receiverPage.waitForTimeout(2000);
      await receiverPage.screenshot({ path: "test-results/08-receiver-ended.png" });
      await callerPage.screenshot({ path: "test-results/08-caller-after-end.png" });
      console.log(`[check] Call ended by receiver: ${ended}`);

      if (ended) {
        // Verify caller UI also dismissed
        const callerCallStillOpen = await callerPage.locator(':text-matches("calling", "i")').first().isVisible({ timeout: 4000 }).catch(() => false);
        console.log(`[check] Caller call UI still open after receiver hung up: ${callerCallStillOpen}`);
      }
    } else {
      console.log("⚠️  Incoming call banner did not appear — cleaning up caller side");
      await hangUp(callerPage);
    }

    // ── 9. Check meetings page ────────────────────────────────────────────
    console.log("Step 9: checking meetings page");
    await callerPage.goto(`${BASE}/meetings`);
    await callerPage.waitForTimeout(2000);
    await callerPage.screenshot({ path: "test-results/09-meetings-page.png" });
    const meetingsLoaded = await callerPage.locator('h1:has-text("Meetings"), h2:has-text("Meetings")').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Meetings page loaded: ${meetingsLoaded}`);

    await browser.close();
  });

  test("video call: initiation and UI check", async () => {
    const browser = await chromium.launch({ args: MEDIA_ARGS });
    const ctx  = await browser.newContext({ permissions: ["microphone", "camera"] });
    const page = await ctx.newPage();

    await login(page, CALLER.email, CALLER.password);
    await page.goto(`${BASE}/messages`);
    await page.waitForTimeout(3000);

    // Select channel
    const ch = page.locator('[class*="channel"]').first();
    if (await ch.isVisible({ timeout: 3000 }).catch(() => false)) await ch.click();
    await page.waitForTimeout(1000);

    // The video call button has title="Start video call"
    const videoBtn = page.locator('button[title="Start video call"]').first();
    const hasVideo = await videoBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Video call button visible: ${hasVideo}`);
    await page.screenshot({ path: "test-results/10-video-btn.png" });

    if (hasVideo) {
      await videoBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-results/10-video-calling.png" });

      const callUI = page.locator(':text-matches("calling", "i")').first();
      const visible = await callUI.isVisible({ timeout: 6000 }).catch(() => false);
      console.log(`[check] Video call UI appeared: ${visible}`);

      // End it
      await hangUp(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/10-video-ended.png" });
    }

    await browser.close();
  });
});
