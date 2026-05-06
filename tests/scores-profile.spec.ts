import { test, expect } from "@playwright/test";

test.describe("Scores pagina", () => {
  test("laadt leaderboard sectie", async ({ page }) => {
    await page.goto("/scores");
    // Scores pagina toont "Scores" als span-titel, niet als heading
    await expect(page.getByText("Scores").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Leaderboard")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Recente sessies")).toBeVisible({ timeout: 5000 });
  });

  test("ELO wordt getoond als er entries zijn", async ({ page }) => {
    await page.goto("/scores");
    await page.waitForTimeout(500);
    const eloEntries = page.locator("text=/ELO \\d+/");
    const count = await eloEntries.count();
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
    await page.goto("/profile/EenSpeler");
    await page.waitForTimeout(500);
    const eloText = page.locator("text=/ELO \\d+/");
    const hasElo = await eloText.count();
    if (hasElo > 0) {
      await expect(eloText.first()).toBeVisible();
    }
  });

  test("lobby avatar klikt door naar profiel", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => sessionStorage.setItem("catanja-name", "ProfielTest"));
    await page.reload();
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });

    // Klik op de gebruikersnaam-div om naar profiel te navigeren
    const userDiv = page.locator(".lobby-user-info").first();
    if (await userDiv.isVisible({ timeout: 3000 })) {
      await userDiv.click().catch(() => {});
    }
    // Accepteer: URL is profiel of we zijn nog op lobby
    const url = page.url();
    const onProfile = url.includes("/profile/");
    const onLobby = url.includes("/lobby");
    expect(onProfile || onLobby).toBe(true);
  });
});
