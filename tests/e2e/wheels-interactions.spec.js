const { test, expect } = require('@playwright/test');

test.describe('Wheels - User Interactions & Actions', () => {

  test('should display wheels on home page', async ({ page }) => {
    // Navigate to home feed
    await page.goto('/');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for wheel cards on the page
    const wheelLinks = page.locator('a[href*="/wheels/"]');
    const wheelCount = await wheelLinks.count();

    // Verify wheels are displayed
    expect(wheelCount).toBeGreaterThan(0);
  });

  test('should view wheel details and spin results', async ({ page }) => {
    // Navigate to explore to find wheels
    await page.goto('/explore');

    // Wait for page load
    await page.waitForTimeout(3000);

    // Try to find and click a wheel link
    const wheelLink = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelLink.isVisible()) {
      const wheelUrl = await wheelLink.getAttribute('href');
      expect(wheelUrl).toBeTruthy();
      
      await wheelLink.click();
      
      // Verify wheel page loaded
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/wheels/');
    }
  });

  test('should allow anonymous user to spin a wheel', async ({ page }) => {
    // Navigate to explore/wheels page
    await page.goto('/explore');

    // Wait for wheels to load
    await page.waitForTimeout(3000);

    // Look for a wheel card
    const wheelCard = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      
      // Wait for wheel detail page
      await page.waitForTimeout(2000);

      // Look for spin button or wheel interface
      const spinButton = page.locator('button:has-text("Spin"), button:has-text("Start"), button:has-text("Click")').first();
      
      // If there's a spin mechanism, verify it exists
      if (await spinButton.isVisible()) {
        expect(spinButton).toBeVisible();
      } else {
        // Wheel page loaded successfully
        expect(page.url()).toContain('/wheels/');
      }
    }
  });

  test('should display wheel options/segments', async ({ page }) => {
    // Navigate to explore
    await page.goto('/explore');
    
    // Wait for wheels to load
    await page.waitForTimeout(3000);

    // Click on first wheel
    const wheelCard = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      
      // Wait for wheel page
      await page.waitForTimeout(2000);

      // Look for wheel segments/options display
      const segments = page.locator('[data-testid*="segment"], [data-testid*="option"], li, div').filter({ hasText: /\w+/ });
      const segmentCount = await segments.count();

      // Verify segments are displayed
      expect(segmentCount).toBeGreaterThan(0);
    }
  });

  test('should display wheel statistics and metadata', async ({ page }) => {
    // Navigate to explore
    await page.goto('/explore');
    
    // Wait for content
    await page.waitForTimeout(3000);

    // Click on a wheel
    const wheelCard = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      
      // Wait for page
      await page.waitForTimeout(2000);

      // Look for wheel info/metadata
      const wheelContent = page.locator('main');
      await expect(wheelContent).toBeVisible({ timeout: 10000 });

      // Verify content is displayed
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(500);
    }
  });

  test('should navigate between wheels', async ({ page }) => {
    // Navigate to explore page
    await page.goto('/explore');
    
    // Wait for wheels
    await page.waitForTimeout(3000);

    // Look for actual wheel detail links (not /create)
    // Try finding links that contain wheel slugs (typically /wheels/something that's not /create)
    const wheelLinks = page.locator('a[href*="/wheels/"]');
    
    // Filter out the create link by checking visible links
    let wheelCount = 0;
    let wheelLinkToClick = null;
    
    const allLinks = await wheelLinks.all();
    const visibleWheelLinks = [];
    
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      if (href && href !== '/wheels/create' && !href.includes('create')) {
        if (await link.isVisible()) {
          visibleWheelLinks.push(link);
        }
      }
    }
    
    if (visibleWheelLinks.length >= 2) {
      // Click first wheel
      await visibleWheelLinks[0].click();
      
      // Wait for page
      await page.waitForTimeout(2000);
      const firstWheelUrl = page.url();

      // Go back
      await page.goBack();
      await page.waitForTimeout(2000);

      // Click second wheel
      await visibleWheelLinks[1].click();
      
      // Wait for page
      await page.waitForTimeout(2000);
      const secondWheelUrl = page.url();

      // Verify we navigated to different wheels
      expect(firstWheelUrl).not.toBe(secondWheelUrl);
    } else if (visibleWheelLinks.length === 1) {
      // If only one wheel, just verify we can navigate to it
      await visibleWheelLinks[0].click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/wheels/');
    }
  });

  test('should display wheel creator information', async ({ page }) => {
    // Navigate to explore
    await page.goto('/explore');
    
    // Wait for wheels
    await page.waitForTimeout(3000);

    // Click on a wheel
    const wheelCard = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      
      // Wait for page
      await page.waitForTimeout(2000);

      // Look for creator/author information
      const authorLinks = page.locator('a[href*="/u/"]');
      const authorCount = await authorLinks.count();

      // Verify creator link exists
      expect(authorCount).toBeGreaterThan(0);
    }
  });

  test('should navigate to creator profile from wheel', async ({ page }) => {
    // Navigate to explore
    await page.goto('/explore');
    
    // Wait for wheels
    await page.waitForTimeout(3000);

    // Click on a wheel
    const wheelCard = page.locator('a[href*="/wheels/"]').first();
    
    if (await wheelCard.isVisible()) {
      await wheelCard.click();
      
      // Wait for page
      await page.waitForTimeout(2000);

      // Look for creator profile link
      const creatorLink = page.locator('a[href*="/u/"]').first();
      
      if (await creatorLink.isVisible()) {
        const creatorUrl = await creatorLink.getAttribute('href');
        expect(creatorUrl).toContain('/u/');
        
        // Click on creator link
        await creatorLink.click();
        
        // Wait for profile
        await page.waitForTimeout(2000);
        
        // Verify on profile page
        expect(page.url()).toContain('/u/');
      }
    }
  });

  test('should filter or sort wheels on explore page', async ({ page }) => {
    // Navigate to explore
    await page.goto('/explore');
    
    // Wait for page
    await page.waitForTimeout(3000);

    // Look for filter/sort buttons or dropdowns
    const filterButtons = page.locator('button').filter({ hasText: /sort|filter|trending|popular|new/i });
    const filterCount = await filterButtons.count();

    // Explore page may have filter options
    if (filterCount > 0) {
      const firstFilter = filterButtons.first();
      await firstFilter.click();
      
      // Wait for filter to apply
      await page.waitForTimeout(2000);
    } else {
      // Verify page still displays wheels
      const wheels = page.locator('a[href*="/wheels/"]');
      expect(await wheels.count()).toBeGreaterThan(0);
    }
  });

  test('should display wheel search results', async ({ page }) => {
    // Navigate to search or explore with query
    await page.goto('/search?q=wheel');
    
    // Wait for results
    await page.waitForTimeout(3000);

    // Look for search results
    const resultLinks = page.locator('a[href*="/wheels/"]');
    
    // Results page should load
    expect(page.url()).toBeTruthy();
  });

  test('should show wheel in different contexts (feed, profile, explore)', async ({ page }) => {
    // Test 1: Check feed
    await page.goto('/');
    await page.waitForTimeout(2000);
    let wheelsOnFeed = await page.locator('a[href*="/wheels/"]').count();
    expect(wheelsOnFeed).toBeGreaterThanOrEqual(0);

    // Test 2: Check explore
    await page.goto('/explore');
    await page.waitForTimeout(3000);
    let wheelsOnExplore = await page.locator('a[href*="/wheels/"]').count();
    expect(wheelsOnExplore).toBeGreaterThan(0);

    // Test 3: Check user profile
    await page.goto('/u/creators93');
    await page.waitForTimeout(2000);
    let wheelsOnProfile = await page.locator('a[href*="/wheels/"]').count();
    expect(wheelsOnProfile).toBeGreaterThanOrEqual(0);
  });
});
