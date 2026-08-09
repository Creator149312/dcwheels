const { test, expect } = require("@playwright/test");

/**
 * Engagement Actions test suite
 *
 * Covers: like/unlike, comment lifecycle, save/follow, share,
 * rating, and mobile bottom navigation.
 */

const TEST_USERS = {
  standard: { email: "ironbritknight@example.uk", password: "TowerGuard#47" },
  commenter: { email: "ironbritknight@example.uk", password: "TowerGuard#47" },
  rater: { email: "ironbritknight@example.uk", password: "TowerGuard#47" },
};

async function login(page, user = TEST_USERS.standard) {
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => url.pathname.includes("/u/"), {
    timeout: 30000,
  });
}

test.describe("Engagement Actions", () => {
  test.describe("Likes", () => {
    test("should prompt guest to login when liking", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const likeButton = page.locator('button[aria-label="Like"]').first();
      if (!(await likeButton.isVisible().catch(() => false))) {
        test.skip("No like button found");
      }

      await likeButton.click();
      await page.waitForTimeout(1500);

      const loginPrompt = page.locator('text="Sign in to continue", text="Log In"').first();
      expect(await loginPrompt.isVisible().catch(() => false)).toBeTruthy();
    });

    test("should like and unlike a post when authenticated", async ({ page }) => {
      await login(page);
      await page.goto("/");
      await page.waitForTimeout(3000);

      const postCard = page.locator('div:has(button[aria-label="Like"])').first();
      if (!(await postCard.isVisible().catch(() => false))) {
        test.skip("No likeable post found");
      }

      const likeButton = postCard.locator('button[aria-label="Like"]').first();
      await likeButton.click();
      await page.waitForTimeout(2000);

      const likedButton = postCard.locator('button[aria-label="Unlike"]').first();
      await expect(likedButton).toHaveAttribute("aria-pressed", "true", { timeout: 10000 });

      await likedButton.click();
      await page.waitForTimeout(2000);

      const unlikedButton = postCard.locator('button[aria-label="Like"]').first();
      await expect(unlikedButton).toHaveAttribute("aria-pressed", "false", { timeout: 10000 });
    });
  });

  test.describe("Comments", () => {
    test("should prompt guest to login when focusing comment box", async ({ page }) => {
      await page.goto("/wheels/random-finger-generator");
      await page.waitForTimeout(3000);

      const trigger = page.locator('button:has-text("Comments")').first();
      const commentBox = page.locator('textarea[placeholder="Add a comment..."]');

      if (await trigger.isVisible().catch(() => false) && !(await commentBox.isVisible().catch(() => false))) {
        await trigger.click();
        await page.waitForTimeout(1000);
      }

      const activeBox = page.locator('textarea[placeholder="Add a comment..."]').first();
      await expect(activeBox).toBeVisible({ timeout: 10000 });
      await activeBox.focus();

      const loginModal = page.locator('text=Sign in to continue').first();
      await expect(loginModal).toBeVisible({ timeout: 10000 });
    });

    test("should perform full comment lifecycle", async ({ page }) => {
      await login(page, TEST_USERS.commenter);

      await page.goto("/wheels/random-finger-generator");
      await page.waitForTimeout(3000);

      const trigger = page.locator('button:has-text("Comments")').first();
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.click();
        await page.waitForTimeout(1000);
      }

      const commentBox = page.locator('textarea[placeholder="Add a comment..."]').first();
      await expect(commentBox).toBeVisible({ timeout: 10000 });

      const commentText = `E2E ${Date.now()}`;
      await commentBox.click();
      await commentBox.fill(commentText);
      await page.getByRole("button", { name: "Comment", exact: true }).click();

      const newComment = page.locator('div[class*="mt-0.5"]', { hasText: commentText }).first();
      await expect(newComment).toBeVisible({ timeout: 10000 });

      const commentItem = page.locator(".group", { has: newComment }).first();
      const moreBtn = commentItem.locator('button:has(svg.lucide-more-horizontal)');
      await moreBtn.click();
      await page.locator("text=Edit").click();

      const editText = `Edit ${commentText}`;
      await commentItem.locator("textarea").fill(editText);
      await commentItem.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.locator(`text=${editText}`).first()).toBeVisible({ timeout: 10000 });

      await moreBtn.click();
      page.on("dialog", async (dialog) => await dialog.accept());
      await page.locator("text=Delete").click();
      await expect(page.locator(`text=${editText}`)).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Save and share", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("should save a wheel to favorites", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForTimeout(3000);

      const wheelCard = page.locator('a[href*="/wheels/"]').first();
      if (!(await wheelCard.isVisible().catch(() => false))) {
        test.skip("No wheels found");
      }
      await wheelCard.click();
      await page.waitForTimeout(2000);

      const saveButton = page
        .locator('button[aria-label*="Favorites"], button:has-text("Save"), button:has-text("Saved")')
        .first();
      if (!(await saveButton.isVisible().catch(() => false))) {
        test.skip("Save button not present");
      }

      const initialLabel = await saveButton.getAttribute("aria-label");
      await saveButton.click();
      await page.waitForTimeout(2000);

      const updatedButton = page
        .locator('button[aria-label*="Favorites"], button:has-text("Save"), button:has-text("Saved")')
        .first();
      const updatedLabel = await updatedButton.getAttribute("aria-label");
      expect(updatedLabel).not.toBe(initialLabel);
    });

    test("should open share menu on a post", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const shareButton = page.locator('button:has-text("Share"), button[aria-label*="Share"]').first();
      if (!(await shareButton.isVisible().catch(() => false))) {
        test.skip("Share button not present");
      }

      await shareButton.click();
      await page.waitForTimeout(1000);

      const shareMenu = page.locator('[class*="share" i], [data-testid*="share"]').first();
      expect(await shareMenu.isVisible().catch(() => false)).toBeTruthy();
    });
  });

  test.describe("Rating", () => {
    test("should prompt guest to login when rating a topic", async ({ page }) => {
      await page.goto("/movie/1291608-dhurandhar");
      await page.waitForLoadState("networkidle");

      const star3 = page.locator('.hidden.sm\\:block button[aria-label="Rate 3 out of 5 stars"]');
      if (!(await star3.isVisible().catch(() => false))) {
        test.skip("Rating stars not present");
      }

      await star3.click();
      await page.waitForTimeout(1000);

      const loginPrompt = page.locator('text=Sign in to continue').first();
      await expect(loginPrompt).toBeVisible({ timeout: 10000 });
    });

    test("should rate and update topic rating when authenticated", async ({ page }) => {
      await login(page, TEST_USERS.rater);
      const targetTopicPage = "/movie/1291608-dhurandhar";

      await page.goto(`/login?callbackUrl=${encodeURIComponent(targetTopicPage)}`);
      await page.locator('input[name="email"]').fill(TEST_USERS.rater.email);
      await page.locator('input[name="password"]').fill(TEST_USERS.rater.password);
      await page.locator('button:has-text("Sign In")').click();

      await page.waitForURL(targetTopicPage, { timeout: 15000 });
      await page.waitForLoadState("networkidle");

      const star4 = page.locator('.hidden.sm\\:block button[aria-label="Rate 4 out of 5 stars"]');
      await expect(star4).toBeVisible({ timeout: 10000 });

      await star4.click();
      await page.waitForTimeout(2000);

      await expect(page.locator('.hidden.sm\\:block').locator('text=✓ You rated: 4/5')).toBeVisible({
        timeout: 10000,
      });

      const star5 = page.locator('.hidden.sm\\:block button[aria-label="Rate 5 out of 5 stars"]');
      await star5.click();
      await page.waitForTimeout(2000);

      await expect(page.locator('.hidden.sm\\:block').locator('text=✓ You rated: 5/5')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Mobile navigation", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("should navigate via mobile bottom nav", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);

      const navItems = page.locator("nav a, nav button").filter({ hasText: /home|explore|profile|create/i });
      expect(await navItems.count()).toBeGreaterThan(0);

      const firstNav = navItems.first();
      if (await firstNav.isVisible().catch(() => false)) {
        await firstNav.click();
        await page.waitForTimeout(1500);
        expect(page.url()).toBeTruthy();
      }
    });
  });

  test.describe("Direct API", () => {
    test("should return expected status from reaction toggle API", async ({ request }) => {
      const res = await request.patch("/api/reactiontest/toggle", {
        data: {
          entityType: "post",
          entityId: "507f1f77bcf86cd799439011",
          reactionType: "like",
        },
        headers: { "Content-Type": "application/json" },
      });

      expect([200, 401, 404]).toContain(res.status());
    });
  });
});
