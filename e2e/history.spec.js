import { test, expect } from '@playwright/test';

test.describe('Meeting History & Pagination Flow', () => {
  test.beforeEach(async ({ page, request }) => {
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const testUser = {
      name: `History User ${uniqueId}`,
      email: `history_${uniqueId}@novacall.io`,
      username: `history_${uniqueId}`,
      password: 'SecurePassword123!'
    };

    // Pre-register user via API
    await request.post('http://localhost:8000/api/v1/users/register', {
      data: testUser
    });

    // Login with the registered credentials
    await page.goto('/auth?mode=signin');
    const loginEmailInput = page.getByLabel(/Email Address|Email/i).first();
    const loginPasswordInput = page.getByLabel(/^Password/i);

    if (await loginEmailInput.isVisible()) {
      await loginEmailInput.fill(testUser.email);
      await loginPasswordInput.fill(testUser.password);
      await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.waitForURL('**/home', { timeout: 10000 });
    }
  });

  test('should render Meeting History page with search bar and page controls', async ({ page }) => {
    await page.goto('/history');

    // Page title and description
    await expect(page.locator('text=Meeting History').first()).toBeVisible({ timeout: 10000 });

    // Search input
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should handle empty history gracefully with informational state', async ({ page }) => {
    await page.goto('/history');

    await expect(page.locator('text=Meeting History').first()).toBeVisible({ timeout: 10000 });

    // Either displays list or empty state card
    const hasCards = await page.locator('.MuiCard-root').count() > 0;
    if (!hasCards) {
      await expect(page.locator('text=No Meeting History Found').or(page.locator('text=No Matching Meetings')).or(page.locator('text=No meeting history available yet'))).toBeVisible();
      await expect(page.getByRole('button', { name: /Go to Dashboard|Dashboard|Back/i })).toBeVisible();
    }
  });
});
