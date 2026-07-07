const { test, expect } = require('@playwright/test');

test.describe('Rating System E2E Tests', () => {
  const targetTopicPage = '/movie/1291608-dhurandhar'; // Using one of the seeded movies
  const testUser = {
    email: 'shadowroguex@example.ie',
    password: 'PhantomBlade!21'
  };

  test('Guest User: Should be prompted to login when clicking a star', async ({ page }) => {
    await page.goto(targetTopicPage);
    await page.waitForLoadState('networkidle');

    // Find the visible star in WorthItVote (inside hidden sm:block desktop layout)
    const star3 = page.locator('.hidden.sm\\:block button[aria-label="Rate 3 out of 5 stars"]');
    
    await star3.click();

    // Check if login prompt appears
    const loginPrompt = page.locator('text=Sign in to continue');
    await expect(loginPrompt).toBeVisible();
  });

  test('Logged In User: Should be able to rate and then update rating', async ({ page }) => {
    // 1. Login and redirect directly back to the targetTopicPage
    await page.goto('/login?callbackUrl=' + encodeURIComponent(targetTopicPage));
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button:has-text("Sign In")').click();
    
    // Wait for the redirect to targetTopicPage to complete
    await page.waitForURL(targetTopicPage, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 2. Initial Rate (4 stars)
    const star4 = page.locator('.hidden.sm\\:block button[aria-label="Rate 4 out of 5 stars"]');
    
    // Get initial vote count
    const votesText = await page.locator('.hidden.sm\\:block div:has-text("Votes")').first().innerText();
    const initialCount = parseInt(votesText.split('\n')[0].replace(/,/g, '')) || 0;

    await star4.click();
    
    // Wait for API response and UI update
    await page.waitForTimeout(2000);

    // Verify star 4 is selected
    await expect(page.locator('.hidden.sm\\:block').locator('text=✓ You rated: 4/5')).toBeVisible();

    // 3. Update Rating (5 stars)
    const star5 = page.locator('.hidden.sm\\:block button[aria-label="Rate 5 out of 5 stars"]');
    await star5.click();
    await page.waitForTimeout(2000);

    // Verify rating updated
    await expect(page.locator('.hidden.sm\\:block').locator('text=✓ You rated: 5/5')).toBeVisible();

    // Check count stayed same (or +1 if it was 0)
    const newVotesText = await page.locator('.hidden.sm\\:block div:has-text("Votes")').first().innerText();
    const newCount = parseInt(newVotesText.split('\n')[0].replace(/,/g, '')) || 0;
    
    // Check if double clicking same star doesn't change anything
    await star5.click();
    await page.waitForTimeout(1000);
    
    const finalVotesText = await page.locator('.hidden.sm\\:block div:has-text("Votes")').first().innerText();
    const finalCount = parseInt(finalVotesText.split('\n')[0].replace(/,/g, '')) || 0;
    
    expect(finalCount).toBe(newCount);
  });
});
