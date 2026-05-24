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
  // Treat the test server as a secure origin so navigator.mediaDevices is available
  "--unsafely-treat-insecure-origin-as-secure=http://65.21.111.177",
  "--allow-running-insecure-content",
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

// Intercept WebSocket messages on a page by monkey-patching the global WebSocket
async function installWsInterceptor(page: any, label: string) {
  await page.addInitScript((lbl: string) => {
    // Polyfill navigator.mediaDevices.getUserMedia for insecure (HTTP) origins
    // so CallComponent can get media even without HTTPS.
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        writable: true,
        configurable: true,
      });
    }
    if (!navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = async (constraints: any) => {
        console.log(`[${lbl}][MEDIA] getUserMedia called:`, JSON.stringify(constraints));
        // Return a silent fake MediaStream using AudioContext
        try {
          const ctx = new AudioContext();
          const dest = ctx.createMediaStreamDestination();
          const stream = dest.stream;
          console.log(`[${lbl}][MEDIA] fake stream created, tracks:`, stream.getTracks().length);
          return stream;
        } catch (e) {
          console.error(`[${lbl}][MEDIA] fake stream failed:`, String(e));
          throw e;
        }
      };
    } else {
      const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints: any) => {
        console.log(`[${lbl}][MEDIA] getUserMedia called (real):`, JSON.stringify(constraints));
        try {
          const stream = await origGUM(constraints);
          console.log(`[${lbl}][MEDIA] stream ok, tracks:`, stream.getTracks().length);
          return stream;
        } catch(e) {
          console.error(`[${lbl}][MEDIA] getUserMedia failed:`, String(e));
          throw e;
        }
      };
    }

    const OrigWS = window.WebSocket;
    (window as any).OrigWS = OrigWS;
    (window as any).__wsMessages = [];      // incoming
    (window as any).__wsSent = [];           // outgoing
    (window as any).__wsConnections = [];

    // @ts-ignore
    window.WebSocket = function(url: string, protocols?: any) {
      const ws = new OrigWS(url, protocols);
      (window as any).__wsConnections.push(url);
      console.log(`[${lbl}][WS-OPEN] ${url.split('?')[0]}`);

      // Intercept send to capture outgoing
      const origSend = ws.send.bind(ws);
      ws.send = function(data: any) {
        try {
          const parsed = JSON.parse(data);
          (window as any).__wsSent.push({ url, type: parsed.type, data: parsed.data });
          if (parsed.type && parsed.type.includes('call')) {
            console.log(`[${lbl}][WS-SEND] ${url.split('/').slice(-2,-1)[0]} ← ${parsed.type} | ${JSON.stringify(parsed.data).slice(0, 200)}`);
          }
        } catch {}
        return origSend(data);
      };

      ws.addEventListener('message', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          const entry = { url, type: data.type, data: data.data };
          (window as any).__wsMessages.push(entry);
          if (data.type && (data.type.includes('call') || data.type.includes('channel'))) {
            console.log(`[${lbl}][WS-MSG] ${url.split('/').slice(-2,-1)[0]} → ${data.type} | ${JSON.stringify(data.data).slice(0, 200)}`);
          }
        } catch {}
      });

      ws.addEventListener('close', (evt: CloseEvent) => {
        console.log(`[${lbl}][WS-CLOSE] ${url.split('/').slice(-2,-1)[0]} code=${evt.code}`);
      });

      ws.addEventListener('error', () => {
        console.log(`[${lbl}][WS-ERROR] ${url.split('?')[0]}`);
      });

      return ws;
    };
    // Copy static props
    (window.WebSocket as any).CONNECTING = 0;
    (window.WebSocket as any).OPEN = 1;
    (window.WebSocket as any).CLOSING = 2;
    (window.WebSocket as any).CLOSED = 3;
    Object.setPrototypeOf((window as any).WebSocket, OrigWS);
  }, label);
}

test.describe("Live call E2E", () => {
  test("audio call: caller initiates, receiver gets banner, connect, hang up", async () => {
    const browser = await chromium.launch({ args: MEDIA_ARGS });

    const callerCtx   = await browser.newContext({ permissions: ["microphone", "camera"] });
    const receiverCtx = await browser.newContext({ permissions: ["microphone", "camera"] });
    const callerPage   = await callerCtx.newPage();
    const receiverPage = await receiverCtx.newPage();

    // Install WS interceptors BEFORE any navigation
    await installWsInterceptor(callerPage, "CALLER");
    await installWsInterceptor(receiverPage, "RECEIVER");

    // Forward ALL console from both pages
    callerPage.on("console", (msg) => {
      const text = msg.text();
      const level = msg.type();
      if (text.includes("[CALLER]") || text.includes("[WS") || text.includes("call") || text.includes("Call") || level === "error" || text.includes("media") || text.includes("Failed")) {
        console.log(`[caller-browser][${level}] ${text}`);
      }
    });
    receiverPage.on("console", (msg) => {
      const text = msg.text();
      const level = msg.type();
      if (text.includes("[RECEIVER]") || text.includes("[WS") || text.includes("call") || text.includes("Call") || level === "error") {
        console.log(`[receiver-browser][${level}] ${text}`);
      }
    });
    // Capture page errors (uncaught exceptions)
    callerPage.on("pageerror", (err) => console.log(`[caller-pageerror] ${err.message}`));
    receiverPage.on("pageerror", (err) => console.log(`[receiver-pageerror] ${err.message}`));

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
    await callerPage.waitForTimeout(4000);
    await receiverPage.waitForTimeout(4000);

    // Log which WS connections are established
    const callerWsUrls = await callerPage.evaluate(() => (window as any).__wsConnections || []);
    const receiverWsUrls = await receiverPage.evaluate(() => (window as any).__wsConnections || []);
    console.log(`[info] Caller WS connections: ${JSON.stringify(callerWsUrls)}`);
    console.log(`[info] Receiver WS connections: ${JSON.stringify(receiverWsUrls)}`);

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

    // Also navigate receiver to messages (auto-selects a channel)
    console.log("Step 3b: receiver already on messages, let it settle");
    await receiverPage.waitForTimeout(2000);
    await receiverPage.screenshot({ path: "test-results/03-receiver-settled.png" });

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

    // Wait for calling UI to appear
    await callerPage.waitForTimeout(3000);
    await callerPage.screenshot({ path: "test-results/04-caller-calling.png" });

    // Check for calling overlay
    const callingText = callerPage.locator(':text-matches("calling", "i")').first();
    const callingVisible = await callingText.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[check] Calling UI visible on caller: ${callingVisible}`);

    // Dump WS sent/received messages captured so far
    const callerSent = await callerPage.evaluate(() => (window as any).__wsSent || []);
    const callerMsgs = await callerPage.evaluate(() => (window as any).__wsMessages || []);
    const receiverMsgs = await receiverPage.evaluate(() => (window as any).__wsMessages || []);
    console.log(`[info] Caller SENT call msgs: ${JSON.stringify(callerSent.filter((m: any) => m.type?.includes('call')))}`);
    console.log(`[info] Caller RECEIVED call msgs: ${JSON.stringify(callerMsgs.filter((m: any) => m.type?.includes('call')))}`);
    console.log(`[info] Receiver RECEIVED call msgs so far: ${JSON.stringify(receiverMsgs.filter((m: any) => m.type?.includes('call')))}`);

    // ── 5. Check receiver gets incoming call banner ────────────────────────
    console.log("Step 5: waiting for incoming call on receiver (up to 20s)");
    await receiverPage.screenshot({ path: "test-results/05-receiver-before-poll.png" });

    // The banner shows "Incoming audio call…" text and an "Accept" button
    const incomingBanner = receiverPage.locator('button:has-text("Accept")').first();
    const bannerVisible = await incomingBanner.waitFor({ state: "visible", timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    console.log(`[check] Incoming call banner visible on receiver: ${bannerVisible}`);
    await receiverPage.screenshot({ path: "test-results/05-receiver-incoming-call.png" });

    // Dump ALL receiver WS messages after waiting
    const receiverMsgsAfter = await receiverPage.evaluate(() => (window as any).__wsMessages || []);
    console.log(`[info] Receiver WS messages after wait (${receiverMsgsAfter.length} total):`);
    for (const m of receiverMsgsAfter) {
      console.log(`  [receiver-ws] type=${m.type} url=...${String(m.url).slice(-20)}`);
    }

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

  test("meetings: list, create instant meeting, and start call from detail", async () => {
    const browser = await chromium.launch({ args: MEDIA_ARGS });
    const ctx  = await browser.newContext({ permissions: ["microphone", "camera"] });
    const page = await ctx.newPage();

    await installWsInterceptor(page, "MTG");
    page.on("console", (msg) => {
      const text = msg.text();
      const level = msg.type();
      if (text.includes("[MTG]") || level === "error" || text.includes("call") || text.includes("MEDIA")) {
        console.log(`[mtg-browser][${level}] ${text}`);
      }
    });
    page.on("pageerror", (err) => console.log(`[mtg-pageerror] ${err.message}`));

    await login(page, CALLER.email, CALLER.password);

    // ── 1. Meetings page loads with stats ──────────────────────────────────
    console.log("MTG Step 1: navigate to /meetings");
    await page.goto(`${BASE}/meetings`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/11-meetings-list.png" });

    const h1 = page.locator('h1:has-text("Meetings")').first();
    const pageLoaded = await h1.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[check] Meetings page h1 visible: ${pageLoaded}`);

    // Stats strip: Live now / Today / Upcoming
    const liveNow   = page.locator(':text("Live now")').first();
    const todayCard  = page.locator(':text("Today")').first();
    const upcomingCard = page.locator(':text("Upcoming")').first();
    const statsOk = (await liveNow.isVisible({ timeout: 3000 }).catch(() => false))
      && (await todayCard.isVisible({ timeout: 3000 }).catch(() => false))
      && (await upcomingCard.isVisible({ timeout: 3000 }).catch(() => false));
    console.log(`[check] Stats strip (Live now / Today / Upcoming) visible: ${statsOk}`);

    // Week strip
    const weekStrip = page.locator('text="Mon"').first();
    const weekVisible = await weekStrip.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[check] Week calendar strip visible: ${weekVisible}`);

    // Filter tabs
    const upcomingTab = page.locator('button:has-text("upcoming")').first();
    const tabsVisible = await upcomingTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[check] Status filter tabs visible: ${tabsVisible}`);

    await page.screenshot({ path: "test-results/11-meetings-list.png" });

    // ── 2. Create an instant meeting (redirects to detail) ─────────────────
    console.log("MTG Step 2: click Instant to create a meeting and land on detail page");
    const instantBtn = page.locator('button:has-text("Instant")').first();
    const hasInstant = await instantBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Instant button visible: ${hasInstant}`);

    if (hasInstant) {
      await instantBtn.click();
      // Dialog may open — if there's a title input, fill and submit; otherwise the creation is immediate
      await page.waitForTimeout(1000);
      const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="meeting" i]').first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill("E2E Test Meeting");
        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Start")').last();
        await submitBtn.click();
      }
      // Wait for redirect to /meetings/<id>
      await page.waitForURL(/\/meetings\/[^/]+$/, { timeout: 15000 }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/12-meeting-detail.png" });

    const onDetailPage = /\/meetings\/[^/]/.test(page.url()) && !page.url().endsWith("/meetings/");
    console.log(`[check] On meeting detail page: ${onDetailPage} (url: ${page.url()})`);

    if (!onDetailPage) {
      console.log("⚠️  Did not reach detail page — trying to navigate to existing meeting");
      // Fallback: switch to "all" filter and click first meeting row
      await page.goto(`${BASE}/meetings`);
      await page.waitForTimeout(2000);
      const allTab = page.locator('button:has-text("all")').first();
      if (await allTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await allTab.click();
        await page.waitForTimeout(1000);
      }
      // MeetingRow renders with cursor-pointer and calls router.push on click
      const firstRow = page.locator('[class*="cursor-pointer"]:has-text("Meeting")').first();
      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstRow.click();
        await page.waitForURL(/\/meetings\/[^/]+$/, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
        await page.screenshot({ path: "test-results/12-meeting-detail-fallback.png" });
      }
    }

    // ── 3. Verify detail page content ─────────────────────────────────────
    console.log("MTG Step 3: verify meeting detail content");
    const titleOnDetail = page.locator('h1, h2').first();
    const detailTitleVisible = await titleOnDetail.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Meeting title on detail page: ${detailTitleVisible}`);

    const participantsSection = page.locator(':text("Participants"), :text("Attendees"), :text("Members")').first();
    const participantsVisible = await participantsSection.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[check] Participants section visible: ${participantsVisible}`);

    await page.screenshot({ path: "test-results/13-meeting-detail-content.png" });

    // ── 4. Start call from meeting detail ─────────────────────────────────
    console.log("MTG Step 4: start call from meeting detail");
    // The call button may say "Join", "Start call", "Start video", or have a Phone/Video icon
    const callBtn = page.locator(
      'button:has-text("Join"), button:has-text("Start call"), button:has-text("Start video"), button:has-text("Start audio"), button[title*="call" i], button[title*="video" i]'
    ).first();
    const hasCallBtn = await callBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[check] Call/Join button on meeting detail: ${hasCallBtn}`);
    await page.screenshot({ path: "test-results/14-meeting-call-btn.png" });

    if (hasCallBtn) {
      await callBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "test-results/14-meeting-call-open.png" });

      // Connected screen shows timer; calling screen shows "calling" or "connected"
      const callUi = page.locator(':text-matches("00:0|calling|connected", "i")').first();
      const callVisible = await callUi.isVisible({ timeout: 10000 }).catch(() => false);
      console.log(`[check] Call UI visible after joining from meeting: ${callVisible}`);

      const wsSent = await page.evaluate(() => (window as any).__wsSent || []);
      const callMsgs = wsSent.filter((m: any) => m.type?.includes("call"));
      console.log(`[info] Call WS types sent from meeting: ${JSON.stringify(callMsgs.map((m: any) => m.type))}`);

      // End call
      await hangUp(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/14-meeting-call-ended.png" });
      console.log("[check] Call ended from meeting detail");
    } else {
      // If no button found the meeting may be in the past (not joinable). Log the DOM.
      const btns = await page.locator('button').allTextContents();
      console.log(`[info] Buttons on detail page: ${JSON.stringify(btns.slice(0, 10))}`);
    }

    await browser.close();
  });
});
