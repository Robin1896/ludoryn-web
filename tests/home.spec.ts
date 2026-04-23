import { test, expect } from "@playwright/test";

test.describe("Home pagina", () => {
  test("laadt en toont alle spellen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByText("Grub").first()).toBeVisible();
    await expect(page.getByText("Carcassonne").first()).toBeVisible();
  });

  test("Grub kaart is klikbaar en navigeert naar lobby", async ({ page }) => {
    await page.goto("/");
    // Grub is het enige beschikbare spel — klik de kaart
    await page.getByRole("link", { name: /Grub/i }).click();
    await expect(page).toHaveURL(/\/lobby\?game=grub/, { timeout: 8000 });
  });
});
