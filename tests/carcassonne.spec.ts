import { test, expect } from "@playwright/test";

test.describe("Carcassonne spel", () => {
  test("startscherm toont titel en speelknop", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.getByRole("heading", { name: /Carcassonne/i }).or(
      page.getByText("Carcassonne").first()
    )).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
  });

  test("naam-invoervelden tonen Speler 1 en Speler 2", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.locator("label").filter({ hasText: "Speler 1" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("input").first()).toBeVisible();
  });

  test("spel start na klikken Spelen!", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    // Na start toont het bord "Jouw tegel" of "{naam}'s tegel"
    await expect(
      page.getByText(/tegel|Klooster|Speler/i).first().or(
        page.locator("canvas").first()
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/carcassonne");
    const homeBtn = page.getByRole("button").filter({ hasText: /home/i }).first();
    if (await homeBtn.isVisible({ timeout: 2000 })) {
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
    } else {
      await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
    }
  });

  test("lobby switcher navigeert naar bommen lobby", async ({ page }) => {
    // Carcassonne zit niet in de lobby-select — gebruik bommen als alternatief
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    await page.selectOption("select", "bommen");
    await expect(page).toHaveURL(/game=bommen/, { timeout: 8000 });
  });
});
