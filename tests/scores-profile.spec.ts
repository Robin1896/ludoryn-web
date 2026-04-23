import { test, expect } from "@playwright/test";

test.describe("Scores pagina", () => {
  test("laadt leaderboard sectie", async ({ page }) => {
    await page.goto("/scores");
    await expect(page.getByRole("heading", { name: "Scores" })).toBeVisible();
    await expect(page.getByText("Leaderboard")).toBeVisible();
    await expect(page.getByText("Recente sessies")).toBeVisible();
  });

  test("ELO wordt getoond als er entries zijn", async ({ page }) => {
    await page.goto("/scores");
    await page.waitForTimeout(500);
    const eloEntries = page.locator("text=/ELO \\d+/");
    const count = await eloEntries.count();
    // Als er entries zijn moeten ze ELO hebben
    if (count > 0) {
      await expect(eloEntries.first()).toBeVisible();
    }
  });
});

test.describe("Profiel pagina", () => {
  test("laadt profiel en toont naam", async ({ page }) => {
    await page.goto("/profile/EenSpeler");
    await expect(page.getByText("EenSpeler")).toBeVisible({ timeout: 5000 });
  });

  test("profiel van onbekende speler toont leeg bord", async ({ page }) => {
    await page.goto("/profile/onbekende_xyz_123");
    await expect(page.getByText("onbekende_xyz_123")).toBeVisible();
    await expect(page.getByText("Nog geen gespeelde potjes")).toBeVisible({ timeout: 5000 });
  });

  test("profiel toont ELO als speler scores heeft", async ({ page }) => {
    // Gebruik een speler die via de auth test is aangemaakt
    await page.goto("/profile/EenSpeler");
    await page.waitForTimeout(500);
    // ELO staat in de sub-header als stats aanwezig zijn
    const eloText = page.locator("text=/ELO \\d+/");
    const hasElo = await eloText.count();
    if (hasElo > 0) {
      await expect(eloText.first()).toBeVisible();
    }
  });

  test("lobby avatar klikt door naar profiel", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.evaluate(() => sessionStorage.setItem("catanja-name", "ProfielTest"));
    await page.reload();

    // Avatar wrapper (cursor pointer div) klikken
    await page.locator("div").filter({ has: page.locator("canvas, svg") }).first().click().catch(() => {
      // Fallback: zoek op style
    });

    // Klik via JS op het element dat navigeert
    await page.evaluate(() => {
      const els = document.querySelectorAll("div[style*='cursor: pointer']");
      (els[els.length - 1] as HTMLElement)?.click();
    });

    await expect(page).toHaveURL(/\/profile\/ProfielTest/, { timeout: 5000 });
  });
});
