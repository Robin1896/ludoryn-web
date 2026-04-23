import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:8080";

// Create a room via lobby, return roomId
async function joinGame(page: Page, name: string, game = "grub") {
  await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
  await page.goto(`/lobby?game=${game}`);
  await page.getByText("Nieuw").click();
  await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder("Jouw naam...").fill(name);
  await page.getByRole("button", { name: /Bevestigen/i }).click();
  await expect(page).toHaveURL(new RegExp(`^${BASE}/${game}`), { timeout: 10000 });
  return new URL(page.url()).searchParams.get("room") ?? "";
}

// Join via direct URL by pre-setting name in sessionStorage
async function joinByUrl(page: Page, roomId: string, name: string, game = "grub") {
  // First navigate to the app origin to set sessionStorage
  await page.goto(`${BASE}/`);
  await page.evaluate((n) => sessionStorage.setItem("catanja-name", n), name);
  await page.goto(`/${game}?room=${roomId}`);
  await expect(page).toHaveURL(new RegExp(`^${BASE}/${game}`), { timeout: 8000 });
}

test.describe("Multiplayer flow", () => {
  test("twee spelers kunnen hetzelfde spel joinen", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await joinGame(p1, "Speler1");
    expect(roomId).toBeTruthy();
    await joinByUrl(p2, roomId, "Speler2");

    // Beide spelers zitten in de game (zelfde URL)
    expect(new URL(p1.url()).searchParams.get("room")).toBe(roomId);
    expect(new URL(p2.url()).searchParams.get("room")).toBe(roomId);

    await ctx1.close();
    await ctx2.close();
  });

  test("chat werkt tussen twee spelers", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await joinGame(p1, "ChatSpeler1");
    expect(roomId).toBeTruthy();
    await joinByUrl(p2, roomId, "ChatSpeler2");

    // Wacht tot p1 overgaat van waiting naar playing (p2 heeft join-room gestuurd)
    await expect(p1.getByText("Wachten op tegenstander...")).not.toBeVisible({ timeout: 10000 });

    // Chat knop klikken — GameControls is nu zichtbaar
    const chatBtn = p1.locator("button").filter({ hasText: "💬" });
    await expect(chatBtn).toBeVisible({ timeout: 5000 });
    await chatBtn.click();

    await expect(p1.getByPlaceholder("Stuur bericht...")).toBeVisible({ timeout: 3000 });
    await p1.getByPlaceholder("Stuur bericht...").fill("Hallo!");
    await p1.getByRole("button", { name: "Stuur" }).click();

    // Speler 2 opent chat en ziet bericht
    await p2.locator("button").filter({ hasText: "💬" }).click();
    await expect(p2.getByText("Hallo!")).toBeVisible({ timeout: 5000 });

    await ctx1.close();
    await ctx2.close();
  });

  test("spectator mode: derde bezoeker ziet Toeschouwer badge", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    const p3 = await ctx3.newPage();

    const roomId = await joinGame(p1, "Host");
    expect(roomId).toBeTruthy();
    await joinByUrl(p2, roomId, "Gast");
    await p2.waitForTimeout(500);

    // Derde speler joint als spectator (kamer vol)
    await joinByUrl(p3, roomId, "Kijker");

    // Wacht tot p3 in playing fase is (state-sync ontvangen na join-room als spectator)
    await expect(p3.getByText("Toeschouwer")).toBeVisible({ timeout: 15000 });

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });
});
