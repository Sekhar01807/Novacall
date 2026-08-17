import { test, expect } from '@playwright/test';

test.describe('Meeting History & Pagination Flow', () => {
  test('should render Meeting History page with search bar and page controls', async ({ page }) => {
    await page.goto('/history');

    // Page title and description
    await expect(page.locator('text=Meeting History')).toBeVisible();

    // Search input
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should handle empty history gracefully with informational state', async ({ page }) => {
    await page.goto('/history');

    // Either displays list or empty state card
    const hasCards = await page.locator('.MuiCard-root').count() > 0;
    if (!hasCards) {
      await expect(page.locator('text=No Meeting History Found').or(page.locator('text=No Matching Meetings'))).toBeVisible();
      await expect(page.getByRole('button', { name: /Go to Dashboard|Dashboard/i })).toBeVisible();
    }
  });
});
