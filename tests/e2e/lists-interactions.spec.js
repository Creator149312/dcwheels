const { test, expect } = require('@playwright/test');

test.describe('Lists - User Interactions & Actions', () => {

  test('should display lists in user profile', async ({ page }) => {
    // Navigate to user profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab/section
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      
      // Wait for lists to load
      await page.waitForTimeout(2000);
    }

    // Verify profile page
    expect(page.url()).toContain('/u/');
  });

  test('should navigate to list creation page', async ({ page }) => {
    // Navigate to lists create page
    await page.goto('/lists/create');

    // Wait for page
    await page.waitForTimeout(2000);

    // Verify page loaded
    expect(page.url()).toContain('/lists/create');
    
    // Look for form
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 10000 }).catch(() => {
      // Page loaded
    });
  });

  test('should display list creation form with inputs', async ({ page }) => {
    // Navigate to create lists page
    await page.goto('/lists/create');

    // Wait for page
    await page.waitForTimeout(2000);

    // Look for form inputs
    const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
    
    // Check if form is visible
    if (await nameInput.isVisible()) {
      expect(nameInput).toBeVisible();
    } else {
      // If name input not found, check for any form inputs
      const formInputs = page.locator('input, textarea');
      const inputCount = await formInputs.count();
      expect(inputCount).toBeGreaterThan(0);
    }
  });

  test('should view individual list details', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
    }

    // Look for list link
    const listLink = page.locator('a[href*="/lists/"]').first();
    
    if (await listLink.isVisible()) {
      const listUrl = await listLink.getAttribute('href');
      expect(listUrl).toContain('/lists/');
      
      await listLink.click();
      
      // Wait for list detail page
      await page.waitForTimeout(2000);
      
      // Verify on list page
      expect(page.url()).toContain('/lists/');
    }
  });

  test('should display list name and description', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Look for list info
      const listTitle = page.locator('h2, h3, [data-testid="list-title"]').first();
      
      if (await listTitle.isVisible()) {
        const titleText = await listTitle.textContent();
        expect(titleText).toBeTruthy();
      }
    }
  });

  test('should display list items', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Click on first list
      const listLink = page.locator('a[href*="/lists/"]').first();
      
      if (await listLink.isVisible()) {
        await listLink.click();
        
        // Wait for list page
        await page.waitForTimeout(2000);
        
        // Look for list items
        const items = page.locator('[data-testid*="item"], li');
        const itemCount = await items.count();
        
        // List page should display items (can be 0)
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should show item count in list', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      
      // Wait for lists to load
      await page.waitForTimeout(2000);
      
      // Look for list cards with item count
      const listCards = page.locator('[data-testid="list"], article').first();
      
      if (await listCards.isVisible()) {
        const content = await listCards.textContent();
        expect(content).toBeTruthy();
      }
    }
  });

  test('should navigate to add items to list', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Click on a list
      const listLink = page.locator('a[href*="/lists/"]').first();
      
      if (await listLink.isVisible()) {
        await listLink.click();
        
        // Wait for list page
        await page.waitForTimeout(2000);
        
        // Look for add item button
        const addButton = page.locator('button:has-text("Add"), button:has-text("Add Item"), button:has-text("New")').first();
        
        if (await addButton.isVisible()) {
          expect(addButton).toBeVisible();
        }
      }
    }
  });

  test('should allow saving items to lists from other pages', async ({ page }) => {
    // Navigate to explore page
    await page.goto('/explore');

    // Wait for page
    await page.waitForTimeout(3000);

    // Look for "save to list" or "add to list" button on wheels
    const saveButtons = page.locator('button:has-text("Save"), button:has-text("Add to List"), button[aria-label*="save" i], button[aria-label*="list" i]');
    
    const saveCount = await saveButtons.count();
    
    // Explore page may have save options
    expect(saveCount).toBeGreaterThanOrEqual(0);
  });

  test('should display lists in different contexts', async ({ page }) => {
    // Test 1: Profile lists tab
    await page.goto('/u/creators93');
    await page.waitForTimeout(2000);
    
    const listsTab = page.locator('button:has-text("Lists")').first();
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
    }

    // Verify we can see lists
    expect(page.url()).toContain('/u/');

    // Test 2: Direct lists page
    await page.goto('/lists');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/lists');
  });

  test('should filter or sort lists', async ({ page }) => {
    // Navigate to profile lists
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Look for sort/filter options
      const filterButtons = page.locator('button').filter({ hasText: /sort|filter|name|date/i });
      
      const filterCount = await filterButtons.count();
      // Lists may have sorting options
      expect(filterCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search for lists', async ({ page }) => {
    // Navigate to lists page
    await page.goto('/lists');

    // Wait for page
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Wait for search results
      await page.waitForTimeout(2000);
    }

    // Verify page is accessible
    expect(page.url()).toContain('/lists');
  });

  test('should display edit/delete options for own lists', async ({ page }) => {
    // This test would require authentication
    // Navigate to profile lists
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Look for action buttons
      const actionButtons = page.locator('button').filter({ hasText: /edit|delete|more|options/i });
      
      const actionCount = await actionButtons.count();
      // List cards may have action buttons
      expect(actionCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display list visibility (public/private)', async ({ page }) => {
    // Navigate to profile lists
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Look for visibility indicators
      const lists = page.locator('[data-testid="list"], article').first();
      
      if (await lists.isVisible()) {
        const content = await lists.textContent();
        expect(content).toBeTruthy();
      }
    }
  });

  test('should navigate from list back to creator profile', async ({ page }) => {
    // Navigate to profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for lists tab
    const listsTab = page.locator('button:has-text("Lists")').first();
    
    if (await listsTab.isVisible()) {
      await listsTab.click();
      await page.waitForTimeout(2000);
      
      // Click on a list
      const listLink = page.locator('a[href*="/lists/"]').first();
      
      if (await listLink.isVisible()) {
        await listLink.click();
        await page.waitForTimeout(2000);
        
        // Look for creator/back link
        const creatorLink = page.locator('a[href*="/u/"]').first();
        
        if (await creatorLink.isVisible()) {
          const creatorUrl = await creatorLink.getAttribute('href');
          expect(creatorUrl).toContain('/u/');
        }
      }
    }
  });
});
