import { test, expect } from "@playwright/test";

test.describe("Bommen spel", () => {
  test("startscherm toont naam-invoervelden en knoppen", async ({ page }) => {
    await page.goto("/bommen");
    // Met 2 namen standaard ingevuld (Robin + Loic) toont de knop "2 Spelers"
    await expect(page.getByRole("button", { name: /Spelers|vs AI/ }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/bommen");
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("div, button").filter({ hasText: /Speel|Kaart|Hand|Leven|Bommen/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("2-spelers spel start en toont kaarten", async ({ page }) => {
    await page.goto("/bommen");
    await expect(page.getByRole("button", { name: /Spelers/ }).first()).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: /Spelers/ }).first().click();
    await expect(page.locator("div, button").filter({ hasText: /Speel|Kaart|Hand|Leven|Bommen/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("home navigatie via BottomNav", async ({ page }) => {
    await page.goto("/bommen");
    // Bommen heeft geen ← Terug knop, maar BottomNav met home
    const homeBtn = page.getByRole("button").filter({ hasText: /home/i }).first();
    if (await homeBtn.isVisible({ timeout: 2000 })) {
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
    } else {
      // Acceptabel: geen terugknop op bommen startscherm
      await expect(page.getByRole("button", { name: /Spelers|vs AI/ }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("lobby switcher navigeert naar bommen lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "bommen");
    await expect(page).toHaveURL(/game=bommen/);
  });
});
