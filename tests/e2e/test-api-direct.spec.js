const { test, expect } = require('@playwright/test');

test('directly test the reaction toggle API with response body', async ({ page, context }) => {
  // First navigate to home to establish session
  await page.goto('/');
  await page.waitForTimeout(2000);

  // Login first
  const loginButton = page.locator('button:has-text("Login")').first();
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.waitForTimeout(1000);
    
    // Fill login form
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForTimeout(3000);
    }
  }

  // Now try to call the API directly
  const response = await page.request.patch('/api/reactiontest/toggle', {
    data: {
      entityType: 'post',
      entityId: '507f1f77bcf86cd799439011',
      reactionType: 'like'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });

  console.log(`API Response Status: ${response.status()}`);
  
  try {
    const body = await response.text();
    console.log(`API Response Body: ${body}`);
  } catch (e) {
    console.log(`Failed to read response body: ${e.message}`);
  }

  // Log response headers
  const headers = response.headers();
  console.log(`Response Content-Type: ${headers['content-type']}`);
});
