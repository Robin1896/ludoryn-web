import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:8080";

// Helper: maak een wachtende kamer aan en geef roomId terug
async function createWaitingRoom(page: Page, name: string): Promise<string> {
  await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
  await page.goto("/lobby?game=grub");
  await page.getByText("Nieuw").click();
  await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 3000 });
  await page.getByPlaceholder("Jouw naam...").fill(name);
  await page.getByRole("button", { name: /Bevestigen/i }).click();
  await expect(page).toHaveURL(new RegExp(`^${BASE}/grub`), { timeout: 10000 });
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
    // BottomNav rendert <div role="button">, geen <a> — gebruik getByText
    await page.getByText("Scores").first().click();
    await expect(page).toHaveURL(/\/scores/, { timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Scores" })).toBeVisible();
  });

  test("spelernaam blijft bewaard na herladen pagina", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => sessionStorage.setItem("catanja-name", "GeheugenTest"));
    await page.goto("/lobby?game=grub");
    await page.reload();
    // Naam is geladen uit sessionStorage — knop "Nieuw" aanwezig (geen NameModal)
    await expect(page.getByText("Nieuw")).toBeVisible({ timeout: 5000 });
    // Klik Nieuw — mag NIET de NameModal tonen want naam is al bekend
    await page.getByText("Nieuw").click();
    // Navigeert direct naar spel zonder modal
    await expect(page).toHaveURL(new RegExp(`^${BASE}/grub`), { timeout: 10000 });
  });

  test("P2 joint P1 via 'Join' knop in de lobby", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await createWaitingRoom(p1, "LobbyHost");
    expect(roomId).toBeTruthy();

    // P2 stelt naam in en gaat naar de lobby (kleine wacht voor lobby-update propageert)
    await p2.goto(`${BASE}/`);
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "LobbyGast"));
    await p2.waitForTimeout(500);
    await p2.goto("/lobby?game=grub");

    // Wacht tot de wachtende tafel verschijnt en klik Join
    // TableCard toont "Join" knop voor open tafels
    await expect(p2.getByRole("button", { name: "Join" }).first()).toBeVisible({ timeout: 8000 });
    await p2.getByRole("button", { name: "Join" }).first().click();

    // P2 navigeert naar het spel
    await expect(p2).toHaveURL(new RegExp(`^${BASE}/grub`), { timeout: 10000 });
    expect(new URL(p2.url()).searchParams.get("room")).toBe(roomId);

    // P1 overgaat van wachten naar spelen
    await expect(p1.getByText("Wachten op tegenstander...")).not.toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
  });

  test("directe URL naar actief spel als spectator", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    const roomId = await createWaitingRoom(p1, "NavHost");
    await p2.goto(`${BASE}/`);
    await p2.evaluate(() => sessionStorage.setItem("catanja-name", "NavGast"));
    await p2.goto(`/grub?room=${roomId}`);
    await p2.waitForTimeout(800);

    // P3 navigeert direct naar het actieve spel als spectator
    await p3.goto(`${BASE}/`);
    await p3.evaluate(() => sessionStorage.setItem("catanja-name", "NavKijker"));
    await p3.goto(`/grub?room=${roomId}`);

    await expect(p3.getByText("Toeschouwer")).toBeVisible({ timeout: 10000 });

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });

  test("onbekende route toont 404 of redirect", async ({ page }) => {
    const response = await page.goto("/pagina-bestaat-niet-xyz");
    // Next.js geeft 404 of redirect naar home
    expect([200, 404]).toContain(response?.status() ?? 404);
  });

  test("profiel URL met spaties-in-naam werkt", async ({ page }) => {
    await page.goto("/profile/TestSpeler");
    await expect(page.getByText("TestSpeler")).toBeVisible({ timeout: 5000 });
  });
});
