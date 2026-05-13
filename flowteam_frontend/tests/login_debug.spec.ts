import { test, expect } from '@playwright/test';

test('debug login flow', async ({ page }) => {
  // Log console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Log network requests
  page.on('request', request => {
    console.log(`[NETWORK] >> ${request.method()} ${request.url()}`);
  });
  page.on('response', response => {
    console.log(`[NETWORK] << ${response.status()} ${response.url()}`);
  });

  // Navigate to login
  await page.goto('/login');
  console.log('Navigated to login page');

  // Fill credentials
  await page.fill('input[name="email"]', 'sarah@nova-agency.com');
  await page.fill('input[name="password"]', 'Demo@123');
  
  // Setup alert handling
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.message()}`);
    await dialog.accept();
  });

  // Click sign in
  console.log('Clicking sign in...');
  await page.click('button[type="submit"]');

  // Wait for redirect or timeout
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Successfully reached dashboard URL');
  } catch (e) {
    console.log('Failed to reach dashboard URL within 10s');
    console.log('Current URL:', page.url());
  }

  // Wait a bit to see if it redirects back
  await page.waitForTimeout(5000);
  console.log('Final URL after 5s wait:', page.url());
  
  // Take a screenshot of the final state
  await page.screenshot({ path: 'login_debug_final.png' });
});
