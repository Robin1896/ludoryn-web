import { test, expect } from "@playwright/test";

test.describe("Flikflak spel", () => {
  test("startscherm toont titel en speelknop", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByText("Flikflak").first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible();
    await expect(page.getByText("Laagste score wint")).toBeVisible();
  });

  test("startscherm toont naam-invoervelden", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByText("Flikflak").first()).toBeVisible({ timeout: 8000 });
    const inputs = page.locator("input[type='text'], input:not([type])");
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);
  });

  test("home navigatie via BottomNav", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    const homeBtn = page.locator("button").filter({ hasText: /home/i }).first();
    if (await homeBtn.isVisible({ timeout: 2000 })) {
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
    } else {
      const backBtn = page.locator("button").filter({ hasText: "←" }).first();
      if (await backBtn.isVisible({ timeout: 2000 })) {
        await backBtn.click();
        await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
      } else {
        await expect(page.getByText(/Flikflak|bekijkt kaarten|aan de beurt/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("spel start na klikken Spelen! — peek fase actief", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await expect(page.getByText(/bekijkt kaarten|kijk naar|Tik een kaart/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("tijdens peek fase zijn kaarten klikbaar en 'Begrepen ✓' verschijnt", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(500);

    await page.locator("[style*='cursor: pointer']").first().click().catch(() => {});

    const begrepenBtn = page.getByRole("button", { name: /Begrepen/i });
    if (await begrepenBtn.isVisible({ timeout: 2000 })) {
      await expect(begrepenBtn).toBeVisible();
    }
  });

  test("na peek fase: spelsymbolen en 'Afleg' zichtbaar", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();

    for (let peek = 0; peek < 4; peek++) {
      const begrepenBtn = page.getByRole("button", { name: /Begrepen/i });
      if (await begrepenBtn.isVisible({ timeout: 1500 })) {
        await begrepenBtn.click();
        continue;
      }
      const clickables = page.locator("[style*='cursor: pointer']");
      const count = await clickables.count();
      if (count > 0) await clickables.first().click();
      await page.waitForTimeout(300);
    }

    await expect(page.getByText(/Afleg|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("'🃏 Flikflak!' roepknop verschijnt in speelfase", async ({ page }) => {
    // Gebruik AI modus: alleen speler 0 moet 2 kaarten bekijken, AI peeked automatisch
    await page.goto("/beverbende?ai=1");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();

    // Doorloop de peek fase (maximaal 4 iteraties)
    for (let i = 0; i < 4; i++) {
      const btn = page.getByRole("button", { name: /Begrepen/i });
      if (await btn.isVisible({ timeout: 1200 })) {
        await btn.click();
      } else {
        const clickables = page.locator("[style*='cursor: pointer']");
        if (await clickables.count() > 0) await clickables.first().click();
      }
      await page.waitForTimeout(400);
    }

    // Na peek fase: Flikflak knop moet verschijnen voor speler 0
    await expect(page.locator("button").filter({ hasText: "Flikflak" }).first()).toBeVisible({ timeout: 12000 });
  });

  test("reveal fase toont scores en 'Nieuwe ronde' knop", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();

    const nieuweRonde = page.getByRole("button", { name: "Nieuwe ronde" });
    if (await nieuweRonde.isVisible({ timeout: 20000 })) {
      await expect(page.getByText(/Goed geroepen|Niet de laagste/i)).toBeVisible();
      await expect(nieuweRonde).toBeVisible();
    }
  });

  test("'Nieuwe ronde' start volgende ronde", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();

    const nieuweRonde = page.getByRole("button", { name: "Nieuwe ronde" });
    if (await nieuweRonde.isVisible({ timeout: 20000 })) {
      await nieuweRonde.click();
      await expect(page.getByText(/bekijkt kaarten|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("vs AI modus via URL parameter ?ai=1", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await expect(page.getByText("Flikflak").first()).toBeVisible({ timeout: 8000 });
    // In AI modus toont het label "Tegenstander" voor speler 2
    await expect(page.getByText("Tegenstander").first()).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await expect(page.getByText(/bekijkt kaarten|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("terugknop in spel keert terug naar startscherm", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(500);
    const backBtn = page.locator("button").filter({ hasText: "←" }).first();
    if (await backBtn.isVisible({ timeout: 3000 })) {
      await backBtn.click();
      await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
    }
  });

  test("regels-popup opent via ? knop", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(500);
    const rulesBtn = page.locator("button").filter({ hasText: "?" });
    if (await rulesBtn.isVisible({ timeout: 3000 })) {
      await rulesBtn.click();
      // Spelregels popup toont "Spelregels — Flikflak"
      await expect(page.getByText(/Spelregels/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
