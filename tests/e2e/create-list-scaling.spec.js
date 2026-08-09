const { test, expect } = require('@playwright/test');

test.describe('List Creation and SEO Routing', () => {
    test('should create a new list and redirect to SEO friendly URL', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.fill('input[name="email"]', 'creators93@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for login redirection
        await page.waitForURL('**/u/**');

        // 2. Go to Create List page
        await page.goto('/lists/create');
        await page.waitForTimeout(2000);

        // 3. Fill the form
        const listName = `Final Scaling Test ${Date.now()}`;
        await page.fill('input[name="title"]', listName);
        await page.fill('textarea[name="description"]', 'This is a test list created for scaling verification.');
        
        // Select visibility if present
        const visibilitySelect = page.locator('select[name="visibility"]');
        if (await visibilitySelect.isVisible()) {
            await visibilitySelect.selectOption('public');
        }

        // 4. Submit
        await page.click('button[type="submit"]');

        // 5. Verify Redirection to SEO URL pattern /[id]/[slug]
        // The URL should be like /lists/6a.../final-scaling-test-...
        await page.waitForURL(/\/lists\/[a-f\d]{24}\/final-scaling-test-.*/, { timeout: 15000 });
        
        const currentUrl = page.url();
        console.log('List Created at URL:', currentUrl);

        // 6. Verify Content on page
        const titleHeading = page.locator('h1');
        await expect(titleHeading).toContainText(listName);
        
        // 7. Check if the list appears in the profile
        await page.goto('/u/creators93');
        await page.click('button:has-text("Lists")');
        await expect(page.locator(`text=${listName}`)).toBeVisible();
    });
});
