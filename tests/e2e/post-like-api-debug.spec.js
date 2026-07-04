const { test, expect } = require('@playwright/test');

test.describe('Post Like API Response Testing', () => {

  test('should inspect API response when clicking like', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Set up request/response monitoring
    let apiResponse = null;
    let apiError = null;

    page.on('response', async (response) => {
      if (response.url().includes('reactiontest/toggle')) {
        try {
          const text = await response.text();
          apiResponse = {
            status: response.status(),
            url: response.url(),
            body: text,
            ok: response.ok()
          };
          console.log(`API Response: ${text}`);
        } catch (e) {
          apiError = e.message;
        }
      }
    });

    // Find like button
    const likeButton = page.locator('button[aria-label="Like"]').first();
    
    if (await likeButton.isVisible()) {
      console.log('Found like button');
      
      // Get initial state
      const initialText = await likeButton.textContent();
      console.log(`Initial like count: ${initialText}`);

      // Click like button
      await likeButton.click();
      console.log('Clicked like button');

      // Wait for API response
      await page.waitForTimeout(3000);

      // Check if API was called
      if (apiResponse) {
        console.log(`API Status: ${apiResponse.status}`);
        console.log(`API Response Body: ${apiResponse.body}`);
      } else if (apiError) {
        console.log(`API Error: ${apiError}`);
      } else {
        console.log('No API response captured');
      }

      // Check final state
      const finalText = await likeButton.textContent();
      console.log(`Final like count: ${finalText}`);
    }

    return {
      apiResponse,
      apiError
    };
  });

  test('should check console for errors during like action', async ({ page }) => {
    // Collect console messages
    const logs = [];
    const errors = [];

    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    // Navigate to home
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Find and click like button
    const likeButton = page.locator('button[aria-label="Like"]').first();
    
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(2000);
    }

    // Log console output
    console.log(`Console logs: ${logs.length}`);
    logs.forEach(log => {
      if (log.includes('error') || log.includes('reaction') || log.includes('Error')) {
        console.log(`  - ${log}`);
      }
    });

    console.log(`Console errors: ${errors.length}`);
    errors.forEach(err => {
      console.log(`  - ${err}`);
    });

    return {
      totalLogs: logs.length,
      errorCount: errors.length,
      errors: errors
    };
  });

  test('should manually test the reactiontest API endpoint', async ({ page, context }) => {
    // First, check if we're authenticated
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Get cookies to pass to API
    const cookies = await context.cookies();
    console.log(`Cookies available: ${cookies.length}`);

    // Try to call the API directly
    try {
      const response = await page.request.patch('/api/reactiontest/toggle', {
        data: {
          entityType: 'post',
          entityId: '507f1f77bcf86cd799439011', // dummy ID for testing
          reactionType: 'like'
        }
      });

      const responseBody = await response.json().catch(() => null);
      
      console.log(`API Status: ${response.status()}`);
      console.log(`API Response: ${JSON.stringify(responseBody)}`);

      return {
        status: response.status(),
        body: responseBody
      };
    } catch (error) {
      console.log(`API Error: ${error.message}`);
      return {
        error: error.message
      };
    }
  });
});
