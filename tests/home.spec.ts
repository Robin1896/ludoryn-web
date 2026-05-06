import { test, expect } from "@playwright/test";

test.describe("Home pagina", () => {
  test("laadt en toont alle spellen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByText("Grub Hunt").first()).toBeVisible();
    // 1000 Bommen is beschikbaar op de home pagina (Basteon/Carcassonne is gefilterd)
    await expect(page.getByText("1000 Bommen").first()).toBeVisible();
  });

  test("Grub kaart is klikbaar en navigeert naar lobby", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Grub/i }).click();
    await expect(page).toHaveURL(/\/lobby\?game=grub/, { timeout: 8000 });
  });
});
