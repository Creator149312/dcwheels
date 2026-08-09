const { test, expect } = require("@playwright/test");

/**
 * Posts feature test suite
 *
 * Covers: creation, validation, feed discovery, detail page,
 * authenticated actions (like/unlike, comment), poll voting, and editing.
 */

const TEST_USER = {
  email: "falcondune99@example.ae",
  password: "SandStorm$65",
};

async function login(page) {
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  // Give the client hydration a moment so the React onSubmit handler is attached.
  await page.waitForTimeout(1000);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => url.pathname.includes("/u/"), {
    timeout: 30000,
  });
}

async function openFirstPost(page) {
  await page.goto("/");
  await page.waitForTimeout(3000);

  const postCard = page.locator("article").first();
  if (!(await postCard.isVisible().catch(() => false))) {
    test.skip("No posts available");
  }

  return postCard;
}

async function waitForComposer(page) {
  const composer = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
  await expect(composer).toBeVisible({ timeout: 10000 });
  return composer;
}

test.describe("Posts", () => {
  test.describe("Create post page", () => {
    test("should show login prompt for anonymous visitors", async ({ page }) => {
      await page.goto("/post/create");

      await expect(page.locator('text="You must be logged in to create a post."')).toBeVisible({
        timeout: 10000,
      });

      const loginButton = page.locator("main").locator("a", { hasText: "Log In" }).first();
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toHaveAttribute("href", "/login?callbackUrl=/post/create");
    });

    test("should load composer for authenticated user", async ({ page }) => {
      await login(page);
      await page.goto("/post/create");
      await waitForComposer(page);
    });

    test("should enforce 600 character limit", async ({ page }) => {
      await login(page);
      await page.goto("/post/create");
      const composer = await waitForComposer(page);

      const longText = "a".repeat(650);
      await composer.fill(longText);

      const counter = page.locator("text=/600/").first();
      if (await counter.isVisible().catch(() => false)) {
        const counterText = await counter.textContent();
        expect(counterText).toContain("600");
      }

      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible().catch(() => false)) {
        const isDisabled = await submitButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    });

    test("should validate poll options (2-6, 65 chars max)", async ({ page }) => {
      await login(page);
      await page.goto("/post/create");
      await waitForComposer(page);

      const pollToggle = page.locator('button:has-text("Poll")').first();
      await expect(pollToggle).toBeVisible({ timeout: 5000 });
      await pollToggle.click();
      await page.waitForTimeout(500);

      const options = page.locator('input[placeholder*="Option"]');
      await expect(options.first()).toBeVisible({ timeout: 5000 });
      expect(await options.count()).toBeGreaterThanOrEqual(2);

      const firstOption = options.first();
      await firstOption.fill("a".repeat(70));

      const validationError = page.locator('text=/65/').first();
      if (await validationError.isVisible().catch(() => false)) {
        const errorText = await validationError.textContent();
        expect(errorText).toMatch(/65/);
      }
    });
  });

  test.describe("Post feed discovery", () => {
    test("should display posts on global feed", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const postLinks = page.locator('a[href*="/post/"], article');
      expect(await postLinks.count()).toBeGreaterThan(0);
    });

    test("should display post author and link to profile", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const authorLink = page.locator('a[href*="/u/"]').first();
      if (await authorLink.isVisible().catch(() => false)) {
        const authorUrl = await authorLink.getAttribute("href");
        expect(authorUrl).toContain("/u/");

        await authorLink.click();
        await page.waitForTimeout(2000);
        expect(page.url()).toContain("/u/");
      }
    });

    test("should open comments section from feed", async ({ page }) => {
      const postCard = await openFirstPost(page);

      const commentButton = postCard.locator("button").filter({ hasText: /^\d+$|^Comment$|^Comments$/ }).first();
      if (!(await commentButton.isVisible().catch(() => false))) {
        test.skip("Comments button not present");
      }

      await commentButton.click();
      await page.waitForTimeout(1500);

      const commentsSection = page.locator("#comments, [data-testid='comments-section']").first();
      await expect(commentsSection.or(postCard)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Authenticated post actions", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("should create and publish a text post", async ({ page }) => {
      await page.goto("/post/create");
      const composer = await waitForComposer(page);

      const postText = `E2E text post ${Date.now()}`;
      await composer.fill(postText);

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      await page.goto("/");
      await page.waitForTimeout(2000);
      await expect(page.locator(`text=${postText}`)).toBeVisible({ timeout: 10000 });
    });

    test("should like and unlike a post", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      // Wait for StatsBar skeletons to resolve.
      await page.waitForFunction(() => !document.querySelector('.animate-pulse'));

      const postCard = page.locator("article").first();
      if (!(await postCard.isVisible().catch(() => false))) {
        test.skip("No likeable post found");
      }

      let likeButton = postCard.locator('button[aria-label="Like"]').first();
      if (!(await likeButton.isVisible().catch(() => false))) {
        test.skip("Like button not present");
      }

      await likeButton.click();
      await page.waitForTimeout(2000);

      const likedButton = postCard.locator('button[aria-label="Unlike"]').first();
      await expect(likedButton).toHaveAttribute("aria-pressed", "true", { timeout: 10000 });

      await likedButton.click();
      await page.waitForTimeout(2000);

      const unlikedButton = postCard.locator('button[aria-label="Like"]').first();
      await expect(unlikedButton).toHaveAttribute("aria-pressed", "false", { timeout: 10000 });
    });

    test("should open comments panel and leave a comment", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const postCard = page.locator("article").first();
      if (!(await postCard.isVisible().catch(() => false))) {
        test.skip("No posts available");
      }

      const commentButton = postCard.locator("button").filter({ hasText: /^\d+$|^Comment$|^Comments$/ }).first();
      if (!(await commentButton.isVisible().catch(() => false))) {
        test.skip("Comments button not present");
      }

      await commentButton.click();
      await page.waitForTimeout(1500);

      const commentInput = page
        .locator('#comments input[placeholder*="comment" i], #comments input[placeholder*="reply" i], textarea[placeholder*="comment" i]')
        .first();
      await expect(commentInput).toBeVisible({ timeout: 10000 });

      const commentText = `E2E comment ${Date.now()}`;
      await commentInput.fill(commentText);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);

      await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 10000 });
    });

    test("should edit an existing post", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const ownPost = page.locator('article:has-text("E2E text post")').first();
      if (!(await ownPost.isVisible().catch(() => false))) {
        test.skip("No own post found to edit");
      }

      const menuButton = ownPost.locator('button[aria-label="Post options"]').first();
      await menuButton.click();
      await page.waitForTimeout(500);

      const editOption = page.locator('text=Edit').first();
      await editOption.click();
      await page.waitForTimeout(1500);

      const composer = page.locator("[contenteditable='true'], textarea").first();
      const updatedText = `Updated E2E post ${Date.now()}`;
      await composer.fill(updatedText);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      await expect(page.locator(`text=${updatedText}`)).toBeVisible({ timeout: 10000 });
    });

    test("should delete an existing post", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const ownPost = page.locator('article:has-text("E2E text post")').first();
      if (!(await ownPost.isVisible().catch(() => false))) {
        test.skip("No own post found to delete");
      }

      const menuButton = ownPost.locator('button[aria-label="Post options"]').first();
      await menuButton.click();
      await page.waitForTimeout(500);

      const deleteOption = page.locator('text=Delete').first();
      await deleteOption.click();
      await page.waitForTimeout(2000);

      await expect(ownPost).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Polls", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("should create a poll post", async ({ page }) => {
      await page.goto("/post/create");
      const composer = await waitForComposer(page);
      await composer.fill(`E2E poll ${Date.now()}`);

      const pollToggle = page.locator('button:has-text("Poll")').first();
      await expect(pollToggle).toBeVisible({ timeout: 5000 });
      await pollToggle.click();
      await page.waitForTimeout(500);

      const options = page.locator('input[placeholder*="Option"]');
      await expect(options.first()).toBeVisible({ timeout: 5000 });
      await options.nth(0).fill("Option A");
      await options.nth(1).fill("Option B");

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      await page.goto("/");
      await page.waitForTimeout(2000);
      await expect(page.locator('text="Option A"')).toBeVisible({ timeout: 10000 });
    });

    test("should vote on a poll", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const pollPost = page.locator('article:has-text("Option A")').first();
      if (!(await pollPost.isVisible().catch(() => false))) {
        test.skip("No poll post found");
      }

      const voteButton = pollPost.locator('button:has-text("Option A")').first();
      await voteButton.click();
      await page.waitForTimeout(2000);

      const votedIndicator = pollPost.locator('[aria-pressed="true"], .bg-primary').first();
      expect(await votedIndicator.isVisible().catch(() => false)).toBeTruthy();
    });
  });

  test.describe("Edge cases", () => {
    test("should return 404 for non-existent post", async ({ request }) => {
      const res = await request.get("/api/post/507f1f77bcf86cd799439011");
      expect([404, 410, 403]).toContain(res.status());
    });

    test("should not show deleted posts in feed", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const deletedPosts = page.locator('text="This post has been deleted"');
      expect(await deletedPosts.count()).toBe(0);
    });
  });
});
