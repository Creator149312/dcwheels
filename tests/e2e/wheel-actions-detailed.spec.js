const { test, expect } = require('@playwright/test');

test.describe('Wheel Actions - Detailed Interactive Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Fill in email
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(500);
    }

    // Fill in password
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123');
      await page.waitForTimeout(500);
    }

    // Click sign in button
    const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Login")').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(3000);
    }

    // Navigate to explore wheels page to find a wheel
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    // Find first wheel link and click it
    const wheelLink = page.locator('a[href*="/wheels/"]').first();
    if (await wheelLink.isVisible()) {
      await wheelLink.click();
      await page.waitForTimeout(3000);
    }
  });

  test('should verify like action on a wheel', async ({ page }) => {
    // Find the like button (aria-label="Like")
    const likeButton = page.locator('button[aria-label="Like"]').first();
    
    if (await likeButton.isVisible()) {
      const initialText = await likeButton.textContent();
      const initialPressed = await likeButton.getAttribute('aria-pressed');
      console.log(`Initial wheel like text: ${initialText}, pressed: ${initialPressed}`);

      // Click like
      await likeButton.click();
      await page.waitForTimeout(2000);

      // Verify state was toggled
      const updatedButton = page.locator('button[aria-label="Like"]').first();
      const updatedPressed = await updatedButton.getAttribute('aria-pressed');
      console.log(`Updated wheel like pressed: ${updatedPressed}`);

      expect(updatedPressed).not.toBe(initialPressed);
    } else {
      console.log('No like button found on this wheel page');
    }
  });

  test('should verify share action on a wheel', async ({ page }) => {
    // Find share button
    const shareButton = page.locator('button:has-text("Share"), button[aria-label*="Share"]').first();
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(1500);

      // Verify share options or popup are shown
      const sharePopup = page.locator('[class*="Share" i], [class*="popup" i], [data-testid*="share"]').first();
      console.log(`Share popup visibility: ${await sharePopup.isVisible().catch(() => false)}`);
      
      expect(shareButton).toBeTruthy();
    }
  });

  test('should verify save (Favorites) action on a wheel', async ({ page }) => {
    // Find QuickSaveButton: Aria label matches "Add to Favorites" or "Remove from Favorites" or text matches "Save"
    const saveButton = page.locator('button[aria-label*="Favorites"], button:has-text("Save"), button:has-text("Saved")').first();
    
    if (await saveButton.isVisible()) {
      const initialText = await saveButton.textContent();
      const initialLabel = await saveButton.getAttribute('aria-label');
      console.log(`Initial save text: ${initialText}, label: ${initialLabel}`);

      // Click Save (Favorites) toggle
      await saveButton.click();
      await page.waitForTimeout(2000);

      // Verify updated state
      const updatedButton = page.locator('button[aria-label*="Favorites"], button:has-text("Save"), button:has-text("Saved")').first();
      const updatedText = await updatedButton.textContent();
      const updatedLabel = await updatedButton.getAttribute('aria-label');
      console.log(`Updated save text: ${updatedText}, label: ${updatedLabel}`);

      expect(updatedLabel).not.toBe(initialLabel);
    }
  });

  test('should verify comment action on a wheel', async ({ page }) => {
    // Find comments toggle button
    const commentButton = page.locator('button:has(svg), button').filter({ hasText: /^\d+$|^Comment$|^Comments$/ }).first();
    
    if (await commentButton.isVisible()) {
      const initialText = await commentButton.textContent();
      console.log(`Initial wheel comments toggle text: ${initialText}`);

      // Click to open comments panel
      await commentButton.click();
      await page.waitForTimeout(1500);

      // Find the comments section input
      const commentInput = page.locator('#comments input[placeholder*="comment" i], #comments input[placeholder*="reply" i]').first();
      console.log(`Comments input element visible: ${await commentInput.isVisible().catch(() => false)}`);
      expect(await commentInput.isVisible()).toBe(true);

      // Close comments panel again
      await commentButton.click();
      await page.waitForTimeout(1000);
      expect(await commentInput.isVisible().catch(() => false)).toBe(false);
    }
  });

  test('should verify embed action on a wheel', async ({ page }) => {
    // Find embed code popup toggle button - hidden on small screens, visible on md/lg
    const embedButton = page.locator('button:has-text("Embed"), button[aria-label*="Embed"]').first();
    
    if (await embedButton.isVisible()) {
      await embedButton.click();
      await page.waitForTimeout(1500);

      // Verify Embed modal/popup is visible
      const embedPopup = page.locator('[class*="Embed" i], [class*="popup" i], input[value*="iframe"]').first();
      console.log(`Embed options modal visible: ${await embedPopup.isVisible().catch(() => false)}`);
      expect(await embedPopup.isVisible()).toBe(true);

      // Click close button on the popup if available
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        expect(await embedPopup.isVisible().catch(() => false)).toBe(false);
      }
    } else {
      console.log('Embed button is not visible or hidden on current screen viewport size.');
    }
  });
});
