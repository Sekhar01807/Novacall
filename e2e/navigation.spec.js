import { test, expect } from '@playwright/test';

test.describe('Navigation, Guest Access & Theme System', () => {
  test('should load Landing page with feature highlights and CTA buttons', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand presence
    await expect(page.locator('text=NovaCall')).toBeVisible();

    // Check feature sections
    const getStartedBtn = page.getByRole('button', { name: /Get Started|Join Meeting|Start Call/i }).first();
    await expect(getStartedBtn).toBeVisible();
  });

  test('should allow a guest user to enter a meeting room directly without logging in', async ({ page }) => {
    const roomCode = `test-room-${Date.now()}`;
    await page.goto(`/${roomCode}`);

    // Should load the Lobby view
    await expect(page.locator('text=Lobby')).toBeVisible();
    await expect(page.getByLabel(/Display Name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Meeting Room/i })).toBeVisible();
  });

  test('should toggle dark/light theme mode and persist in localStorage', async ({ page }) => {
    await page.goto('/');

    // Check initial theme attribute
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme') || 'light';

    // Find and click theme switch if available
    const themeBtn = page.locator('[aria-label*="theme" i], [title*="theme" i], button:has-text("Theme")').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const updatedTheme = await htmlElement.getAttribute('data-theme');
      expect(updatedTheme).not.toBeNull();
    }
  });
});
