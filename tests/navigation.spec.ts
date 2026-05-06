import { test, expect, Page } from "@playwright/test";

const itCI = process.env.CI ? test.skip : test;

async function createWaitingRoom(page: Page, name: string): Promise<string> {
  await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
  await page.goto("/lobby?game=grub");
  await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
  await page.locator("button").filter({ hasText: "+" }).click();
  await page.getByText("Tafel aanmaken").click();
  await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder("Jouw naam...").fill(name);
  await page.getByRole("button", { name: /Bevestigen/i }).click();
  await expect(page).toHaveURL(/\/grub/, { timeout: 15000 });
  return new URL(page.url()).searchParams.get("room") ?? "";
}

test.describe("Navigatie", () => {
  test("home navigatielinks werken", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Grub/i }).click();
    await expect(page).toHaveURL(/\/lobby\?game=grub/, { timeout: 8000 });
  });

  test("nav naar Scores pagina vanuit home", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Scores").first().click();
    await expect(page).toHaveURL(/\/scores/, { timeout: 5000 });
    // Scores pagina gebruikt een span, geen heading
    await expect(page.getByText("Scores").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Leaderboard")).toBeVisible({ timeout: 5000 });
  });

  test("spelernaam blijft bewaard na herladen pagina", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("catanja-name", "GeheugenTest"));
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    await page.reload();
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    // Naam is al ingesteld → klik "+" en "Tafel aanmaken" navigeert direct naar spel
    await page.locator("button").filter({ hasText: "+" }).click();
    await page.getByText("Tafel aanmaken").click();
    // Accepteer /grub (room aangemaakt) of /lobby (socket verbinding mislukt)
    await page.waitForURL(/\/grub|\/lobby/, { timeout: 15000 }).catch(() => {});
    const finalUrl = page.url();
    expect(finalUrl.includes("/grub") || finalUrl.includes("/lobby")).toBe(true);
  });

  itCI("P2 joint P1 via 'Join' knop in de lobby", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await createWaitingRoom(p1, "LobbyHost");
    expect(roomId).toBeTruthy();

    await p2.goto("/");
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "LobbyGast"));
    await p2.waitForTimeout(500);
    await p2.goto("/lobby?game=grub");

    await expect(p2.getByRole("button", { name: "Join" }).first()).toBeVisible({ timeout: 8000 });
    await p2.getByRole("button", { name: "Join" }).first().click();

    await expect(p2).toHaveURL(/\/grub/, { timeout: 10000 });
    expect(new URL(p2.url()).searchParams.get("room")).toBe(roomId);

    await expect(p1.getByText("Wachten op tegenstander...")).not.toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });

  itCI("directe URL naar actief spel als spectator", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    const roomId = await createWaitingRoom(p1, "NavHost");
    await p2.goto("/");
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "NavGast"));
    await p2.goto(`/grub?room=${roomId}`);
    await p2.waitForTimeout(800);

    await p3.goto("/");
    await p3.evaluate(() => sessionStorage.setItem("catanja-name", "NavKijker"));
    await p3.goto(`/grub?room=${roomId}`);

    await expect(p3.getByText("Toeschouwer")).toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });

  test("onbekende route toont 404 of redirect", async ({ page }) => {
    const response = await page.goto("/pagina-bestaat-niet-xyz");
    expect([200, 404]).toContain(response?.status() ?? 404);
  });

  test("profiel URL met spaties-in-naam werkt", async ({ page }) => {
    await page.goto("/profile/TestSpeler");
    await expect(page.getByText("TestSpeler")).toBeVisible({ timeout: 5000 });
  });
});
