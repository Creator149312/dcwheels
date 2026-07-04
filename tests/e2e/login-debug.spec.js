const { test, expect } = require('@playwright/test');

test('Login Debug', async ({ page }) => {
  await page.goto('/login');
  await page.waitForTimeout(2000);

  // Fill in email
  await page.fill('input[name="email"], input[type="email"]', 'dharamveer@email.com');
  
  // Fill in password
  await page.fill('input[name="password"], input[type="password"]', 'Dharam@1@');

  // Click sign in button
  await page.click('button:has-text("Sign in"), button:has-text("Login")');
  
  // Wait a bit to see what happens
  await page.waitForTimeout(5000);
  
  console.log('Current URL:', page.url());
  await page.screenshot({ path: 'login-debug.png' });
  
  const errorText = await page.textContent('body');
  if (errorText.includes('Invalid email or password')) {
    console.log('Error message found: Invalid email or password');
  } else {
    console.log('No specific error text found in body');
  }

  const userCircle = await page.locator('button .lucide-user-circle, button svg').isVisible();
  console.log('User circle or SVG in button visible:', userCircle);

  // Try other password if it failed
  if (!userCircle && page.url().includes('/login')) {
      console.log('Login failed with Dharam@1@. Trying dharamveer...');
      await page.fill('input[name="password"]', 'dharamveer');
      await page.click('button:has-text("Sign in")');
      await page.waitForTimeout(5000);
      console.log('Current URL after 2nd try:', page.url());
      const userCircle2 = await page.locator('button .lucide-user-circle').isVisible();
      console.log('User circle visible after 2nd try:', userCircle2);
  }
});