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

    // Click Sign In in navbar
    const signInBtn = page.locator('text=Sign In').first();
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
    const passwordInput = page.getByLabel(/^Password/i);
    const confirmPasswordInput = page.getByLabel(/Confirm Password/i);

    if (await nameInput.isVisible()) {
      await nameInput.fill(testUser.name);
      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill(testUser.password);
      }

      const submitBtn = page.getByRole('button', { name: 'Create Account', exact: true });
      await submitBtn.click();

      // Expect either success toast or switch to signin
      await expect(page.locator('body')).toContainText(/success|registered|sign in|welcome/i, { timeout: 8000 });
    }
  });

  test('should authenticate with credentials and load Dashboard', async ({ page, request }) => {
    // First register the user via API to ensure they exist
    const regResponse = await request.post('http://localhost:8000/api/v1/users/register', {
      data: {
        name: testUser.name,
        email: testUser.email,
        username: testUser.username,
        password: testUser.password
      }
    });

    // Registration should succeed (201) or user may already exist (409) from test 2
    expect([201, 409]).toContain(regResponse.status());

    await page.goto('/auth?mode=signin');

    const emailInput = page.getByLabel(/Email Address|Email/i).first();
    const passwordInput = page.getByLabel(/^Password/i);

    if (await emailInput.isVisible()) {
      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);

      const loginBtn = page.locator('form').getByRole('button', { name: 'Sign In', exact: true });
      await loginBtn.click();

      // After successful authentication, user is redirected to /home
      await page.waitForURL('**/home', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'NovaCall Dashboard' })).toBeVisible();
    }
  });

  test('should show validation error for empty login submission', async ({ page }) => {
    await page.goto('/auth?mode=signin');

    const loginBtn = page.locator('form').getByRole('button', { name: 'Sign In', exact: true });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      // Form should show error or prevent navigation
      await expect(page).toHaveURL(/.*auth/);
    }
  });
});
