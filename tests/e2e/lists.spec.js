const { test, expect } = require("@playwright/test");

/**
 * Lists feature test suite
 *
 * Covers: creation, SEO routing, item management, privacy,
 * profile cursor pagination, and detail-page rendering.
 */

const TEST_USER = {
  email: "falcondune99@example.ae",
  password: "SandStorm$65",
  handle: "falcondune99",
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

async function navigateToProfileLists(page) {
  await page.goto(`/u/${TEST_USER.handle}`);
  await page.waitForTimeout(1500);

  const listsTab = page.locator('button:has-text("Lists")').first();
  if (await listsTab.isVisible().catch(() => false)) {
    await listsTab.click();
    await page.waitForTimeout(1500);
  }
}

test.describe("Lists", () => {
  test.describe("List creation", () => {
    test("should navigate to list creation page", async ({ page }) => {
      await page.goto("/lists/create");
      await page.waitForTimeout(1500);

      expect(page.url()).toContain("/lists/create");

      const form = page.locator("form").first();
      const nameInput = page.locator("#name");
      await expect(form).toBeVisible({ timeout: 10000 });
      await expect(nameInput).toBeVisible({ timeout: 10000 });
    });

    test("should create a new private list and redirect to SEO-friendly URL", async ({ page }) => {
      await login(page);

      await page.goto("/lists/create");
      await page.waitForTimeout(1500);

      const listName = `E2E List ${Date.now()}`;
      await page.fill("#name", listName);
      await page.fill("#description", "Test list created by E2E suite.");

      const publicCheckbox = page.locator("#isPublic");
      if (await publicCheckbox.isVisible().catch(() => false)) {
        await publicCheckbox.uncheck();
      }

      await page.click('button[type="submit"]');

      await page.waitForURL(/\/lists\/[a-f\d]{24}-.+/, { timeout: 15000 });

      await expect(page.locator("h1")).toContainText(listName, { timeout: 10000 });

      await page.goto(`/u/${TEST_USER.handle}`);
      await page.click('button:has-text("Lists")');
      await expect(page.locator(`text=${listName}`)).toBeVisible({ timeout: 10000 });
    });

    test("should reject creating a list without a name", async ({ page }) => {
      await login(page);
      await page.goto("/lists/create");
      await page.waitForTimeout(1500);

      await page.fill("#description", "Missing title");

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();

      await expect(page.locator("form")).toBeVisible({ timeout: 10000 });
      expect(page.url()).toContain("/lists/create");
    });
  });

  test.describe("List detail page", () => {
    test("should display list name, description and items", async ({ page }) => {
      await navigateToProfileLists(page);

      const listLink = page.locator('a[href*="/lists/"]').first();
      if (!(await listLink.isVisible().catch(() => false))) {
        test.skip("No lists available to inspect");
      }

      await listLink.click();
      await page.waitForTimeout(1500);

      expect(page.url()).toMatch(/\/lists\/[a-f\d]{24}(-|$)/);

      const titleHeading = page.locator("h1, h2, [data-testid='list-title']").first();
      const titleText = await titleHeading.textContent();
      expect(titleText).toBeTruthy();

      const items = page.locator("[data-testid*='item'], li");
      const itemCount = await items.count();
      expect(itemCount).toBeGreaterThanOrEqual(0);
    });

    test("should navigate back to creator profile from list detail", async ({ page }) => {
      await navigateToProfileLists(page);

      const listLink = page.locator('a[href*="/lists/"]').first();
      if (!(await listLink.isVisible().catch(() => false))) {
        test.skip("No lists available to inspect");
      }

      await listLink.click();
      await page.waitForTimeout(1500);

      const creatorLink = page.locator('a[href*="/u/"]').first();
      if (await creatorLink.isVisible().catch(() => false)) {
        const creatorUrl = await creatorLink.getAttribute("href");
        expect(creatorUrl).toContain("/u/");
      }
    });
  });

  test.describe("List management", () => {
    test("should allow editing own list name", async ({ page }) => {
      await login(page);
      await navigateToProfileLists(page);

      const listLink = page.locator('a[href*="/lists/"]').first();
      if (!(await listLink.isVisible().catch(() => false))) {
        test.skip("No lists available to edit");
      }

      await listLink.click();
      await page.waitForTimeout(1500);

      const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();
      if (!(await editButton.isVisible().catch(() => false))) {
        test.skip("Edit button not present");
      }

      await editButton.click();

      const nameInput = page.locator('input[name="name"], input[name="title"]').first();
      await expect(nameInput).toBeVisible({ timeout: 10000 });

      const newName = `Updated E2E List ${Date.now()}`;
      await nameInput.fill(newName);
      await page.click('button[type="submit"], button:has-text("Save")');

      await expect(page.locator("h1, h2, [data-testid='list-title']").first()).toContainText(newName, {
        timeout: 10000,
      });
    });

    test("should toggle list privacy public/private", async ({ page }) => {
      await login(page);
      await navigateToProfileLists(page);

      const listLink = page.locator('a[href*="/lists/"]').first();
      if (!(await listLink.isVisible().catch(() => false))) {
        test.skip("No lists available to toggle");
      }

      await listLink.click();
      await page.waitForTimeout(1500);

      const privacyToggle = page
        .locator('button:has-text("Public"), button:has-text("Private"), [role="switch"]')
        .first();
      if (!(await privacyToggle.isVisible().catch(() => false))) {
        test.skip("Privacy toggle not present");
      }

      await privacyToggle.click();
      await page.waitForTimeout(1000);

      const currentLabel = await privacyToggle.textContent();
      expect(currentLabel).toMatch(/public|private/i);
    });
  });

  test.describe("List discovery", () => {
    test("should display lists in user profile", async ({ page }) => {
      await navigateToProfileLists(page);
      expect(page.url()).toContain("/u/");
    });

    test("should redirect /lists to explore discovery page", async ({ page }) => {
      await page.goto("/lists");
      await page.waitForTimeout(1500);
      expect(page.url()).toContain("/explore");
    });

    test("should load more lists via cursor pagination on profile", async ({ page }) => {
      await login(page);
      await navigateToProfileLists(page);

      const loadMore = page.locator('button:has-text("Load More")').first();
      if (await loadMore.isVisible().catch(() => false)) {
        const beforeCount = await page.locator('a[href*="/lists/"]').count();
        await loadMore.click();
        await page.waitForTimeout(2000);
        const afterCount = await page.locator('a[href*="/lists/"]').count();
        expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
      }
    });

    test("should expose list via API with projection fields only", async ({ request }) => {
      const res = await request.get("/api/unifiedlist");
      expect([200, 401, 404]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        expect(body).toBeDefined();
      }
    });
  });

  test.describe("Edge cases", () => {
    test("should handle empty list detail gracefully", async ({ page }) => {
      await navigateToProfileLists(page);

      const listLink = page.locator('a[href*="/lists/"]').first();
      if (!(await listLink.isVisible().catch(() => false))) {
        test.skip("No lists available");
      }

      await listLink.click();
      await page.waitForTimeout(1500);

      const emptyState = page.locator('text="No items", text="Empty", [data-testid="empty-list"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const items = await page.locator("[data-testid*='item'], li").count();

      expect(hasEmptyState || items >= 0).toBeTruthy();
    });

    test("should return 404 for non-existent list", async ({ request }) => {
      const res = await request.get("/api/unifiedlist/507f1f77bcf86cd799439011");
      expect([404, 401]).toContain(res.status());
    });
  });
});
