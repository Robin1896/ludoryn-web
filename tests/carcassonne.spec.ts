import { test, expect } from "@playwright/test";

test.describe("Carcassonne spel", () => {
  test("startscherm toont modus-knoppen", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/carcassonne");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("2-spelers spel start en toont bord", async ({ page }) => {
    await page.goto("/carcassonne");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.locator("canvas, svg, div").filter({ hasText: /Tile|Tegel|Meeple|Plaatsen/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/carcassonne");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("canvas, svg, div").filter({ hasText: /Tile|Tegel|Meeple|Plaatsen/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("lobby switcher navigeert naar carcassonne lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "carcassonne");
    await expect(page).toHaveURL(/game=carcassonne/);
  });
});
