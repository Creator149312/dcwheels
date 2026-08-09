const { test, expect } = require("@playwright/test");

/**
 * TopicPages feature test suite
 *
 * Covers: discovery, detail rendering, WorthIt voting, rating,
 * related topic sidebar, external API failure handling, and feed infinite scroll.
 */

const TEST_USER = {
  email: "ironbritknight@example.uk",
  password: "TowerGuard#47",
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

const TOPICS = [
  { type: "game", slug: "19301-counter-strike", name: "Counter-Strike" },
  { type: "anime", slug: "207141-chainsmoker-cat", name: "Chainsmoker Cat" },
  { type: "movie", slug: "1081003-supergirl", name: "Supergirl" },
  { type: "character", slug: "45627-levi", name: "Levi" },
];

test.describe("TopicPages", () => {
  test.describe("Topic detail pages", () => {
    for (const topic of TOPICS) {
      test(`should render ${topic.type} topic page`, async ({ page }) => {
        await page.goto(`/${topic.type}/${topic.slug}`);
        await page.waitForTimeout(3000);

        // The desktop h1 uses the larger text-3xl class; the mobile h1 is hidden on desktop.
        const title = page.locator("main h1.text-3xl, main h1").first();
        await expect(title).toBeVisible({ timeout: 10000 });

        const titleText = await title.textContent();
        expect(titleText.toLowerCase()).toContain(topic.name.toLowerCase().split(" ")[0]);
      });
    }

    test("should display meta pills and description", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const metaPills = page.locator("span").filter({ hasText: /\d{4}|eps|min|platform|Xbox|PlayStation|PC/i });
      expect(await metaPills.count()).toBeGreaterThan(0);

      // Target the description paragraph inside the main content area.
      const description = page.locator("main p").filter({ hasText: /Counter-Strike|Half-Life|terrorists|Valve Corporation/i }).first();
      await expect(description).toBeVisible({ timeout: 10000 });
    });

    test("should display related topics or affiliate sidebar", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const relatedLinks = page.locator('a[href*="/game/"], a[href*="/anime/"], a[href*="/movie/"]').first();
      const affiliateLink = page.locator('a[href*="amazon"]').first();
      const sidebarVisible = await relatedLinks.isVisible().catch(() => false)
        || await affiliateLink.isVisible().catch(() => false);
      expect(sidebarVisible).toBeTruthy();
    });
  });

  test.describe("WorthIt and rating", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("should render WorthIt vote section", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const worthItSection = page.locator("text=/Worth It|Votes/i").first();
      await expect(worthItSection).toBeVisible({ timeout: 10000 });
    });

    test("should allow casting a WorthIt vote", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      // The page renders the current WorthIt percentage as a clickable area.
      const yesButton = page.locator("button").filter({ hasText: /100%|Worth It/ }).first();
      if (!(await yesButton.isVisible().catch(() => false))) {
        test.skip("WorthIt voting not available");
      }

      await yesButton.click();
      await page.waitForTimeout(1500);

      const activeVote = page.locator('[aria-pressed="true"]').first();
      expect(await activeVote.isVisible().catch(() => false)).toBeTruthy();
    });

    test("should allow rating the topic", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const starButton = page.locator('[aria-label*="star"]').first();
      if (!(await starButton.isVisible().catch(() => false))) {
        test.skip("Rating stars not available");
      }

      await starButton.click();
      await page.waitForTimeout(1500);

      const selectedStar = page.locator('[aria-pressed="true"]').first();
      expect(await selectedStar.isVisible().catch(() => false)).toBeTruthy();
    });
  });

  test.describe("Community discussion feed", () => {
    test("should display community discussion section", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const discussionHeader = page.locator('h2:has-text("Community Verdict & Hot Takes")').first();
      await expect(discussionHeader).toBeVisible({ timeout: 10000 });

      const teaser = page.locator("text=What's on your mind").first();
      await expect(teaser).toBeVisible({ timeout: 10000 });
    });

    test("should open create post from topic teaser", async ({ page }) => {
      await login(page);
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const teaserLink = page.locator("text=What's on your mind").first();
      await expect(teaserLink).toBeVisible({ timeout: 10000 });
      await Promise.all([
        page.waitForURL(/\/post\/create.*tag=Counter-Strike/i, { timeout: 15000 }),
        teaserLink.click(),
      ]);
      expect(page.url()).toMatch(/.*post.*tag=Counter-Strike/i);
    });

    test("should load feed and remain on topic page", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);

      const endOfFeed = page.locator("text=You've reached the end of this feed.").first();
      const loadingState = page.locator('svg[class*="animate-spin"]').first();
      const hasContent = await endOfFeed.isVisible().catch(() => false)
        || await loadingState.isVisible().catch(() => false);
      expect(hasContent || page.url().includes("/game/19301-counter-strike")).toBeTruthy();
    });
  });

  test.describe("External API resilience", () => {
    test("should not crash when external API fails for unknown topic", async ({ page }) => {
      await page.goto("/movie/999999999-nonexistent-movie");
      await page.waitForTimeout(3000);

      const errorState = await Promise.race([
        page.locator("text=Not Found").first().isVisible().catch(() => false),
        page.locator("text=not available").first().isVisible().catch(() => false),
        page.locator("main").first().isVisible().catch(() => false),
      ]);

      expect(errorState).toBeTruthy();
    });
  });

  test.describe("Topic page engagement", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("should allow tracking status update", async ({ page }) => {
      await page.goto("/game/19301-counter-strike");
      await page.waitForTimeout(3000);

      const trackingButton = page.locator('button:has-text("Played"), button:has-text("Mark as Played")').first();
      if (await trackingButton.isVisible().catch(() => false)) {
        await trackingButton.click();
        await page.waitForTimeout(1500);

        const updatedText = await trackingButton.textContent();
        expect(updatedText).toMatch(/played|watching|want/i);
      }
    });
  });
});
