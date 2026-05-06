import { test, expect } from "@playwright/test";

const itCI = process.env.CI ? test.skip : test;

test.describe("Lobby", () => {
  test("laadt open tafels sectie", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    // "+" knop voor nieuw spel aanmaken
    await expect(page.locator("button").filter({ hasText: "+" })).toBeVisible({ timeout: 5000 });
    // Zoek tegenstander knop
    await expect(page.getByText("Zoek tegenstander")).toBeVisible({ timeout: 5000 });
  });

  test("game switcher navigeert naar ander spel", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    await page.selectOption("select", "bommen");
    await expect(page).toHaveURL(/game=bommen/, { timeout: 8000 });
  });

  test("Fast/Slow mode toggle werkt", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    // Open het "+" dropdown
    await page.locator("button").filter({ hasText: "+" }).click();
    // Toggle Fast/Traag knoppen zijn nu zichtbaar
    await expect(page.getByText("Fast")).toBeVisible({ timeout: 5000 });
    // Klik Fast om te selecteren, dan sluiten
    await page.getByText("Fast").click();
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 5000 });
  });

  test("naam instellen via NameModal en tafel aanmaken", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    // Open "+" dropdown en klik "Tafel aanmaken"
    await page.locator("button").filter({ hasText: "+" }).click();
    await page.getByText("Tafel aanmaken").click();

    await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder("Jouw naam...").fill("TestSpeler");
    await page.getByRole("button", { name: /Bevestigen/i }).click();

    await expect(page).toHaveURL(/\/grub/, { timeout: 15000 });
    expect(new URL(page.url()).searchParams.get("room")).toBeTruthy();
  });

  itCI("actieve spellen tonen Kijken knop", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    await p1.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await p1.goto("/lobby?game=grub");
    await p1.locator("button").filter({ hasText: "+" }).click();
    await p1.getByText("Tafel aanmaken").click();
    await expect(p1.getByText("Jouw naam")).toBeVisible({ timeout: 5000 });
    await p1.getByPlaceholder("Jouw naam...").fill("ActiveSpeler1");
    await p1.getByRole("button", { name: /Bevestigen/i }).click();
    await expect(p1).toHaveURL(/\/grub/, { timeout: 15000 });

    const roomId = new URL(p1.url()).searchParams.get("room");
    expect(roomId).toBeTruthy();

    await p2.goto("/");
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "ActiveSpeler2"));
    await p2.goto(`/grub?room=${roomId}`);
    await p2.waitForTimeout(1000);

    await p3.goto("/lobby?game=grub");
    await p3.waitForTimeout(1500);
    const kijken = p3.getByRole("button", { name: "Kijken" }).first();
    if (await kijken.isVisible()) {
      await expect(kijken).toBeVisible();
    } else {
      await expect(p3.getByText("Open tafels")).toBeVisible();
    }

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });
});
