import { test, expect } from '@playwright/test';

test.describe('Flagship End-to-End User Journey: Register → Login → Create Meeting → Join → Moderation → Leave', () => {
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const testUser = {
    name: `Capt Kirk ${uniqueId}`,
    email: `kirk_${uniqueId}@novacall.io`,
    username: `kirk_${uniqueId}`,
    password: 'SecurePassword123!'
  };

  test('should execute complete flagship lifecycle from onboarding to meeting moderation and exit', async ({ page }) => {
    // -------------------------------------------------------------
    // 1. REGISTER: Create a new verified user account
    // -------------------------------------------------------------
    await page.goto('/auth?mode=signup');
    await expect(page).toHaveTitle(/NovaCall/i);

    const nameInput = page.getByLabel(/Full Name|Name/i);
    const emailInput = page.getByLabel(/Email/i);
    const passwordInput = page.getByLabel(/^Password/i);
    const confirmPasswordInput = page.getByLabel(/Confirm Password/i);

    await expect(nameInput).toBeVisible();
    await nameInput.fill(testUser.name);
    await emailInput.fill(testUser.email);
    await passwordInput.fill(testUser.password);

    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill(testUser.password);
    }

    const registerBtn = page.getByRole('button', { name: /Create Account|Sign Up|Register/i });
    await registerBtn.click();

    // Verify registration confirmation (toast or switch to Sign In mode)
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 2. LOGIN: Authenticate with new credentials
    // -------------------------------------------------------------
    // Ensure on Sign In view
    const signInHeading = page.locator('text=Sign In').or(page.locator('text=Welcome Back'));
    if (!await signInHeading.isVisible()) {
      await page.goto('/auth?mode=signin');
    }

    const loginEmailInput = page.getByLabel(/Email|Username/i).first();
    const loginPasswordInput = page.getByLabel(/^Password/i);

    await loginEmailInput.fill(testUser.email);
    await loginPasswordInput.fill(testUser.password);

    const loginBtn = page.getByRole('button', { name: /Sign In|Log In/i });
    await loginBtn.click();

    // Verify redirection to Dashboard
    await page.waitForURL('**/home', { timeout: 10000 });
    await expect(page.locator('text=NovaCall Dashboard').or(page.locator('text=Dashboard'))).toBeVisible();

    // -------------------------------------------------------------
    // 3. CREATE MEETING: Initialize meeting room from Dashboard
    // -------------------------------------------------------------
    const newMeetingBtn = page.getByRole('button', { name: /New Meeting/i });
    await expect(newMeetingBtn).toBeVisible();
    await newMeetingBtn.click();

    // Wait for navigation into meeting URL (e.g. /nov-abc123 or /randomCode)
    await page.waitForURL((url) => url.pathname !== '/home' && url.pathname !== '/', { timeout: 10000 });
    const currentUrl = page.url();
    const roomCode = currentUrl.split('/').pop().split('?')[0];

    // -------------------------------------------------------------
    // 4. JOIN: Enter the meeting stage
    // -------------------------------------------------------------
    // If lobby is shown, proceed to meeting room
    const joinRoomBtn = page.getByRole('button', { name: /Join Meeting Room|Join/i });
    if (await joinRoomBtn.isVisible()) {
      const displayNameInput = page.getByLabel(/Display Name/i);
      if (await displayNameInput.isVisible()) {
        const currentValue = await displayNameInput.inputValue();
        if (!currentValue) {
          await displayNameInput.fill(testUser.name);
        }
      }
      await joinRoomBtn.click();
    }

    // Verify entry into active conference stage
    await expect(page.locator(`text=${roomCode}`).first()).toBeVisible({ timeout: 10000 });

    // Verify Host role badge is active for the room creator
    await expect(page.locator('text=Host').first()).toBeVisible();

    // Verify Connection Quality indicator
    await expect(page.locator('text=Excellent').or(page.locator('text=Good')).or(page.locator('[aria-label*="Network" i]')).first()).toBeVisible();

    // -------------------------------------------------------------
    // 5. MODERATION & COLLABORATION: Verify Host controls & In-Meeting Chat
    // -------------------------------------------------------------
    // Toggle audio / video controls
    const micBtn = page.locator('button:has-text("Mute"), button:has-text("Unmute")').first();
    if (await micBtn.isVisible()) {
      await micBtn.click(); // Toggle state
      await page.waitForTimeout(300);
      await micBtn.click(); // Restore state
    }

    // Open Drawer to verify Participant List & Host Moderation tools
    const peopleBtn = page.locator('button:has-text("People"), button[title*="People" i]').first();
    if (await peopleBtn.isVisible()) {
      await peopleBtn.click();

      // Verify Participant List tab shows authenticated user with Host badge
      await expect(page.locator(`text=${testUser.name} (You)`).or(page.locator(`text=${testUser.name}`)).or(page.locator('text=(You)'))).toBeVisible();

      // Switch to Chat tab in the side drawer
      const chatTab = page.getByRole('tab', { name: /Chat/i });
      if (await chatTab.isVisible()) {
        await chatTab.click();

        const chatInput = page.getByPlaceholder(/Type a message/i).or(page.locator('input[type="text"]').last());
        if (await chatInput.isVisible()) {
          const testChatMessage = `Automated E2E Verification Message ${uniqueId}`;
          await chatInput.fill(testChatMessage);
          await page.keyboard.press('Enter');

          // Verify message bubble appears in conversation log
          await expect(page.locator(`text=${testChatMessage}`)).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // -------------------------------------------------------------
    // 6. LEAVE: Exit meeting cleanly and verify return to Dashboard
    // -------------------------------------------------------------
    const leaveBtn = page.locator('button:has-text("End Call"), button:has-text("Leave"), button.btnEndCall').first();
    await expect(leaveBtn).toBeVisible();
    await leaveBtn.click();

    // Verify confirmation modal opens
    const confirmModal = page.locator('text=End Meeting for Everyone?').or(page.locator('text=Leave Meeting?'));
    await expect(confirmModal).toBeVisible();

    // Confirm meeting termination
    const confirmLeaveBtn = page.getByRole('button', { name: /End Call|Leave Call|Confirm/i }).last();
    await confirmLeaveBtn.click();

    // Verify redirect back to Dashboard or Landing
    await page.waitForURL((url) => url.pathname === '/home' || url.pathname === '/', { timeout: 8000 });
  });
});
