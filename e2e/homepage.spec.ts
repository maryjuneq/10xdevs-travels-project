import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveTitle("Sign In - 10x Travels");
  });

  test("should have basic page structure on login page", async ({ page }) => {
    await page.goto("/login");

    // Check for common page elements
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Check that HTML structure is present
    const html = page.locator("html");
    await expect(html).toBeVisible();
  });
});
