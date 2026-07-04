const { test, expect } = require('@playwright/test');

test.describe('Topic Page Wheel Creation and Visibility', () => {
  const testTag = `testtag_${Date.now()}`;
  const topics = [
    { type: 'game', slug: '19301-counter-strike', name: 'Counter-Strike' },
    { type: 'anime', slug: '207141-chainsmoker-cat', name: 'Chainsmoker Cat' },
    { type: 'movie', slug: '1081003-supergirl', name: 'Supergirl' },
    { type: 'character', slug: '45627-levi', name: 'Levi' }
  ];

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('input[name="email"]');
    
    // Clear and fill to be safe
    await page.fill('input[name="email"]', '');
    await page.type('input[name="email"]', 'dharamveer@email.com');
    await page.fill('input[name="password"]', '');
    await page.type('input[name="password"]', 'Dharam@1@');
    
    console.log('Fired login submit...');
    await page.click('button[type="submit"]');

    // Wait for login redirect - allow for both dashboard and profile pages
    try {
      await page.waitForResponse(resp => resp.url().includes('/api/auth/callback/credentials') && resp.status() === 200, { timeout: 30000 });
      await page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname.includes('/u/'), { timeout: 30000 });
      console.log('Login successful');
    } catch (e) {
      console.log('Login wait failed. Current URL:', page.url());
      await page.screenshot({ path: `login-debug-${Date.now()}.png` });
      throw e;
    }
  });

  for (const topic of topics) {
    test(`should create a wheel on ${topic.type} page and verify visibility`, async ({ page }) => {
      const wheelTitle = `Wheel for ${topic.name} ${Date.now()}`;
      const topicUrl = `/${topic.type}/${topic.slug}`;
      
      console.log(`Testing topic: ${topic.name} at ${topicUrl}`);

      // 1. Navigate to Topic Page
      await page.goto(topicUrl);
      
      // 2. Click "Spin Wheel" in Community Discussion
      const spinWheelLink = page.locator('a:has-text("Spin Wheel")').first();
      await expect(spinWheelLink).toBeVisible();
      await spinWheelLink.click();

      // 3. Verify redirected to creation page
      await page.waitForURL('**/wheels/create**');
      
      // 4. Click Save button
      const saveBtn = page.locator('button:has-text("Save")').first();
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      // 5. Fill Save Dialog
      await page.waitForSelector('input#name');
      await page.fill('input#name', wheelTitle);
      await page.fill('textarea#description', `This is an automated test wheel for ${topic.name}.`);
      
      // Add tags
      await page.fill('input[placeholder*="Add tags"]', 'automated_test');
      await page.keyboard.press('Enter');
      await page.fill('input[placeholder*="Add tags"]', testTag);
      await page.keyboard.press('Enter');

      // 6. Submit
      await page.click('button[type="submit"]:has-text("Save as New")');

      // 7. Wait for success and redirect or toast
      // Usually it redirects to the wheel page or shows a toast. 
      // Based on useSaveWheel, it might redirect or just close the dialog.
      // Let's wait for the dialog to close.
      await expect(page.locator('text=Save Wheel')).not.toBeVisible({ timeout: 15000 });

      // 8. Verify visibility on Topic Page
      await page.goto(topicUrl);
      // It might take a moment to appear in the feed due to caching or DB async
      await page.waitForTimeout(3000); 
      await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();

      // 9. Verify visibility in Global Feed
      await page.goto('/explore');
      await page.waitForTimeout(2000);
      await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();

      // 10. Verify visibility in Tag Feed
      await page.goto(`/tags/${testTag}`);
      await page.waitForTimeout(2000);
      await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();
    });
  }
});
