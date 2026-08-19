import { test, expect } from '@playwright/test';

test.describe('E2E', () => {
  test('Browser A ↔ Browser B', async ({ browser }) => {
    const roomCode = `e2e-mesh-${Date.now()}`;

    // 1. Launch Browser A (Host: Alice)
    const isChromium = browser.browserType().name() === 'chromium';
    const contextA = await browser.newContext({
      ...(isChromium ? { permissions: ['camera', 'microphone'] } : {})
    });
    const pageA = await contextA.newPage();

    await pageA.goto(`/${roomCode}`);
    const nameInputA = pageA.getByLabel(/Display Name/i);
    await expect(nameInputA).toBeVisible();
    await nameInputA.fill('Alice (Host)');
    const joinBtnA = pageA.getByRole('button', { name: /Join Meeting Room/i });
    await joinBtnA.click();

    // Verify Browser A is in room as Host
    await expect(pageA.locator(`text=${roomCode}`).first()).toBeVisible({ timeout: 8000 });
    await expect(pageA.locator('text=Host').first()).toBeVisible();

    // 2. Launch Browser B (Participant: Bob)
    const contextB = await browser.newContext({
      ...(isChromium ? { permissions: ['camera', 'microphone'] } : {})
    });
    const pageB = await contextB.newPage();

    await pageB.goto(`/${roomCode}`);
    const nameInputB = pageB.getByLabel(/Display Name/i);
    await expect(nameInputB).toBeVisible();
    await nameInputB.fill('Bob (Peer)');
    const joinBtnB = pageB.getByRole('button', { name: /Join Meeting Room/i });
    await joinBtnB.click();

    // Verify Browser B is in room as Participant
    await expect(pageB.locator(`text=${roomCode}`).first()).toBeVisible({ timeout: 8000 });

    // 3. WebRTC Peer Discovery & Tile Verification in Browser A and Browser B
    // Browser A sees Bob's tile
    await expect(pageA.locator('text=Bob (Peer)').or(pageA.locator('text=2 people')).first()).toBeVisible({ timeout: 12000 });
    // Browser B sees Alice's tile
    await expect(pageB.locator('text=Alice (Host)').or(pageB.locator('text=2 people')).first()).toBeVisible({ timeout: 12000 });

    // 4. In-Meeting Chat Messaging between Browser A and Browser B
    const chatBtnA = pageA.locator('button[title*="Chat" i], button:has-text("Chat"), svg[data-testid="ChatIcon"]').first();
    if (await chatBtnA.isVisible()) {
      await chatBtnA.click();
      const chatInputA = pageA.getByPlaceholder(/Type a message/i).or(pageA.locator('input[type="text"]').last());
      if (await chatInputA.isVisible()) {
        const testMsg = 'Hello from Browser A to Browser B!';
        await chatInputA.fill(testMsg);
        await pageA.keyboard.press('Enter');

        // Browser B opens chat drawer
        const chatBtnB = pageB.locator('button[title*="Chat" i], button:has-text("Chat"), svg[data-testid="ChatIcon"]').first();
        if (await chatBtnB.isVisible()) {
          await chatBtnB.click();
          // Browser B sees Alice's message
          await expect(pageB.locator(`text=${testMsg}`)).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // Teardown contexts
    await contextA.close();
    await contextB.close();
  });
});
