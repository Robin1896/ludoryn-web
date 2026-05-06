import { test, expect } from "@playwright/test";

test.describe("Home pagina", () => {
  test("laadt en toont alle spellen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByText("Grub Hunt").first()).toBeVisible();
    // Basteon is de naam voor Carcassonne in dit spel
    await expect(page.getByText("Basteon").first()).toBeVisible();
  });

  test("Grub kaart is klikbaar en navigeert naar lobby", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Grub/i }).click();
    await expect(page).toHaveURL(/\/lobby\?game=grub/, { timeout: 8000 });
  });
});
