import { test, expect } from "@playwright/test";

test.describe("Bommen spel", () => {
  test("startscherm toont modus-knoppen", async ({ page }) => {
    await page.goto("/bommen");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/bommen");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("2-spelers spel start en toont kaarten", async ({ page }) => {
    await page.goto("/bommen");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.locator("div, button").filter({ hasText: /Speel|Kaart|Hand|Leven/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/bommen");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("div, button").filter({ hasText: /Speel|Kaart|Hand|Leven/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("lobby switcher navigeert naar bommen lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "bommen");
    await expect(page).toHaveURL(/game=bommen/);
  });
});
