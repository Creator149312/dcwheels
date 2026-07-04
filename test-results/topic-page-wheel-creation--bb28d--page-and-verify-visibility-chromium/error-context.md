# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: topic-page-wheel-creation.spec.js >> Topic Page Wheel Creation and Visibility >> should create a wheel on game page and verify visibility
- Location: tests\e2e\topic-page-wheel-creation.spec.js:39:5

# Error details

```
Error: page.screenshot: Target crashed 
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('Topic Page Wheel Creation and Visibility', () => {
  4  |   const testTag = `testtag_${Date.now()}`;
  5  |   const topics = [
  6  |     { type: 'game', slug: '19301-counter-strike', name: 'Counter-Strike' },
  7  |     { type: 'anime', slug: '207141-chainsmoker-cat', name: 'Chainsmoker Cat' },
  8  |     { type: 'movie', slug: '1081003-supergirl', name: 'Supergirl' },
  9  |     { type: 'character', slug: '45627-levi', name: 'Levi' }
  10 |   ];
  11 | 
  12 |   test.beforeEach(async ({ page }) => {
  13 |     // Login
  14 |     await page.goto('/login');
  15 |     await page.waitForSelector('input[name="email"]');
  16 |     
  17 |     // Clear and fill to be safe
  18 |     await page.fill('input[name="email"]', '');
  19 |     await page.type('input[name="email"]', 'dharamveer@email.com');
  20 |     await page.fill('input[name="password"]', '');
  21 |     await page.type('input[name="password"]', '123456');
  22 |     
  23 |     console.log('Fired login submit...');
  24 |     await page.click('button[type="submit"]');
  25 | 
  26 |     // Wait for login redirect - allow for both dashboard and profile pages
  27 |     try {
  28 |       await page.waitForResponse(resp => resp.url().includes('/api/auth/callback/credentials') && resp.status() === 200, { timeout: 30000 });
  29 |       await page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname.includes('/u/'), { timeout: 30000 });
  30 |       console.log('Login successful');
  31 |     } catch (e) {
  32 |       console.log('Login wait failed. Current URL:', page.url());
> 33 |       await page.screenshot({ path: `login-debug-${Date.now()}.png` });
     |                  ^ Error: page.screenshot: Target crashed 
  34 |       throw e;
  35 |     }
  36 |   });
  37 | 
  38 |   for (const topic of topics) {
  39 |     test(`should create a wheel on ${topic.type} page and verify visibility`, async ({ page }) => {
  40 |       const wheelTitle = `Wheel for ${topic.name} ${Date.now()}`;
  41 |       const topicUrl = `/${topic.type}/${topic.slug}`;
  42 |       
  43 |       console.log(`Testing topic: ${topic.name} at ${topicUrl}`);
  44 | 
  45 |       // 1. Navigate to Topic Page
  46 |       await page.goto(topicUrl);
  47 |       
  48 |       // 2. Click "Spin Wheel" in Community Discussion
  49 |       const spinWheelLink = page.locator('a:has-text("Spin Wheel")').first();
  50 |       await expect(spinWheelLink).toBeVisible();
  51 |       await spinWheelLink.click();
  52 | 
  53 |       // 3. Verify redirected to creation page
  54 |       await page.waitForURL('**/wheels/create**');
  55 |       
  56 |       // 4. Click Save button
  57 |       const saveBtn = page.locator('button:has-text("Save")').first();
  58 |       await expect(saveBtn).toBeVisible();
  59 |       await saveBtn.click();
  60 | 
  61 |       // 5. Fill Save Dialog
  62 |       await page.waitForSelector('input#name');
  63 |       await page.fill('input#name', wheelTitle);
  64 |       await page.fill('textarea#description', `This is an automated test wheel for ${topic.name}.`);
  65 |       
  66 |       // Add tags
  67 |       await page.fill('input[placeholder*="Add tags"]', 'automated_test');
  68 |       await page.keyboard.press('Enter');
  69 |       await page.fill('input[placeholder*="Add tags"]', testTag);
  70 |       await page.keyboard.press('Enter');
  71 | 
  72 |       // 6. Submit
  73 |       await page.click('button[type="submit"]:has-text("Save as New")');
  74 | 
  75 |       // 7. Wait for success and redirect or toast
  76 |       // Usually it redirects to the wheel page or shows a toast. 
  77 |       // Based on useSaveWheel, it might redirect or just close the dialog.
  78 |       // Let's wait for the dialog to close.
  79 |       await expect(page.locator('text=Save Wheel')).not.toBeVisible({ timeout: 15000 });
  80 | 
  81 |       // 8. Verify visibility on Topic Page
  82 |       await page.goto(topicUrl);
  83 |       // It might take a moment to appear in the feed due to caching or DB async
  84 |       await page.waitForTimeout(3000); 
  85 |       await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();
  86 | 
  87 |       // 9. Verify visibility in Global Feed
  88 |       await page.goto('/explore');
  89 |       await page.waitForTimeout(2000);
  90 |       await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();
  91 | 
  92 |       // 10. Verify visibility in Tag Feed
  93 |       await page.goto(`/tags/${testTag}`);
  94 |       await page.waitForTimeout(2000);
  95 |       await expect(page.locator(`text=${wheelTitle}`)).toBeVisible();
  96 |     });
  97 |   }
  98 | });
  99 | 
```