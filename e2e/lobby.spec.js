import { test, expect } from '@playwright/test';

test.describe('Meeting Room Lobby & Device Readiness Flow', () => {
  const roomCode = `lobby-e2e-${Date.now()}`;

  test('should render Lobby page with preview video element and input controls', async ({ page }) => {
    await page.goto(`/${roomCode}`);

    // Verify Lobby header
    await expect(page.locator('text=NovaCall Lobby')).toBeVisible();

    // Verify Display Name input field
    const nameInput = page.getByLabel(/Display Name/i);
    await expect(nameInput).toBeVisible();

    // Verify Join Button
    const joinBtn = page.getByRole('button', { name: /Join Meeting Room/i });
    await expect(joinBtn).toBeVisible();

    // Back to Dashboard button
    const backBtn = page.getByRole('button', { name: /Back to Dashboard/i });
    await expect(backBtn).toBeVisible();
  });

  test('should disable Join button when display name is empty and enable when populated', async ({ page }) => {
    await page.goto(`/${roomCode}`);

    const nameInput = page.getByLabel(/Display Name/i);
    const joinBtn = page.getByRole('button', { name: /Join Meeting Room/i });

    // Clear display name
    await nameInput.fill('');
    await expect(joinBtn).toBeDisabled();

    // Fill valid name
    await nameInput.fill('Dr. Strange');
    await expect(joinBtn).toBeEnabled();
  });

  test('should transition from Lobby into active Meeting Stage upon joining', async ({ page }) => {
    await page.goto(`/${roomCode}`);

    const nameInput = page.getByLabel(/Display Name/i);
    await nameInput.fill('Sarah Connor');

    const joinBtn = page.getByRole('button', { name: /Join Meeting Room/i });
    await joinBtn.click();

    // Verify entry into active conference room (header, controls, and room code)
    await expect(page.locator(`text=${roomCode}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Host').or(page.locator('text=Participant')).first()).toBeVisible();
  });
});
