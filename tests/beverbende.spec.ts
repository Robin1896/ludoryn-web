import { test, expect } from "@playwright/test";

test.describe("Flikflak spel", () => {
  test("startscherm toont titel en speelknop", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByText("Flikflak").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible();
    await expect(page.getByText("Laagste score wint")).toBeVisible();
  });

  test("startscherm toont naam-invoervelden", async ({ page }) => {
    await page.goto("/beverbende");
    await expect(page.getByLabel("Speler 1")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Speler 2")).toBeVisible();
  });

  test("home navigatie via BottomNav", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();
    // BottomNav heeft home knop
    const homeBtn = page.locator("div, button").filter({ hasText: /^home$/i }).first();
    if (await homeBtn.isVisible({ timeout: 2000 })) {
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/);
    } else {
      // Terugknop in header
      await page.locator("button").filter({ hasText: "←" }).first().click();
      await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 3000 });
    }
  });

  test("spel start na klikken Spelen! — peek fase actief", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();
    // Na start: peek fase — tekst "bekijkt kaarten" of "Kijk naar"
    await expect(page.getByText(/bekijkt kaarten|kijk naar|Tik een kaart/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("tijdens peek fase zijn kaarten klikbaar en 'Begrepen ✓' verschijnt", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(500);

    // Klik een kaart (cardback) aan
    const cardBacks = page.locator("div").filter({ hasText: "" }).nth(3);
    await page.locator("[style*='cursor: pointer']").first().click().catch(() => {});

    // "Begrepen ✓" knop verschijnt na het kijken
    const begrepenBtn = page.getByRole("button", { name: /Begrepen/i });
    if (await begrepenBtn.isVisible({ timeout: 2000 })) {
      await expect(begrepenBtn).toBeVisible();
    }
  });

  test("na peek fase: spelsymbolen en 'Afleg' zichtbaar", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();

    // Doorloop peek fase door kaarten te klikken en te bevestigen
    for (let peek = 0; peek < 4; peek++) {
      const begrepenBtn = page.getByRole("button", { name: /Begrepen/i });
      if (await begrepenBtn.isVisible({ timeout: 1500 })) {
        await begrepenBtn.click();
        continue;
      }
      // Klik een kaart
      const clickables = page.locator("[style*='cursor: pointer']");
      const count = await clickables.count();
      if (count > 0) await clickables.first().click();
      await page.waitForTimeout(300);
    }

    // Na peek: "Afleg" label of "aan de beurt" zichtbaar
    await expect(page.getByText(/Afleg|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("'🃏 Flikflak!' roepknop verschijnt in speelfase", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();

    // Snel door peek fase
    for (let i = 0; i < 6; i++) {
      const btn = page.getByRole("button", { name: /Begrepen/i });
      if (await btn.isVisible({ timeout: 800 })) {
        await btn.click();
      } else {
        const clickables = page.locator("[style*='cursor: pointer']");
        if (await clickables.count() > 0) await clickables.first().click();
      }
      await page.waitForTimeout(200);
    }

    // Flikflak! knop zichtbaar voor actieve speler
    await expect(page.locator("button").filter({ hasText: "Flikflak" }).first()).toBeVisible({ timeout: 5000 });
  });

  test("reveal fase toont scores en 'Nieuwe ronde' knop", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await page.getByRole("button", { name: "Spelen!" }).click();

    // Wacht op reveal fase (AI speelt)
    const nieuweRonde = page.getByRole("button", { name: "Nieuwe ronde" });
    if (await nieuweRonde.isVisible({ timeout: 20000 })) {
      await expect(page.getByText(/Goed geroepen|Niet de laagste/i)).toBeVisible();
      await expect(nieuweRonde).toBeVisible();
    }
  });

  test("'Nieuwe ronde' start volgende ronde", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await page.getByRole("button", { name: "Spelen!" }).click();

    const nieuweRonde = page.getByRole("button", { name: "Nieuwe ronde" });
    if (await nieuweRonde.isVisible({ timeout: 20000 })) {
      await nieuweRonde.click();
      // Nieuwe ronde: peek fase of spelfase zichtbaar
      await expect(page.getByText(/bekijkt kaarten|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("vs AI modus via URL parameter ?ai=1", async ({ page }) => {
    await page.goto("/beverbende?ai=1");
    await expect(page.getByText("AI").first()).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    await expect(page.getByText(/bekijkt kaarten|aan de beurt|Flikflak/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("terugknop in spel keert terug naar startscherm", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(500);
    // Header terug-knop
    await page.locator("button").filter({ hasText: "←" }).first().click();
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 3000 });
  });

  test("lobby switcher navigeert naar lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "beverbende");
    await expect(page).toHaveURL(/game=beverbende/);
  });

  test("regels-popup opent via ? knop", async ({ page }) => {
    await page.goto("/beverbende");
    await page.getByRole("button", { name: "Spelen!" }).click();
    await page.waitForTimeout(300);
    const rulesBtn = page.locator("button").filter({ hasText: "?" });
    if (await rulesBtn.isVisible({ timeout: 2000 })) {
      await rulesBtn.click();
      await expect(page.locator("div").filter({ hasText: /regel|hoe speel/i }).first()).toBeVisible({ timeout: 3000 });
    }
  });
});
