import { test, expect } from "@playwright/test";

const ROLL_MS = 1600; // wacht op dobbelsteenanimatie (1400ms + marge)

test.describe("Grub lokaal spel", () => {
  test("startscherm toont knoppen en ondertitel", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
    await expect(page.getByText("Dobbelstenen · Wormen · Stelen")).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/grub");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("2-spelers lokaal spel start en toont Gooi-knop", async ({ page }) => {
    await page.goto("/grub");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: "Gooi" })).toBeVisible({ timeout: 5000 });
  });

  test("aangepaste namen zichtbaar in score-pills na start", async ({ page }) => {
    await page.goto("/grub");
    const inputs = page.getByPlaceholder("Naam...");
    await inputs.nth(0).fill("Alice");
    await inputs.nth(1).fill("Bob");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    // Score pills tonen de namen (gebruik .first() om strict mode te vermijden)
    await expect(page.getByText("Alice").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bob").first()).toBeVisible({ timeout: 5000 });
  });

  test("na het gooien verandert de spelstatus", async ({ page }) => {
    await page.goto("/grub");
    await page.getByRole("button", { name: "2 Spelers" }).click();

    const rollBtn = page.getByRole("button", { name: "Gooi" });
    await expect(rollBtn).toBeVisible({ timeout: 5000 });
    await rollBtn.click();
    // Knop toont "Gooien..." tijdens animatie
    await expect(page.getByRole("button", { name: "Gooien..." })).toBeVisible({ timeout: 2000 })
      .catch(() => {}); // kan al klaar zijn voor we checken

    // Na animatie: "Pech!" of de Gooi-knop is uitgeschakeld (fase=rolled)
    await page.waitForTimeout(ROLL_MS);
    const hadBust = await page.getByText("Pech!").isVisible();
    if (!hadBust) {
      await expect(rollBtn).toBeDisabled({ timeout: 2000 });
    }
  });

  test("Stop-knop aanwezig naast Gooi-knop", async ({ page }) => {
    await page.goto("/grub");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible({ timeout: 5000 });
  });

  test("VS AI: AI speelt na speler actie", async ({ page }) => {
    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();

    const rollBtn = page.getByRole("button", { name: "Gooi" });
    await expect(rollBtn).toBeVisible({ timeout: 5000 });
    await rollBtn.click();
    await page.waitForTimeout(ROLL_MS);

    const hadBust = await page.getByText("Pech!").isVisible();
    if (hadBust) {
      // Na "Pech!" knop "Verder" → beurt gaat naar AI
      await page.getByRole("button", { name: "Verder" }).click();
      await expect(page.getByText("AI speelt...")).toBeVisible({ timeout: 5000 });
    } else {
      // Pak het eerste beschikbare vlak (de eerste niet-Gooi niet-Stop knop)
      const faceBtn = page.locator("button span").filter({ hasText: /^[1-5W]$/ }).first();
      if (await faceBtn.isVisible({ timeout: 2000 })) {
        await faceBtn.click();
        // Na vlak kiezen: fase kan idle zijn (gooi opnieuw) of claimed
        await expect(page.getByRole("button", { name: /Gooi|Verder|AI speelt/ })).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("opnieuw starten na te navigeren", async ({ page }) => {
    await page.goto("/grub");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: "Gooi" })).toBeVisible({ timeout: 5000 });
    // Navigeer terug en start opnieuw
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible();
  });
});
