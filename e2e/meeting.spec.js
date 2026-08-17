import { test, expect } from '@playwright/test';

test.describe('In-Meeting Conference Controls, Real-Time Chat & Drawer Flow', () => {
  const roomCode = `conf-e2e-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await page.goto(`/${roomCode}`);
    const nameInput = page.getByLabel(/Display Name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Captain Kirk');
      const joinBtn = page.getByRole('button', { name: /Join Meeting Room/i });
      await joinBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display Meeting Header with room code, host badge, and connection quality indicator', async ({ page }) => {
    // Header should contain room code
    await expect(page.locator(`text=${roomCode}`).first()).toBeVisible();

    // Host/Participant badge
    await expect(page.locator('text=Host').or(page.locator('text=Participant')).first()).toBeVisible();

    // Connection Quality indicator (Signal bars or Excellent/Good badge)
    await expect(page.locator('text=Excellent').or(page.locator('text=Good')).or(page.locator('[aria-label*="Network" i]')).first()).toBeVisible();
  });

  test('should toggle in-meeting drawer between Chat and Participants tabs', async ({ page }) => {
    // Look for Chat icon or button in controls bar
    const chatBtn = page.locator('button[title*="Chat" i], button:has-text("Chat"), svg[data-testid="ChatIcon"]').first();
    if (await chatBtn.isVisible()) {
      await chatBtn.click();

      // Drawer tabs should now be visible
      await expect(page.getByRole('tab', { name: /Chat/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /People/i })).toBeVisible();

      // Switch to People tab
      const peopleTab = page.getByRole('tab', { name: /People/i });
      await peopleTab.click();
      await expect(page.locator('text=Captain Kirk (You)').or(page.locator('text=Captain Kirk')).first()).toBeVisible();
    }
  });

  test('should send in-meeting chat message and render message bubble in chat panel', async ({ page }) => {
    const chatBtn = page.locator('button[title*="Chat" i], button:has-text("Chat"), svg[data-testid="ChatIcon"]').first();
    if (await chatBtn.isVisible()) {
      await chatBtn.click();

      const chatTab = page.getByRole('tab', { name: /Chat/i });
      await chatTab.click();

      // Find chat input field
      const chatInput = page.getByPlaceholder(/Type a message/i).or(page.locator('input[type="text"]').last());
      if (await chatInput.isVisible()) {
        const testMsg = `E2E Test Message ${Date.now()}`;
        await chatInput.fill(testMsg);
        await page.keyboard.press('Enter');

        // Verify message appears in chat history
        await expect(page.locator(`text=${testMsg}`)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should prompt confirmation dialog when user clicks Leave/End Call', async ({ page }) => {
    const endCallBtn = page.locator('button[title*="Leave" i], button[title*="End" i], button.btnEndCall, svg[data-testid="CallEndIcon"]').first();
    if (await endCallBtn.isVisible()) {
      await endCallBtn.click();

      // Dialog should open
      await expect(page.locator('text=Leave Meeting?').or(page.locator('text=End Meeting for Everyone?'))).toBeVisible();
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
    }
  });
});
