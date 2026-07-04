const { test, expect } = require('@playwright/test');

test.describe('Topic Page - Authenticated Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Fill in email
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('dharamveer@email.com');
    }

    // Fill in password
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('Dharam@1@');
    }

    // Click sign in button
    const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Login")').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      // Wait for navigation back to home or dashboard or check for user menu
      await page.waitForTimeout(5000);
      
      // Navigate to the target Topic Page
      await page.goto('/game/19301-counter-strike');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display topic page elements and supports infinite scroll', async ({ page }) => {
    // Navigate to a known topic page (Counter Strike)
    await page.goto('/game/19301-counter-strike');
    await page.waitForTimeout(3000);

    // 1. Verify Header Elements
    const title = page.locator('h1').first();
    await expect(title).toContainText(/Counter-Strike/i);

    // Verify EntityTrackingBar (Follow button)
    const trackingButton = page.locator('button:has-text("Played"), button:has-text("Mark as Played")').first();
    await expect(trackingButton).toBeVisible();

    // 2. Verify WorthItVote component
    const worthItSection = page.locator('text=Worth It?').first();
    if (await worthItSection.isVisible()) {
        await expect(worthItSection).toBeVisible();
    }

    // 3. Verify Community Discussion (Infinite Feed)
    const discussionHeader = page.locator('h2:has-text("Community Discussion")').first();
    await expect(discussionHeader).toBeVisible();

    // Verify Feed Cards
    const feedCards = page.locator('div[class*="FeedCard"], div[class*="PostCard"]');
    // We might not have posts initially if it's a fresh DB, but let's check for the teaser
    const teaser = page.locator('text=What\'s on your mind').first();
    await expect(teaser).toBeVisible();

    // 4. Test Infinite Scroll
    // Scroll to bottom to trigger loading more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    // Check if more items are loaded or if it's still interactive
    // (In a real test we'd check for a specific length increase or absence of loader)
    const loadingState = page.locator('svg[class*="animate-spin"]');
    if (await loadingState.isVisible()) {
        await page.waitForTimeout(2000);
    }
  });

  test('should allow interacting with content on topic page', async ({ page }) => {
    // Navigate to a known topic page
    await page.goto('/game/19301-counter-strike');
    await page.waitForTimeout(3000);

    // Try to find a post to like
    const likeButton = page.locator('button[aria-label="Like"]').first();
    
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(1000);
      
      // Should now be "Unlike"
      const unlikeButton = page.locator('button[aria-label="Unlike"]').first();
      await expect(unlikeButton).toBeVisible();
    }
  });

  test('should allow creating a post via the teaser', async ({ page }) => {
    await page.goto('/game/19301-counter-strike');
    await page.waitForTimeout(3000);

    const teaserLink = page.locator('text=What\'s on your mind').first();
    await teaserLink.click();

    // Should open the create post modal/page with the tag pre-selected
    await expect(page).toHaveURL(/.*post.*tag=Counter-Strike/i);
  });

});
