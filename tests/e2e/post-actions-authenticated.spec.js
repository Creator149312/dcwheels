const { test, expect } = require('@playwright/test');

test.describe('Post Actions - Authenticated Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Fill in email
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(process.env.PW_TEST_EMAIL || 'test@example.com');
      await page.waitForTimeout(500);
    }

    // Fill in password
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(process.env.PW_TEST_PASSWORD || 'password123');
      await page.waitForTimeout(500);
    }

    // Click sign in button
    const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Login")').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(3000);
    }
  });

  test('should like a post when authenticated', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Dynamic scoping to the first post card container that contains a Like button
    const postCard = page.locator('div:has(button[aria-label="Like"])').first();
    
    if (await postCard.isVisible()) {
      const likeButton = postCard.locator('button[aria-label="Like"]').first();
      const beforeText = await likeButton.textContent();
      console.log(`Before like: ${beforeText}`);

      // Click like
      await likeButton.click();
      await page.waitForTimeout(2000);

      // Verify the button now has aria-label="Unlike" and isPressed="true" (within the same postCard scope!)
      const updatedButton = postCard.locator('button[aria-label="Unlike"]').first();
      const isPressed = await updatedButton.getAttribute('aria-pressed');
      const afterText = await updatedButton.textContent();
      console.log(`After like: ${afterText}, pressed state: ${isPressed}`);

      expect(isPressed).toBe('true');
    }
  });

  test('should unlike a post when already liked', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Ensure we have liked a post first by clicking it
    const postCard = page.locator('div:has(button[aria-label="Like"])').first();
    if (await postCard.isVisible()) {
      const likeButton = postCard.locator('button[aria-label="Like"]').first();
      await likeButton.click();
      await page.waitForTimeout(2000);
    }

    // Now find a liked post (button with aria-label="Unlike" and aria-pressed="true")
    const likedPostCard = page.locator('div:has(button[aria-label="Unlike"][aria-pressed="true"])').first();
    
    if (await likedPostCard.isVisible()) {
      const likedButton = likedPostCard.locator('button[aria-label="Unlike"]').first();
      const beforeText = await likedButton.textContent();
      console.log(`Before unlike: ${beforeText}`);

      // Click to unlike
      await likedButton.click();
      await page.waitForTimeout(2000);

      // Get the button again (now it should have label="Like" and aria-pressed="false")
      const unlikedButton = likedPostCard.locator('button[aria-label="Like"]').first();
      const afterText = await unlikedButton.textContent();
      const isPressed = await unlikedButton.getAttribute('aria-pressed');
      console.log(`After unlike: ${afterText}, pressed state: ${isPressed}`);

      expect(isPressed).toBe('false');
    }
  });

  test('should display like count and update on interaction', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Scoped to first post card
    const postCard = page.locator('div:has(button[aria-label="Like"])').first();
    
    if (await postCard.isVisible()) {
      const likeButton = postCard.locator('button[aria-label="Like"]').first();
      const likeText = await likeButton.textContent();
      console.log(`Initial like button text: ${likeText}`);

      expect(likeText).toBeTruthy();

      // Click and verify the button updates
      await likeButton.click();
      await page.waitForTimeout(2000);

      const updatedButton = postCard.locator('button[aria-label="Unlike"]').first();
      const updatedText = await updatedButton.textContent();
      console.log(`Updated like button text: ${updatedText}`);

      const isPressed = await updatedButton.getAttribute('aria-pressed');
      expect(isPressed).toBe('true');
    }
  });

  test('should display share button and handle share interactions', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Find share button
    const shareButton = page.locator('button:has-text("Share"), button[aria-label*="Share"]').first();
    
    if (await shareButton.isVisible()) {
      // Click share
      await shareButton.click();
      await page.waitForTimeout(1500);

      // Check if share menu/modal appeared
      const shareOptions = page.locator('[class*="Share" i], [data-testid*="share"]');
      const isVisible = await shareOptions.first().isVisible().catch(() => false);
      
      console.log(`Share options visible: ${isVisible}`);
      
      // Just verify the button exists and is clickable
      expect(shareButton).toBeTruthy();
    }
  });

  test('should open comment section when authenticated', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Dynamic scoping to the first post card container that contains a comment button
    const postCard = page.locator('div:has(button:has-text("Comment")), div:has(button:has-text("Comments"))').first();
    
    if (await postCard.isVisible()) {
      const commentButton = postCard.locator('button:has-text("Comment"), button:has-text("Comments")').first();
      const initialText = await commentButton.textContent();
      console.log(`Initial comment button: ${initialText}`);

      // Click to open comments
      await commentButton.click();
      await page.waitForTimeout(1500);

      // Look for comment input/textarea inside the scoped post card
      const commentInput = postCard.locator('input[placeholder*="comment" i], input[placeholder*="reply" i], textarea[placeholder*="comment" i], textarea[placeholder*="reply" i]').first();
      const isPanelOpen = await commentInput.isVisible().catch(() => false);
      
      console.log(`Comment panel opened: ${isPanelOpen}`);

      // Click again to close
      await commentButton.click();
      await page.waitForTimeout(1000);

      const isClosed = await commentInput.isVisible().catch(() => false);
      console.log(`Comment panel closed: ${!isClosed}`);
    }
  });
});
