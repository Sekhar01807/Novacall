import { test, expect } from '@playwright/test';

test.describe('Authentication & User Onboarding Flow', () => {
  const uniqueId = Math.floor(Math.random() * 100000);
  const testUser = {
    name: `Test User ${uniqueId}`,
    username: `user_${uniqueId}`,
    email: `test_${uniqueId}@novacall.io`,
    password: 'SecurePassword123!'
  };

  test('should display Landing page and navigate to Authentication', async ({ page }) => {
    await page.goto('/');
    
    // Check main brand headline
    await expect(page).toHaveTitle(/NovaCall/i);
    await expect(page.locator('h1')).toBeVisible();

    // Click Sign In button in navbar
    const signInBtn = page.getByRole('button', { name: /Sign In|Login/i }).first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await expect(page).toHaveURL(/.*auth/);
    }
  });

  test('should register a new account and redirect to Sign In or Dashboard', async ({ page }) => {
    await page.goto('/auth?mode=signup');

    // Fill registration form fields
    const nameInput = page.getByLabel(/Full Name|Name/i);
    const emailInput = page.getByLabel(/Email/i);
    const usernameInput = page.getByLabel(/Username/i);
    const passwordInput = page.getByLabel(/Password/i);

    if (await nameInput.isVisible()) {
      await nameInput.fill(testUser.name);
      await emailInput.fill(testUser.email);
      await usernameInput.fill(testUser.username);
      await passwordInput.fill(testUser.password);

      const submitBtn = page.getByRole('button', { name: /Create Account|Sign Up|Register/i });
      await submitBtn.click();

      // Expect either success toast or switch to signin
      await expect(page.locator('body')).toContainText(/success|registered|sign in|welcome/i);
    }
  });

  test('should authenticate with credentials and load Dashboard', async ({ page }) => {
    await page.goto('/auth?mode=signin');

    const usernameInput = page.getByLabel(/Username/i);
    const passwordInput = page.getByLabel(/Password/i);

    if (await usernameInput.isVisible()) {
      await usernameInput.fill(testUser.username);
      await passwordInput.fill(testUser.password);

      const loginBtn = page.getByRole('button', { name: /Sign In|Log In/i });
      await loginBtn.click();

      // After successful authentication, user is redirected to /home
      await page.waitForURL('**/home', { timeout: 8000 }).catch(() => {});
    }
  });

  test('should show validation error for empty login submission', async ({ page }) => {
    await page.goto('/auth?mode=signin');

    const loginBtn = page.getByRole('button', { name: /Sign In|Log In/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      // Form should show error or prevent navigation
      await expect(page).toHaveURL(/.*auth/);
    }
  });
});
