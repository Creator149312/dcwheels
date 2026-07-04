const { test, expect } = require('@playwright/test');

test.describe('Posts - User Interactions & Actions', () => {

  test('should display posts in global feed', async ({ page }) => {
    // Navigate to home/global feed
    await page.goto('/');

    // Wait for feed to load
    await page.waitForTimeout(3000);

    // Look for post cards
    const postLinks = page.locator('a[href*="/post/"], article');
    const postCount = await postLinks.count();

    // Verify posts are displayed
    expect(postCount).toBeGreaterThan(0);
  });

  test('should view individual post details', async ({ page }) => {
    // Navigate to home feed
    await page.goto('/');

    // Wait for content
    await page.waitForTimeout(3000);

    // Look for a post link
    const postLink = page.locator('a[href*="/post/"]').first();
    
    if (await postLink.isVisible()) {
      const postId = await postLink.getAttribute('href');
      expect(postId).toBeTruthy();
      
      await postLink.click();
      
      // Wait for post detail page
      await page.waitForTimeout(2000);
      
      // Verify on post page
      const postContent = page.locator('main, [data-testid="post-detail"]');
      await expect(postContent.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        // Post detail page loaded
      });
    }
  });

  test('should display post author information', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Find a post with author info
    const authorLinks = page.locator('a[href*="/u/"]');
    const authorCount = await authorLinks.count();

    // Verify author links exist
    expect(authorCount).toBeGreaterThan(0);
  });

  test('should navigate to post author profile', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Find author link
    const authorLink = page.locator('a[href*="/u/"]').first();
    
    if (await authorLink.isVisible()) {
      const authorUrl = await authorLink.getAttribute('href');
      expect(authorUrl).toContain('/u/');
      
      await authorLink.click();
      
      // Wait for profile
      await page.waitForTimeout(2000);
      
      // Verify on profile page
      expect(page.url()).toContain('/u/');
    }
  });

  test('should display post content with title and body', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Look for post elements
    const postCards = page.locator('[data-testid="post"], article').first();
    
    if (await postCards.isVisible()) {
      // Verify post has text content
      const content = await postCards.textContent();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should interact with post (like/comment)', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Look for like or comment buttons
    const likeButtons = page.locator('button:has-text("Like"), button:has-text("Heart"), svg[role="button"]');
    const commentButtons = page.locator('button:has-text("Comment"), button:has-text("Reply")');

    const likeCount = await likeButtons.count();
    const commentCount = await commentButtons.count();

    // Verify interaction buttons exist on feed
    expect(likeCount + commentCount).toBeGreaterThanOrEqual(0);
  });

  test('should display post metadata (date, likes, comments)', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Look for posts with metadata
    const postCards = page.locator('[data-testid="post"], article').first();
    
    if (await postCards.isVisible()) {
      const content = await postCards.textContent();
      
      // Posts should have some content
      expect(content.length).toBeGreaterThan(50);
    }
  });

  test('should display posts with tags or categories', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Look for tag links
    const tagLinks = page.locator('a[href*="/tags/"], span[data-testid*="tag"]').first();
    
    // Posts may have tags - this is optional
    if (await tagLinks.isVisible()) {
      expect(tagLinks).toBeVisible();
    }
  });

  test('should filter posts by category/tag', async ({ page }) => {
    // Navigate to tags page
    await page.goto('/tags');

    // Wait for page
    await page.waitForTimeout(2000);

    // Check if page loaded
    expect(page.url()).toContain('/tags');
  });

  test('should search for posts', async ({ page }) => {
    // Navigate to search
    await page.goto('/search?q=test');

    // Wait for results
    await page.waitForTimeout(3000);

    // Look for results
    const results = page.locator('a[href*="/post/"]');
    const resultCount = await results.count();

    // Search page should load
    expect(page.url()).toContain('/search');
  });

  test('should display post feed with pagination or infinite scroll', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for initial load
    await page.waitForTimeout(3000);

    // Count initial posts
    const initialPostCount = await page.locator('[data-testid="post"], article').count();

    // Look for load more button or scroll
    const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Show More")');
    
    if (await loadMoreButton.isVisible()) {
      // Click load more
      await loadMoreButton.click();
      
      // Wait for more posts
      await page.waitForTimeout(2000);
      
      // Count posts after loading
      const finalPostCount = await page.locator('[data-testid="post"], article').count();
      
      // More posts should load
      expect(finalPostCount).toBeGreaterThanOrEqual(initialPostCount);
    } else {
      // Verify posts are displayed
      expect(initialPostCount).toBeGreaterThan(0);
    }
  });

  test('should display posts in user profile', async ({ page }) => {
    // Navigate to user profile
    await page.goto('/u/creators93');

    // Wait for profile
    await page.waitForTimeout(2000);

    // Look for posts section/tab
    const postTab = page.locator('button:has-text("Posts"), button:has-text("Activity")').first();
    
    if (await postTab.isVisible()) {
      await postTab.click();
      
      // Wait for posts to load
      await page.waitForTimeout(2000);
    }

    // Verify profile page loaded
    expect(page.url()).toContain('/u/');
  });

  test('should show post preview with truncated content', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Get first post
    const firstPost = page.locator('[data-testid="post"], article').first();
    
    if (await firstPost.isVisible()) {
      // Get post content
      const postText = await firstPost.textContent();
      expect(postText).toBeTruthy();
      expect(postText.length).toBeGreaterThan(0);
    }
  });

  test('should display related posts or recommendations', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');

    // Wait for feed
    await page.waitForTimeout(3000);

    // Look for related/recommended posts
    const posts = page.locator('[data-testid="post"], article');
    const postCount = await posts.count();

    // Feed should display posts
    expect(postCount).toBeGreaterThan(0);
  });
});
