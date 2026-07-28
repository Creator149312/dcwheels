const { test, expect } = require('@playwright/test');

test.describe('Comments UX - Guest and Authenticated', () => {
    
    // 1. Guest User Tests
    test('guest user should be prompted to login when trying to comment', async ({ page }) => {
        await page.goto('/wheels/random-finger-generator');
        await page.waitForTimeout(3000);

        // Scroll to ensure trigger is visible
        await page.evaluate(() => window.scrollTo(0, 1000));
        await page.waitForTimeout(1000);

        const trigger = page.locator('button:has-text("Comments")').first();
        const commentBox = page.locator('textarea[placeholder="Add a comment..."]');

        if (await trigger.isVisible() && !(await commentBox.isVisible())) {
            await trigger.click();
            await page.waitForTimeout(1000);
        }

        const activeBox = page.locator('textarea[placeholder="Add a comment..."]');
        await expect(activeBox).toBeVisible();
        
        // Focus should trigger login prompt
        await activeBox.focus();

        const loginModal = page.locator('text=Sign in to continue');
        await expect(loginModal).toBeVisible();
    });

    // 2. Logged In User Tests
    test('authenticated user - full comment lifecycle', async ({ page }) => {
        // LOGIN
        await page.goto('/login');
        await page.fill('input[name="email"]', 'ironbritknight@example.uk');
        await page.fill('input[name="password"]', 'TowerGuard#47');
        await page.locator('button[type="submit"]').click();
        
        await page.waitForURL('**/explore**', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);

        // Access the specific wheel
        await page.goto('/wheels/random-finger-generator');
        await page.waitForTimeout(3000);

        // Open drawer if mobile
        const trigger = page.locator('button:has-text("Comments")').first();
        if (await trigger.isVisible()) {
            await trigger.click();
            await page.waitForTimeout(1000);
        }

        // POST
        const commentText = 'E2E ' + Date.now();
        const commentBox = page.locator('textarea[placeholder="Add a comment..."]');
        await commentBox.click();
        await commentBox.fill(commentText);
        
        await page.getByRole('button', { name: 'Comment', exact: true }).click();
        
        // Wait for the new comment text to appear in its own element
        const newComment = page.locator('div[class*="mt-0.5"]', { hasText: commentText }).first();
        await expect(newComment).toBeVisible({ timeout: 10000 });

        // EDIT
        const commentItem = page.locator('.group', { has: newComment }).first();
        const moreBtn = commentItem.locator('button:has(svg.lucide-more-horizontal)');
        await moreBtn.click();
        
        await page.locator('text=Edit').click();
        
        const editText = 'Edit ' + commentText;
        await commentItem.locator('textarea').fill(editText);
        await commentItem.getByRole('button', { name: 'Save', exact: true }).click();
        
        await expect(page.locator('text=' + editText).first()).toBeVisible();

        // DELETE
        await moreBtn.click();
        page.on('dialog', async dialog => {
            await dialog.accept();
        });
        await page.locator('text=Delete').click();
        
        await expect(page.locator('text=' + editText)).not.toBeVisible();
    });
});
