const { test, expect } = require("@playwright/test");

test.describe("Feed virtualization and batched viewer state", () => {
  test("only renders a small number of feed cards at once", async ({ page }) => {
    await page.goto("/");

    // Wait for the virtualizer to mount and the infinite scroll to fetch.
    const feedContainer = page.locator('[data-testid="virtualized-feed"]');
    await expect(feedContainer).toBeVisible();

    // Wait for first batch to load (limit is 8, plus possible injected list).
    await expect(feedContainer.locator('[data-vc-index]').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    const allRows = feedContainer.locator('[data-vc-index]');
    const totalRows = await allRows.count();

    expect(totalRows).toBeGreaterThanOrEqual(2);

    // Count rendered rows (those that are not aria-hidden placeholders).
    let renderedCount = 0;
    let placeholderCount = 0;
    for (let i = 0; i < totalRows; i++) {
      const row = allRows.nth(i);
      const isPlaceholder = await row.getAttribute("aria-hidden");
      if (isPlaceholder === "true") {
        placeholderCount++;
      } else {
        renderedCount++;
      }
    }

    // With a desktop viewport and 600px rootMargin + overscan 1, we expect no
    // more than ~15 items rendered even if many more are loaded into state.
    expect(renderedCount).toBeLessThanOrEqual(15);

    if (totalRows > 15) {
      expect(placeholderCount).toBeGreaterThan(0);
    }
  });

  test("guest users do not fetch batched viewer stats", async ({ page }) => {
    let actionRequests = [];
    const collectActions = (req) => {
      const headers = req.headers();
      const nextAction = headers["next-action"];
      if (req.method() === "POST" && nextAction) {
        actionRequests.push({ url: req.url(), action: nextAction });
      }
    };
    page.on("request", collectActions);

    await page.goto("/");
    await page.waitForTimeout(2500);

    // Guest users should trigger zero server actions for viewer state.
    expect(actionRequests.length).toBe(0);
  });

  test("logged-in users fetch batched viewer stats once", async ({ page }) => {
    // This test requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars.
    test.skip(
      !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
      "Skipping: no test credentials provided"
    );

    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // The app redirects to /u/me after login; navigate to the feed.
    await page.waitForURL("/u/me", { timeout: 10000 });

    let actionRequests = [];
    const collectActions = (req) => {
      const headers = req.headers();
      const nextAction = headers["next-action"];
      if (req.method() === "POST" && nextAction) {
        actionRequests.push({ url: req.url(), action: nextAction });
      }
    };
    page.on("request", collectActions);

    await page.goto("/");

    // Allow feed to load first page and batch provider to flush.
    await page.waitForTimeout(3000);

    const feedContainer = page.locator('[data-testid="virtualized-feed"]');
    const renderedCards = feedContainer.locator('[data-vc-index]:not([aria-hidden="true"])');
    const cardCount = await renderedCards.count();

    // Batching is working if the number of server actions is far fewer than
    // the number of rendered cards. We allow a small handful of actions to
    // account for session/auth hydration, the batch stats call, etc.
    expect(cardCount).toBeGreaterThanOrEqual(2);
    expect(actionRequests.length).toBeGreaterThanOrEqual(1);
    expect(actionRequests.length).toBeLessThanOrEqual(Math.max(3, Math.ceil(cardCount / 3)));
  });
});
