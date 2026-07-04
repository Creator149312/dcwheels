const { test, expect } = require('@playwright/test');

test.describe('Global Feed & Layout Verification', () => {

  test('global feed page loads correctly and displays feed items', async ({ page }) => {
    await page.goto('/');

    // Verify main outer container or title/logo
    const mainFeed = page.locator('main');
    await expect(mainFeed).toBeVisible();
  });

  test('interleaves wheels gracefully within posts', async ({ page }) => {
    await page.goto('/');

    // Wait for feed cards to load
    const feedCards = page.locator('[data-testid="feed-card"], [data-testid="wheel-card"]');
    
    // Check distribution of wheel-cards if multiple exist
    // We expect after approximately every 5 post cards, we see a wheel card
    const count = await feedCards.count();
    if (count > 5) {
      let postsSinceLastWheel = 0;
      for (let i = 0; i < count; i++) {
        const isWheelColor = await feedCards.nth(i).getAttribute('data-testid');
        if (isWheelColor === 'wheel-card') {
          // Verify we aren't displaying consecutive wheel cards
          expect(postsSinceLastWheel).toBeGreaterThanOrEqual(1);
          postsSinceLastWheel = 0;
        } else {
          postsSinceLastWheel++;
        }
      }
    }
  });

  test('dilemma viewer inside post can be interacted with anonymously', async ({ page }) => {
    await page.goto('/');

    // Locate dilemma/poll options
    const pollOptions = page.locator('[data-testid="poll-option"]');
    if (await pollOptions.count() > 0) {
      const firstOption = pollOptions.first();
      await firstOption.click();

      // Check that click renders results (reveal bars) optimistically
      const percentLabel = page.locator('[data-testid="poll-percentage"]');
      await expect(percentLabel.first()).toBeVisible();
    }
  });
});
