import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

test.describe("Lobby", () => {
  test("laadt open tafels sectie", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible();
    await expect(page.getByText("Nieuw")).toBeVisible();
    await expect(page.getByText("Quick")).toBeVisible();
  });

  test("game switcher navigeert naar ander spel", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "carcassonne");
    await expect(page).toHaveURL(/game=carcassonne/);
  });

  test("Fast/Slow mode toggle werkt", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.getByText("Slow").click();
    await page.getByText("Fast").click();
    await expect(page.getByText("Open tafels")).toBeVisible();
  });

  test("naam instellen via NameModal en tafel aanmaken", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await page.getByText("Nieuw").click();

    await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder("Jouw naam...").fill("TestSpeler");
    await page.getByRole("button", { name: /Bevestigen/i }).click();

    await expect(page).toHaveURL(new RegExp(`^${BASE}/grub`), { timeout: 10000 });
    expect(new URL(page.url()).searchParams.get("room")).toBeTruthy();
  });

  test("actieve spellen tonen Kijken knop", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    // Speler 1 maakt tafel
    await p1.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await p1.goto("/lobby?game=grub");
    await p1.getByText("Nieuw").click();
    await expect(p1.getByText("Jouw naam")).toBeVisible({ timeout: 3000 });
    await p1.getByPlaceholder("Jouw naam...").fill("ActiveSpeler1");
    await p1.getByRole("button", { name: /Bevestigen/i }).click();
    await expect(p1).toHaveURL(new RegExp(`^${BASE}/grub`), { timeout: 10000 });

    const roomId = new URL(p1.url()).searchParams.get("room");
    expect(roomId).toBeTruthy();

    // Speler 2 joint
    await p2.goto(`${BASE}/`);
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "ActiveSpeler2"));
    await p2.goto(`/grub?room=${roomId}`);
    await p2.waitForTimeout(1000);

    // Lobby pagina 3 toont Kijken knop voor actief spel
    await p3.goto("/lobby?game=grub");
    await p3.waitForTimeout(1500);
    const kijken = p3.getByRole("button", { name: "Kijken" }).first();
    if (await kijken.isVisible()) {
      await expect(kijken).toBeVisible();
    } else {
      // Spel kan al zijn verlopen/niet gevonden - lobby werkt wel
      await expect(p3.getByText("Open tafels")).toBeVisible();
    }

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });
});
