import { test, expect } from "@playwright/test";

test.describe("Beverbende spel", () => {
  test("startscherm toont modus-knoppen", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/^http:\/\/localhost:8080\/?$/);
  });

  test("2-spelers spel start en toont kaarten", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.locator("div, button").filter({ hasText: /Trek|Pak|Kaart|Deck/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("div, button").filter({ hasText: /Trek|Pak|Kaart|Deck/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("lobby switcher navigeert naar beverbende lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "beverbende");
    await expect(page).toHaveURL(/game=beverbende/);
  });
});
