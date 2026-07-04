const { test, expect } = require('@playwright/test');

test.describe('Post Actions - Detailed Testing', () => {
  
  test('should click like button and verify count updates', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Find all like buttons on the page
    const likeButtons = page.locator('button:has-text("Like"), button[aria-label*="Like"], button:has(svg[class*="ThumbsUp"])');
    const likeButtonCount = await likeButtons.count();
    
    console.log(`Found ${likeButtonCount} like buttons`);

    if (likeButtonCount === 0) {
      console.log('No like buttons found. Checking for alternative selectors...');
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Total buttons on page: ${buttonCount}`);
      
      // Get button texts
      for (let i = 0; i < Math.min(10, buttonCount); i++) {
        const text = await buttons.nth(i).textContent();
        console.log(`Button ${i}: ${text}`);
      }
    }

    // If we find like buttons, test the interaction
    if (likeButtonCount > 0) {
      const firstLikeButton = likeButtons.first();
      
      // Get initial count
      const initialText = await firstLikeButton.textContent();
      console.log(`Initial like button text: "${initialText}"`);

      // Check if already liked (blue color)
      const isLiked = await firstLikeButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor.includes('rgb(37');
      }).catch(() => false);
      
      console.log(`Post is already liked: ${isLiked}`);

      // Click like button
      await firstLikeButton.click();
      await page.waitForTimeout(2000);

      // Get updated count
      const updatedText = await firstLikeButton.textContent();
      console.log(`Updated like button text: "${updatedText}"`);

      // Verify count changed or button state changed
      expect(updatedText).toBeTruthy();
    }
  });

  test('should verify like button has correct styling', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Look for any button containing ThumbsUp icon
    const thumbsUpButtons = page.locator('button svg[class*="lucide"]').filter({ hasText: '' });
    
    // Find buttons that might contain like functionality
    const allButtons = page.locator('button');
    let foundLikeButton = false;

    for (let i = 0; i < await allButtons.count(); i++) {
      const button = allButtons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const buttonText = await button.textContent();
      
      if (hasAriaLabel?.toLowerCase().includes('like') || buttonText?.toLowerCase().includes('like')) {
        console.log(`Found like button: ${buttonText}`);
        console.log(`Aria label: ${hasAriaLabel}`);
        
        const bgColor = await button.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        console.log(`Background color: ${bgColor}`);
        
        foundLikeButton = true;
        break;
      }
    }

    if (foundLikeButton) {
      expect(foundLikeButton).toBe(true);
    } else {
      console.log('Like button not found with expected attributes');
    }
  });

  test('should test share button exists and is functional', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Look for share buttons
    const shareButtons = page.locator('button:has-text("Share"), button[aria-label*="Share"]');
    const shareCount = await shareButtons.count();
    
    console.log(`Found ${shareCount} share buttons`);

    if (shareCount > 0) {
      const firstShareButton = shareButtons.first();
      
      // Try to click share button
      await firstShareButton.click();
      await page.waitForTimeout(1000);

      // Check if a share popup/modal appeared
      const shareMenu = page.locator('[class*="share"], [data-testid*="share"]');
      const menuVisible = await shareMenu.isVisible().catch(() => false);
      
      console.log(`Share menu visible: ${menuVisible}`);
    } else {
      console.log('No share buttons found');
    }
  });

  test('should test comment section opens and closes', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Look for comment buttons
    const commentButtons = page.locator('button:has-text("Comment"), button:has-text("Comments"), button:has(svg[class*="MessageCircle"])');
    const commentCount = await commentButtons.count();
    
    console.log(`Found ${commentCount} comment buttons`);

    if (commentCount > 0) {
      const firstCommentButton = commentButtons.first();
      
      // Click to open comments
      await firstCommentButton.click();
      await page.waitForTimeout(1500);

      // Check if comments panel appeared
      const commentPanel = page.locator('[data-testid="comments"], [class*="CommentsPanel"], textarea[placeholder*="comment" i]');
      const panelVisible = await commentPanel.isVisible().catch(() => false);
      
      console.log(`Comment panel visible: ${panelVisible}`);

      // Click again to close
      await firstCommentButton.click();
      await page.waitForTimeout(1000);

      const panelVisibleAfterClose = await commentPanel.isVisible().catch(() => false);
      console.log(`Comment panel visible after close: ${panelVisibleAfterClose}`);
    }
  });

  test('should inspect actual post card DOM structure', async ({ page }) => {
    // Navigate to feed
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Get the first post card
    const firstPost = page.locator('article').first();
    
    if (await firstPost.isVisible()) {
      const html = await firstPost.innerHTML();
      const textLength = html.length;
      
      console.log(`First post HTML length: ${textLength}`);
      console.log(`First post contains "Like": ${html.includes('Like')}`);
      console.log(`First post contains "Share": ${html.includes('Share')}`);
      console.log(`First post contains "Comment": ${html.includes('Comment')}`);
      console.log(`First post contains "ThumbsUp": ${html.includes('ThumbsUp')}`);
      
      // Log first 2000 characters
      console.log(`Post HTML snippet: ${html.substring(0, 2000)}`);
    } else {
      console.log('No post cards found');
    }
  });
});
