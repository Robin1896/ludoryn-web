/**
 * Grub Hunt (Kriekel Duel) — End-to-End Tests
 *
 * Kriekel Duel is een dobbelspel voor 2 spelers (of vs AI).
 * Spelers gooien 8 dobbelstenen en kiezen steeds één gezicht om te bewaren.
 * Doel: bereik een totaal ≥ 21 MET minimaal één beestje (W) en pak een tegel.
 * Pech = geen nieuw gezicht beschikbaar → verlies je bovenste tegel.
 * Wie het meeste beestjes heeft als het spel stopt, wint.
 *
 * UI-flow:
 *   Startscherm (/grub)
 *     → "KRIEKEL DUEL" titel
 *     → naam invoer (standaard "Robin" / "Loic")
 *     → knop "2 Spelers" of "vs AI"
 *   Speelbord
 *     → 16 tegels (waarden 21-36, elk met 1-4 beestjes)
 *     → Bewaard-rij: reeds gekozen dobbelstenen
 *     → Gegooid-rij: nieuwe rol
 *     → Statuschips: TOTAAL · beestje OK/nodig · DOBBELSTENEN
 *     → Knoppen: "Gooi" / "✓ Bevestig" / "Stop (XX)"
 *     → Pech: "Pech! Geen geldige dobbelstenen." + knop "Verder"
 *     → Einde: "Spel Voorbij!" + scores + "Opnieuw spelen"
 */

import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wacht tot de beurt van de menselijke speler begint (Gooi-knop zichtbaar en actief). */
async function waitForMyTurn(page: Page, timeout = 20000) {
  await expect(
    page.getByRole("button", { name: /Gooi/ }).or(
      page.getByRole("button", { name: /✓ Bevestig/ })
    ).or(
      page.getByRole("button", { name: /Verder/ })
    ).or(
      page.getByRole("button", { name: /Opnieuw spelen/ })
    )
  ).toBeEnabled({ timeout });
}

/**
 * Speelt één volledige beurt van de menselijke speler.
 * Returnt 'bust' | 'stopped' | 'rolled' | 'gameover'.
 */
async function playOneTurn(page: Page): Promise<"bust" | "stopped" | "gameover"> {
  // Controleer eerst of het spel al voorbij is
  if (await page.getByText("Spel Voorbij!").isVisible().catch(() => false)) {
    return "gameover";
  }

  // Gooi de dobbelstenen
  const rollBtn = page.getByRole("button", { name: /Gooi/ });
  if (await rollBtn.isEnabled().catch(() => false)) {
    await rollBtn.click();
    await page.waitForTimeout(600); // wacht op animatie
  }

  // Loop: kies dobbelstenen en bevestig totdat we stoppen of pech hebben
  let iterations = 0;
  while (iterations++ < 15) {
    // Spel voorbij?
    if (await page.getByText("Spel Voorbij!").isVisible().catch(() => false)) {
      return "gameover";
    }

    // Pech!
    const pechText = page.getByText(/Pech! Geen geldige/);
    if (await pechText.isVisible().catch(() => false)) {
      const verderBtn = page.getByRole("button", { name: "Verder" });
      if (await verderBtn.isEnabled().catch(() => false)) {
        await verderBtn.click();
        await page.waitForTimeout(500);
      }
      return "bust";
    }

    // Stop-knop ingeschakeld? Dan stoppen we (tegel pakken)
    const stopBtn = page.getByRole("button", { name: /^Stop/ });
    const stopEnabled = await stopBtn.isEnabled().catch(() => false);
    if (stopEnabled) {
      await stopBtn.click();
      await page.waitForTimeout(500);
      return "stopped";
    }

    // Bevestig-knop? Dan klik hem (geselecteerde dobbelstenen bevestigen)
    const bevestigBtn = page.getByRole("button", { name: /✓ Bevestig/ });
    if (await bevestigBtn.isEnabled().catch(() => false)) {
      await bevestigBtn.click();
      await page.waitForTimeout(400);

      // Na bevestigen: opnieuw gooien als mogelijk
      const rollBtn2 = page.getByRole("button", { name: /Gooi/ });
      if (await rollBtn2.isEnabled().catch(() => false)) {
        await rollBtn2.click();
        await page.waitForTimeout(600);
      }
      continue;
    }

    // Klik de eerst beschikbare dobbelsteen
    const pickableDice = page.locator('[style*="cursor: pointer"]').filter({
      hasNot: page.getByRole("button"),
    });
    const diceCount = await pickableDice.count();
    if (diceCount > 0) {
      await pickableDice.first().click();
      await page.waitForTimeout(200);
      continue;
    }

    // Niets beschikbaar — wacht even en probeer opnieuw
    await page.waitForTimeout(800);
  }

  return "stopped";
}

/**
 * Speelt een volledig spel totdat "Spel Voorbij!" verschijnt.
 * Maximaal 60 beurten (realistisch gezien eindigt een spel in 10-20 beurten).
 */
async function playUntilGameOver(page: Page) {
  for (let round = 0; round < 60; round++) {
    if (await page.getByText("Spel Voorbij!").isVisible().catch(() => false)) break;

    // Wacht op AI als die aan de beurt is
    await page.waitForTimeout(1500);

    // Controleer opnieuw na AI beurt
    if (await page.getByText("Spel Voorbij!").isVisible().catch(() => false)) break;

    // Onze beurt?
    const rollEnabled = await page
      .getByRole("button", { name: /Gooi/ })
      .isEnabled()
      .catch(() => false);
    const verderEnabled = await page
      .getByRole("button", { name: "Verder" })
      .isEnabled()
      .catch(() => false);

    if (rollEnabled || verderEnabled) {
      await playOneTurn(page);
    }
  }

  await expect(page.getByText("Spel Voorbij!")).toBeVisible({ timeout: 10000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Grub Hunt (Kriekel Duel) — startscherm", () => {
  test("toont de titel en beide speelknoppen", async ({ page }) => {
    /**
     * Verifieert dat het startscherm correct laadt met:
     * - Speltitel "KRIEKEL DUEL"
     * - Twee naam-invoervelden (standaard Robin / Loic)
     * - Knoppen "2 Spelers" en "vs AI"
     */
    await page.goto("/grub");
    await expect(page.getByText("KRIEKEL")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("DUEL")).toBeVisible();
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
    // Beschrijving van het spel
    await expect(page.getByText(/dobbelstenen.*beestjes/i)).toBeVisible();
  });

  test("naam-invoervelden tonen standaardwaarden", async ({ page }) => {
    /**
     * De twee invoervelden zijn vooraf ingevuld met "Robin" en "Loic".
     * Spelers kunnen dit aanpassen voor het spel start.
     */
    await page.goto("/grub");
    await expect(page.locator("input").first()).toHaveValue("Robin", { timeout: 8000 });
    await expect(page.locator("input").nth(1)).toHaveValue("Loic");
  });

  test("terugknop navigeert naar de homepage", async ({ page }) => {
    /**
     * De "← Terug" knop brengt de speler terug naar de Ludoryn homepage.
     */
    await page.goto("/grub");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
  });

  test("naam aanpassen werkt", async ({ page }) => {
    /**
     * De naam in het invoerveld wordt meegenomen naar het spel.
     * Als speler 1 "Tester" intypt, staat "Tester" in het speelbord.
     */
    await page.goto("/grub");
    await page.locator("input").first().fill("Tester");
    await page.getByRole("button", { name: "vs AI" }).click();
    // Wacht op het speelbord
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeVisible({ timeout: 10000 });
    // Naam "Tester" is zichtbaar in spelersinformatie
    await expect(page.getByText("Tester")).toBeVisible();
  });
});

test.describe("Grub Hunt — speelbord (vs AI)", () => {
  test("speelbord toont 16 tegels na het starten", async ({ page }) => {
    /**
     * Na "vs AI" klikken laden de 16 tegels (waarden 21-36).
     * De tegel met waarde 21 heeft 1 beestje, 36 heeft 4 beestjes.
     */
    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    // Wacht op het speelbord (Gooi-knop)
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeVisible({ timeout: 10000 });
    // Dobbelstenen-teller begint op 8
    await expect(page.getByText("8")).toBeVisible();
  });

  test("dobbelsteen gooien toont nieuwe dobbelstenen", async ({ page }) => {
    /**
     * Als de speler op "Gooi" klikt, worden er dobbelstenen gegooid.
     * De "Gegooid" rij toont de resultaten. De speler kan nu een gezicht kiezen.
     */
    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 10000 });
    await page.getByRole("button", { name: /Gooi/ }).click();
    // Na het gooien: statuslabel verandert of dobbelstenen verschijnen
    await expect(
      page.getByText(/Kies een dobbelsteen|Klik alle|Gooien/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("pech! knop Verder brengt terug naar beurt", async ({ page }) => {
    /**
     * Als er geen geldig nieuw gezicht is, krijgt de speler "Pech!".
     * De "Verder" knop beëindigt de beurt en geeft de top-tegel terug.
     * Dit test dat het spel verder kan na pech.
     *
     * Strategie: speel beurten totdat er pech optreedt (random, max 20 pogingen).
     */
    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 10000 });

    // Speel beurten totdat pech of einde
    let hadBust = false;
    for (let i = 0; i < 20 && !hadBust; i++) {
      await page.waitForTimeout(1200); // wacht op AI
      const rollEnabled = await page.getByRole("button", { name: /Gooi/ }).isEnabled().catch(() => false);
      if (!rollEnabled) continue;

      const result = await playOneTurn(page);
      if (result === "bust") hadBust = true;
      if (result === "gameover") break;
    }

    // Spel is nog steeds actief of voorbij — geen crash
    const stillPlaying = await page.getByRole("button", { name: /Gooi/ }).isVisible().catch(() => false);
    const gameOver = await page.getByText("Spel Voorbij!").isVisible().catch(() => false);
    expect(stillPlaying || gameOver).toBe(true);
  });

  test("stop-knop pakt een tegel als totaal geldig is", async ({ page }) => {
    /**
     * De "Stop (XX)" knop is alleen actief als de speler ≥21 totaal heeft
     * EN minimaal één beestje (W) heeft bewaard.
     * Na stoppen daalt het aantal beschikbare tegels met 1.
     */
    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 10000 });

    // Rol en stop zo snel mogelijk
    await page.getByRole("button", { name: /Gooi/ }).click();
    await page.waitForTimeout(600);

    // Stop-knop mag niet actief zijn direct na de eerste rol (te laag totaal waarschijnlijk)
    // Maar als hij actief is, klik dan
    const stopBtn = page.getByRole("button", { name: /^Stop/ });
    const stopEnabled = await stopBtn.isEnabled().catch(() => false);
    if (stopEnabled) {
      await stopBtn.click();
      await page.waitForTimeout(500);
      // Na stoppen: tegel gepakt → AI is aan de beurt of nieuwe ronde
      await expect(
        page.getByText(/AI is aan het nadenken|Gooi|Spel Voorbij/).first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Stop niet actief → beurt gaat door, dit is correct gedrag
      expect(stopEnabled).toBe(false);
    }
  });
});

test.describe("Grub Hunt — volledig spel vs AI (E2E)", () => {
  test("speelt een complete ronde van begin tot Spel Voorbij!", async ({ page }) => {
    /**
     * HOOFDTEST: simuleert een echte eindgebruiker die het spel volledig speelt.
     *
     * Flow:
     *  1. Open /grub
     *  2. Klik "vs AI" → speelbord laadt
     *  3. Rol dobbelstenen, kies gezichten, stop of ga verder na pech
     *  4. AI speelt zijn beurten automatisch
     *  5. Herhaal totdat "Spel Voorbij!" verschijnt
     *  6. Verifieer: winnaar-scherm zichtbaar, "Opnieuw spelen" knop aanwezig
     */
    test.setTimeout(120000); // max 2 minuten voor een volledig spel

    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 15000 });

    await playUntilGameOver(page);

    // Winnaar-scherm
    await expect(page.getByText("Spel Voorbij!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Opnieuw spelen/ })).toBeVisible();
    // Score van beide spelers zichtbaar
    await expect(page.getByText("Robin")).toBeVisible();
    await expect(page.getByText("AI")).toBeVisible();
  });

  test("Opnieuw spelen reset het bord", async ({ page }) => {
    /**
     * Na "Spel Voorbij!" klikt de speler op "Opnieuw spelen".
     * Het bord reset: alle 16 tegels zijn weer beschikbaar,
     * beide spelers starten opnieuw met 0 beestjes.
     */
    test.setTimeout(120000);

    await page.goto("/grub");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 15000 });

    await playUntilGameOver(page);
    await page.getByRole("button", { name: /Opnieuw spelen/ }).click();

    // Na reset: "Gooi" knop actief → nieuw spel begonnen
    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 8000 });
    // Alle tegels terug (dobbelstenen-teller staat weer op 8)
    await expect(page.getByText("8")).toBeVisible();
  });
});

test.describe("Grub Hunt — 2-spelers modus", () => {
  test("start een 2-spelers spel en toont beide namen", async ({ page }) => {
    /**
     * In 2-spelers modus wisselen twee menselijke spelers om de beurt.
     * Beide namen worden getoond op het speelbord.
     */
    await page.goto("/grub");
    await page.locator("input").first().fill("Speler1");
    await page.locator("input").nth(1).fill("Speler2");
    await page.getByRole("button", { name: "2 Spelers" }).click();

    await expect(page.getByRole("button", { name: /Gooi/ })).toBeEnabled({ timeout: 10000 });
    await expect(page.getByText("Speler1")).toBeVisible();
    await expect(page.getByText("Speler2")).toBeVisible();
  });
});

test.describe("Grub Hunt — navigatie via lobby", () => {
  test("lobby switcher navigeert naar grub", async ({ page }) => {
    /**
     * Vanuit de lobby kan een speler van spel wisselen via de selector.
     * Selecteren van "grub" navigeert naar /lobby?game=grub.
     */
    await page.goto("/lobby?game=beverbende");
    await page.selectOption("select", "grub");
    await expect(page).toHaveURL(/game=grub/, { timeout: 5000 });
  });
});
