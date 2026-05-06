import { test, expect, Page } from "@playwright/test";

// Multi-context multiplayer tests require live WebSocket connections.
// These are skipped in CI — run locally where socket server is reachable.
const itCI = process.env.CI ? test.skip : test;

async function joinGame(page: Page, name: string, game = "grub") {
  await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
  await page.goto(`/lobby?game=${game}`);
  await page.getByText("Nieuw").click();
  await expect(page.getByText("Jouw naam")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder("Jouw naam...").fill(name);
  await page.getByRole("button", { name: /Bevestigen/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${game}`), { timeout: 10000 });
  return new URL(page.url()).searchParams.get("room") ?? "";
}

async function joinByUrl(page: Page, roomId: string, name: string, game = "grub") {
  await page.goto("/");
  await page.evaluate((n) => sessionStorage.setItem("catanja-name", n), name);
  await page.goto(`/${game}?room=${roomId}`);
  await expect(page).toHaveURL(new RegExp(`/${game}`), { timeout: 8000 });
}

test.describe("Multiplayer flow", () => {
  itCI("twee spelers kunnen hetzelfde spel joinen", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await joinGame(p1, "Speler1");
    expect(roomId).toBeTruthy();
    await joinByUrl(p2, roomId, "Speler2");

    expect(new URL(p1.url()).searchParams.get("room")).toBe(roomId);
    expect(new URL(p2.url()).searchParams.get("room")).toBe(roomId);

    await ctx1.close();
    await ctx2.close();
  });

  itCI("chat werkt tussen twee spelers", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    const roomId = await joinGame(p1, "ChatSpeler1");
    expect(roomId).toBeTruthy();
    await joinByUrl(p2, roomId, "ChatSpeler2");

    await expect(p1.getByText("Wachten op tegenstander...")).not.toBeVisible({ timeout: 10000 });

    const chatBtn = p1.locator("button").filter({ hasText: "💬" });
    await expect(chatBtn).toBeVisible({ timeout: 5000 });
    await chatBtn.click();

    await expect(p1.getByPlaceholder("Stuur bericht...")).toBeVisible({ timeout: 3000 });
    await p1.getByPlaceholder("Stuur bericht...").fill("Hallo!");
    await p1.getByRole("button", { name: "Stuur" }).click();

    await p2.locator("button").filter({ hasText: "💬" }).click();
    await expect(p2.getByText("Hallo!")).toBeVisible({ timeout: 5000 });

    await ctx1.close();
    await ctx2.close();
  });

  itCI("spectator mode: derde bezoeker ziet Toeschouwer badge", async ({ browser }) => {
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

    await joinByUrl(p3, roomId, "Kijker");
    await expect(p3.getByText("Toeschouwer")).toBeVisible({ timeout: 15000 });

    await ctx1.close();
    await ctx2.close();
    await ctx3.close();
  });
});
