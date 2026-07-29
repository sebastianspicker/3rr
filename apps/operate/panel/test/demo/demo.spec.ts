/** Browser regression coverage for the static, fixture-backed project-path demo. */
import { expect, test, type Page } from '@playwright/test';

interface BrowserAudit {
  consoleErrors: string[];
  failedResponses: string[];
  requests: string[];
}

function auditBrowser(page: Page): BrowserAudit {
  const audit: BrowserAudit = { consoleErrors: [], failedResponses: [], requests: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') audit.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => audit.consoleErrors.push(error.message));
  page.on('request', (request) => audit.requests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      audit.failedResponses.push(`${String(response.status())} ${response.url()}`);
    }
  });
  return audit;
}

async function expectHealthyBrowser(audit: BrowserAudit): Promise<void> {
  expect(audit.consoleErrors).toEqual([]);
  expect(audit.failedResponses).toEqual([]);
  expect(audit.requests.some((url) => url.includes('/api/'))).toBe(false);
  expect(
    audit.requests.every((url) => {
      const requestUrl = new URL(url);
      return requestUrl.hostname === '127.0.0.1' && requestUrl.pathname.startsWith('/3rr/');
    })
  ).toBe(true);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = (await page.evaluate(
    '({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })'
  )) as { clientWidth: number; scrollWidth: number };
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('Fleet and Manage provide complete in-memory demo interactions', async ({ page }) => {
  const audit = auditBrowser(page);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/3rr/');

  await expect(page).toHaveTitle('3RR - Static Fleet Demo');
  await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Server 1' })).toBeVisible();
  await expect(page.getByText('203.0.113.10:27015')).toBeVisible();
  await expect(page.getByText('Status unknown')).toBeVisible();
  await expect(page.getByText('Not observed')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(true);

  await page.getByRole('button', { name: 'Reconnect' }).click();
  await expect(page.locator('#demo-action-status')).toContainText(
    'No RCON connection was attempted'
  );

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toContainText('fixture will remain available');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Simulate delete' })).toBeFocused();
  await page.getByRole('button', { name: 'Simulate delete' }).click();
  await expect(page.locator('#demo-action-status')).toContainText('fixture server was not removed');

  await page.getByRole('link', { name: /Manage 203\.0\.113\.10/ }).click();
  await expect(page).toHaveURL(/\/3rr\/manage\/$/);
  await expect(page).toHaveTitle('3RR - Static Manage Demo');
  await expect(page.getByRole('heading', { name: 'Server 1', level: 1 })).toBeVisible();
  await expect(page.locator('#live-map')).toHaveText('de_ancient');
  await expect(page.locator('#live-players')).toHaveText('8/12');
  await expect(page.locator('#live-bots')).toHaveText('2');
  await expect(page.locator('#playersList .player-row')).toHaveCount(4);
  await expect(page.locator('#rconHistoryList .demo-history-entry')).toHaveCount(3);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Casual' }).click();
  await expect(page.getByRole('button', { name: 'deathmatch' })).toBeVisible();
  await page.getByRole('button', { name: 'deathmatch' }).click();
  await page.getByRole('button', { name: 'Apply to server' }).click();
  await expect(page.locator('#truth-requested-detail')).toContainText('casual / deathmatch');
  await expect(page.locator('#demo-action-status')).toContainText('No commands were sent');

  await page.locator('#rconInput').fill('status');
  await page.getByRole('button', { name: 'Send command' }).click();
  await expect(page.locator('#rconResultText')).toContainText('No RCON connection was made');
  await expect(page.locator('#demo-action-status')).toContainText('No command was sent');

  await page.locator('#playerSearch').fill('Emilia');
  await expect(page.locator('#playersList .player-row')).toHaveCount(1);
  await page.locator('#playerSearch').fill('');
  await page
    .locator('#playersList .player-row')
    .first()
    .getByRole('button', { name: 'Kick' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('fixture player will remain listed');
  await page.getByRole('button', { name: 'Simulate kick' }).click();
  await expect(page.locator('#demo-action-status')).toContainText('No command was sent');

  await page.getByRole('button', { name: 'Reconnect' }).click();
  await expect(page.locator('#demo-action-status')).toContainText(
    'No RCON connection was attempted'
  );
  await page.locator('#rconInput').fill('hostname');
  await page.getByRole('button', { name: 'Send command' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#rconHistoryList .demo-history-entry')).toHaveCount(3);
  await expect(page.locator('#rconInput')).toHaveValue('');
  await expect(page.locator('#truth-requested-detail')).toHaveText(
    'competitive / competitive / de_ancient'
  );
  await expect(page.locator('#demo-action-status')).toContainText('Nothing was persisted');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  await expectHealthyBrowser(audit);
});

test('mobile navigation, focus, dialogs, and layout remain usable', async ({ page }) => {
  const audit = auditBrowser(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/3rr/');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Manage', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expectNoHorizontalOverflow(page);

  await page.goto('/3rr/manage/');
  await expect(page.locator('#playersList .player-row')).toHaveCount(4);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Restart round' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restart round' })).toBeFocused();

  await expectHealthyBrowser(audit);
});
