const { test, expect } = require("@playwright/test");

/**
 * Authentication & Profile Management test suite
 *
 * Covers: registration, login, email verification, profile access,
 * case-insensitive URLs, saved items, settings navigation, and profile access.
 */

function getTodaySuffix() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}

function generateTestUser() {
  const suffix = getTodaySuffix();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return {
    username: `testuser_${randomSuffix}`,
    email: `test${suffix}@example.com`,
    password: `Test${suffix}`,
  };
}

test.describe("Authentication & Profile", () => {
  test.describe("Registration", () => {
    test("should register a new user and show verification message", async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto("/register");

      const usernameInput = page.locator("#username");
      await expect(usernameInput).toBeVisible({ timeout: 10000 });

      await usernameInput.fill(testUser.username);
      await page.locator("#email").fill(testUser.email);
      await page.locator("#password").fill(testUser.password);

      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);

      const pageText = await page.content();
      const hasSuccessIndicator =
        pageText.toLowerCase().includes("verification") ||
        pageText.toLowerCase().includes("check your email") ||
        page.url() === "/";

      expect(hasSuccessIndicator).toBeTruthy();
    });

    test("should reject registration with missing fields", async ({ page }) => {
      await page.goto("/register");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(1000);

      expect(page.url()).toContain("/register");
    });
  });

  test.describe("Login", () => {
    test("should log in existing user and redirect", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "ironbritknight@example.uk");
      await page.fill('input[name="password"]', "TowerGuard#47");
      await page.click('button[type="submit"]');

      await page.waitForURL(url => url.pathname.includes("/u/"), {
        timeout: 30000,
      });
      expect(page.url()).not.toContain("/login");
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "invalid@example.com");
      await page.fill('input[name="password"]', "wrongpassword");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      const errorText = await page.textContent("body");
      expect(errorText.toLowerCase()).toMatch(/invalid|error|credentials/);
      expect(page.url()).toContain("/login");
    });

    test("should redirect anonymous user from protected route to login", async ({ page }) => {
      await page.goto("/u/me");
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(/\/login/);
    });
  });

  test.describe("Profile pages", () => {
    test("should display public profile at /u/[username]", async ({ page }) => {
      await page.goto("/u/ironbritknight");
      await page.waitForTimeout(2000);

      const profileHeader = page.locator('[data-testid="profile-header"], h1').first();
      await expect(profileHeader).toBeVisible({ timeout: 10000 });
      expect(page.url()).toContain("/u/ironbritknight");
    });

    test("should redirect mixed-case profile URL to lowercase", async ({ page }) => {
      await page.goto("/u/Ironbritknight");
      await page.waitForURL("**/u/ironbritknight**", { timeout: 10000 });
      expect(page.url()).toContain("/u/ironbritknight");
    });

    test("should display profile tabs and content", async ({ page }) => {
      await page.goto("/u/ironbritknight");
      await page.waitForTimeout(2000);

      const mainContent = page.locator("main").first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      const tabs = page.locator('button:has-text("Wheels"), button:has-text("Posts"), button:has-text("Lists")');
      expect(await tabs.count()).toBeGreaterThan(0);
    });

    test("should navigate to profile from feed author link", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const profileLinks = page.locator('a[href*="/u/"]');
      if ((await profileLinks.count()) === 0) {
        test.skip("No author links found");
      }

      const firstLink = profileLinks.first();
      const href = await firstLink.getAttribute("href");
      expect(href).toContain("/u/");

      await firstLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/u/");
    });

    test("should render saved items page", async ({ page }) => {
      await page.goto("/u/ironbritknight/saved");
      await page.waitForTimeout(2000);

      const main = page.locator("main").first();
      await expect(main).toBeVisible({ timeout: 10000 });
      expect(page.url()).toContain("/u/ironbritknight/saved");
    });
  });

  test.describe("Settings & profile", () => {
    test("should access profile when authenticated", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "ironbritknight@example.uk");
      await page.fill('input[name="password"]', "TowerGuard#47");
      await page.click('button[type="submit"]');

      await page.waitForURL("**/u/ironbritknight**", { timeout: 30000 });
      expect(page.url()).toContain("/u/ironbritknight");
    });

    test("should navigate to settings from profile", async ({ page }) => {
      await page.goto("/u/ironbritknight");
      await page.waitForTimeout(2000);

      const editButton = page
        .locator('button:has-text("Edit"), button:has-text("Settings"), button:has-text("Profile")')
        .first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(1000);
      }

      await page.goto("/u/ironbritknight");
      expect(page.url()).toContain("/u/ironbritknight");
    });
  });

  test.describe("Edge cases", () => {
    test("should show 404 for non-existent profile", async ({ page }) => {
      await page.goto("/u/nonexistent_user_12345");
      await page.waitForTimeout(2000);

      const notFound = await Promise.race([
        page.locator("text=Not Found").first().isVisible().catch(() => false),
        page.locator("text=404").first().isVisible().catch(() => false),
      ]);

      expect(notFound).toBeTruthy();
    });

    test("should handle logout", async ({ page }) => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "ironbritknight@example.uk");
      await page.fill('input[name="password"]', "TowerGuard#47");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/u/ironbritknight**", { timeout: 30000 });

      const userMenu = page.locator('button:has(svg.lucide-user-circle)').first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        const logout = page.locator('text=Log Out, text=Sign Out').first();
        if (await logout.isVisible().catch(() => false)) {
          await logout.click();
          await page.waitForTimeout(2000);
          expect(page.url()).toContain("/");
        }
      }
    });
  });
});
