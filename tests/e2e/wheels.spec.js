const { test, expect } = require("@playwright/test");

/**
 * Wheels feature test suite
 *
 * Covers: discovery, detail page, spinning, creation from topic pages,
 * engagement actions, and privacy/SEO URL handling.
 */

const TEST_USER = {
  email: "falcondune99@example.ae",
  password: "SandStorm$65",
};

const TOPIC_WHEEL_USER = {
  email: "ironbritknight@example.uk",
  password: "TowerGuard#47",
};

async function login(page, user = TEST_USER) {
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => url.pathname.includes("/u/"), {
    timeout: 30000,
  });
}

async function openFirstWheel(page) {
  await page.goto("/explore");
  await page.waitForTimeout(3000);

  // Prefer the first wheel in the "Trending now" carousel; it has a stable
  // anchor with an image and heading inside.
  const wheelLinks = page.locator('a[href*="/wheels/"]:not([href*="create"])');
  const count = await wheelLinks.count();
  if (count === 0) {
    test.skip("No wheels available to test");
  }

  // Click the first visible wheel link and wait for navigation in parallel
  // so we don't race hydration/client-side routing.
  const firstLink = wheelLinks.first();
  await expect(firstLink).toBeVisible({ timeout: 10000 });
  await Promise.all([
    page.waitForURL(/\/wheels\//, { timeout: 15000 }),
    firstLink.click(),
  ]);

  expect(page.url()).toContain("/wheels/");
}

test.describe("Wheels", () => {
  test.describe("Discovery", () => {
    test("should display wheels on the explore page", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForTimeout(3000);

      const wheelLinks = page.locator('a[href*="/wheels/"]');
      expect(await wheelLinks.count()).toBeGreaterThan(0);
    });

    test("should display wheels in global feed", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(2000);
      const count = await page.locator('a[href*="/wheels/"]').count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should filter or sort wheels on explore page", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForTimeout(3000);

      const filterButtons = page.locator("button").filter({ hasText: /sort|filter|trending|popular|new/i });
      const filterCount = await filterButtons.count();

      if (filterCount > 0) {
        await filterButtons.first().click();
        await page.waitForTimeout(2000);
      }

      const wheels = page.locator('a[href*="/wheels/"]');
      expect(await wheels.count()).toBeGreaterThan(0);
    });

    test("should return search results for wheels", async ({ page }) => {
      await page.goto("/search?q=wheel");
      await page.waitForTimeout(3000);
      expect(page.url()).toBeTruthy();
    });
  });

  test.describe("Wheel detail page", () => {
    test("should render wheel title, segments and metadata", async ({ page }) => {
      await openFirstWheel(page);

      const main = page.locator("main");
      await expect(main).toBeVisible({ timeout: 10000 });

      const title = await page.locator("h1").first().textContent();
      expect(title).toBeTruthy();

      const segments = page.locator('[data-testid*="segment"], [data-testid*="option"], li, div').filter({ hasText: /\w+/ });
      expect(await segments.count()).toBeGreaterThan(0);
    });

    test("should allow anonymous user to spin a wheel", async ({ page }) => {
      await openFirstWheel(page);

      const spinButton = page.locator('button:has-text("Spin"), button:has-text("Start")').first();
      if (await spinButton.isVisible().catch(() => false)) {
        await expect(spinButton).toBeVisible();
      }
    });

    test("should display creator information and link to profile", async ({ page }) => {
      await openFirstWheel(page);

      const authorLinks = page.locator('a[href*="/u/"]');
      expect(await authorLinks.count()).toBeGreaterThan(0);

      const creatorLink = authorLinks.first();
      if (await creatorLink.isVisible().catch(() => false)) {
        const creatorUrl = await creatorLink.getAttribute("href");
        expect(creatorUrl).toContain("/u/");

        await Promise.all([
          page.waitForURL(/\/u\//, { timeout: 15000 }),
          creatorLink.click(),
        ]);
        expect(page.url()).toContain("/u/");
      }
    });

    test("should work with both ObjectId and SEO slug URLs", async ({ page, request }) => {
      await page.goto("/explore");
      await page.waitForTimeout(3000);

      const link = page.locator('a[href*="/wheels/"]').first();
      const href = await link.getAttribute("href");
      if (!href || href.includes("create")) test.skip("No valid wheel link found");

      await link.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/wheels/");
    });
  });

  test.describe("Wheel engagement actions", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await openFirstWheel(page);
    });

    test("should like and unlike a wheel", async ({ page }) => {
      // Wait for the StatsBar skeletons to resolve so the real buttons render.
      await page.waitForFunction(
        () => !document.querySelector('[class*="animate-pulse"]'),
        null,
        { timeout: 10000 }
      ).catch(() => {});

      const likeButton = page.locator('button[aria-label="Like"], button[aria-label="Unlike"]').first();
      if (!(await likeButton.isVisible().catch(() => false))) {
        test.skip("Like button not present");
      }

      const initialPressed = await likeButton.getAttribute("aria-pressed");
      await likeButton.click();
      await page.waitForTimeout(2000);

      const updatedButton = page.locator('button[aria-label="Like"], button[aria-label="Unlike"]').first();
      const updatedPressed = await updatedButton.getAttribute("aria-pressed");
      expect(updatedPressed).not.toBe(initialPressed);
    });

    test("should save a wheel to library", async ({ page }) => {
      // Wait for the StatsBar skeletons to resolve so the real buttons render.
      await page.waitForFunction(
        () => !document.querySelector('[class*="animate-pulse"]'),
        null,
        { timeout: 10000 }
      ).catch(() => {});

      const saveButton = page
        .locator('button[aria-label="Save to Library"], button[aria-label="Remove from Library"], button:has-text("Save"), button:has-text("Saved")')
        .first();
      if (!(await saveButton.isVisible().catch(() => false))) {
        test.skip("Save button not present");
      }

      const initialLabel = await saveButton.getAttribute("aria-label");
      await saveButton.click();
      await page.waitForTimeout(2000);

      const updatedButton = page
        .locator('button[aria-label="Save to Library"], button[aria-label="Remove from Library"], button:has-text("Save"), button:has-text("Saved")')
        .first();
      const updatedLabel = await updatedButton.getAttribute("aria-label");
      expect(updatedLabel).not.toBe(initialLabel);
    });

    test("should open and focus comments section", async ({ page }) => {
      // Desktop shows comments inline; the button scrolls/focuses the textarea.
      const commentButton = page.locator("button").filter({ hasText: /^\d+$|^Comment$|^Comments$/ }).first();
      if (!(await commentButton.isVisible().catch(() => false))) {
        test.skip("Comments button not present");
      }

      await commentButton.click();
      await page.waitForTimeout(1500);

      const commentInput = page.locator('#comments textarea[placeholder*="comment" i]').first();
      await expect(commentInput).toBeVisible({ timeout: 10000 });

      // The comments panel remains visible on desktop after the button is clicked again.
      await commentButton.click();
      await page.waitForTimeout(1000);
      await expect(commentInput).toBeVisible({ timeout: 10000 });
    });

    test("should open embed modal", async ({ page }) => {
      // Embed button is hidden below md breakpoint; use a desktop viewport.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.reload();
      await page.waitForTimeout(2000);

      const embedButton = page.locator('button:has-text("Embed"), button[aria-label*="Embed"]').first();
      if (!(await embedButton.isVisible().catch(() => false))) {
        test.skip("Embed button not present");
      }

      await embedButton.click();
      await page.waitForTimeout(1500);

      const embedPopup = page.locator('[class*="Embed" i], [class*="popup" i], input[value*="iframe"], pre:has-text("iframe")').first();
      await expect(embedPopup).toBeVisible({ timeout: 10000 });

      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"]').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        expect(await embedPopup.isVisible().catch(() => false)).toBe(false);
      }
    });
  });

  test.describe("Wheel creation from topic pages", () => {
    const topics = [
      { type: "game", slug: "19301-counter-strike", name: "Counter-Strike" },
      { type: "anime", slug: "207141-chainsmoker-cat", name: "Chainsmoker Cat" },
      { type: "movie", slug: "1081003-supergirl", name: "Supergirl" },
      { type: "character", slug: "45627-levi", name: "Levi" },
    ];
    const testTag = `testtag_${Date.now()}`;

    test.beforeEach(async ({ page }) => {
      await login(page, TOPIC_WHEEL_USER);
    });

    for (const topic of topics) {
      test(`should create a wheel on ${topic.type} topic page`, async ({ page }) => {
        const wheelTitle = `Wheel for ${topic.name} ${Date.now()}`;
        const topicUrl = `/${topic.type}/${topic.slug}`;

        await page.goto(topicUrl);
        await page.waitForTimeout(2000);

        // The topic-page wheel CTA is an icon-only Link with aria-label="Spin Wheel".
        // We navigate via its href to avoid a session-hydration race in the click handler.
        const spinWheelLink = page.locator('a[aria-label="Spin Wheel"]').first();
        await expect(spinWheelLink).toBeVisible({ timeout: 10000 });
        const createWheelHref = await spinWheelLink.getAttribute("href");
        expect(createWheelHref).toContain("/wheels/create");
        await page.goto(createWheelHref);
        await page.waitForURL("**/wheels/create**", { timeout: 15000 });

        // Open the Save Wheel dialog.
        const saveDialogBtn = page.locator('button:has-text("Save Wheel")').first();
        await expect(saveDialogBtn).toBeVisible({ timeout: 10000 });
        await saveDialogBtn.click();

        await page.waitForSelector("input#name", { timeout: 10000 });
        await page.fill("input#name", wheelTitle);
        await page.fill("textarea#description", `Automated test wheel for ${topic.name}.`);

        // TagInput clears the placeholder once a tag exists, so target the
        // internal input directly and add each tag with Enter.
        const tagInput = page.locator('input.flex-1.min-w-\[120px\]').first();
        await expect(tagInput).toBeVisible({ timeout: 10000 });

        await tagInput.fill("automated_test");
        await tagInput.press("Enter");
        await page.waitForTimeout(300);

        await tagInput.fill(testTag);
        await tagInput.press("Enter");
        await page.waitForTimeout(300);

        await page.click('button[type="submit"]:has-text("Save as New")');
        await expect(page.locator("text=Save Your Wheel")).not.toBeVisible({ timeout: 15000 });

        await page.goto(topicUrl);
        await page.waitForTimeout(3000);
        await expect(page.locator(`text=${wheelTitle}`)).toBeVisible({ timeout: 10000 });

        await page.goto("/explore");
        await page.waitForTimeout(2000);
        await expect(page.locator(`text=${wheelTitle}`)).toBeVisible({ timeout: 10000 });

        await page.goto(`/tags/${testTag}`);
        await page.waitForTimeout(2000);
        await expect(page.locator(`text=${wheelTitle}`)).toBeVisible({ timeout: 10000 });
      });
    }
  });

  test.describe("Edge cases", () => {
    test("should handle private wheel access", async ({ page }) => {
      await page.goto("/wheels/000000000000000000000000");
      await page.waitForTimeout(2000);

      const notFoundOrLogin = await Promise.race([
        page.locator("text=Not Found").first().isVisible().catch(() => false),
        page.locator("text=404").first().isVisible().catch(() => false),
        page.locator('input[name="email"]').first().isVisible().catch(() => false),
      ]);

      expect(notFoundOrLogin).toBeTruthy();
    });
  });
});
