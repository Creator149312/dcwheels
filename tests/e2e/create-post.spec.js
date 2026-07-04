const { test, expect } = require('@playwright/test');

test.describe('Create Post - Form Validation & Limits', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to create post page
    await page.goto('/post/create');
  });

  test('shows login prompt for visitors', async ({ page }) => {
    // By default, a visitor has no session, so they must see the login nudge
    const loginPrompt = page.locator('text=You must be logged in to create a post.');
    await expect(loginPrompt).toBeVisible();

    const loginButton = page.locator('a', { hasText: 'Log In' });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveAttribute('href', '/login?callbackUrl=/post/create');
  });

  test('has no separate title field and maintains single composer state', async ({ page }) => {
    // This and subsequent tests outline client-side specifications.
    // If authenticated, these selector checks cover our master single-textbox constraints.
    test.skip(); // Needs authentication
  });

  test('enforces max post text of 600 characters', async ({ page }) => {
    test.skip(); // Needs authentication
    
    // We would type text, verify character count reads length/600,
    // and verify the post button is disabled once length > 600.
  });

  test('poll options are limited between 2 and 6 with text length limit', async ({ page }) => {
    test.skip(); // Needs authentication

    // Click poll button to activate poll
    // Verify initially 2 options are shown
    // Click "Add Option" until there are 6 options
    // Verify "Add Option" button is hidden/disabled once 6 is reached
    // Try to enter option with > 65 characters and verify validation error is shown
  });

  test('inline hashtag regex extraction and live autocomplete', async ({ page }) => {
    test.skip(); // Needs authentication

    // Type text containing a hashtag e.g., "Exploring #tra"
    // Validate autocomplete suggestion box pops up
    // Select one suggestion, verify text updates to "#travel " (with trailing space)
  });
});
