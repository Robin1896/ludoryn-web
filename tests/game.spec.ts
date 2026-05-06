import { test, expect } from "@playwright/test";

const ROLL_MS = 1600; // wacht op dobbelsteenanimatie (1400ms + marge)

test.describe("Grub lokaal spel", () => {
  test("startscherm toont knoppen en ondertitel", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
    await expect(page.getByText("Dobbelstenen · Beestjes · Stelen")).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/grub");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
  });

  test("2-spelers lokaal spel start en toont Gooi-knop", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: "Gooi" })).toBeVisible({ timeout: 12000 });
  });

  test("aangepaste namen zichtbaar in score-pills na start", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    const inputs = page.getByPlaceholder("Naam...");
    await inputs.nth(0).fill("Alice");
    await inputs.nth(1).fill("Bob");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByText("Alice").first()).toBeVisible({ timeout: 12000 });
    await expect(page.getByText("Bob").first()).toBeVisible({ timeout: 12000 });
  });

  test("na het gooien verandert de spelstatus", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    await page.getByRole("button", { name: "2 Spelers" }).click();

    const rollBtn = page.getByRole("button", { name: "Gooi" });
    await expect(rollBtn).toBeVisible({ timeout: 12000 });
    await rollBtn.click();
    // Na het gooien: animatie of direct resultaat
    await page.waitForTimeout(ROLL_MS);
    // Spel is in een nieuwe fase: Pech!, of Gooi is uitgeschakeld, of Stop is actief
    const hadBust = await page.getByText("Pech!").isVisible();
    const rollDisabled = await rollBtn.isDisabled().catch(() => false);
    const stopVisible = await page.getByRole("button", { name: /^Stop/ }).isVisible();
    expect(hadBust || rollDisabled || stopVisible).toBe(true);
  });

  test("Stop-knop aanwezig naast Gooi-knop", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible({ timeout: 12000 });
  });

  test("VS AI: AI speelt na speler actie", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible({ timeout: 12000 });
    await page.getByRole("button", { name: "vs AI" }).click();

    const rollBtn = page.getByRole("button", { name: "Gooi" });
    await expect(rollBtn).toBeVisible({ timeout: 12000 });
    await rollBtn.click();
    await page.waitForTimeout(ROLL_MS);

    const hadBust = await page.getByText("Pech!").isVisible();
    if (hadBust) {
      await page.getByRole("button", { name: "Verder" }).click();
      await expect(page.getByText("AI speelt...")).toBeVisible({ timeout: 8000 });
    } else {
      const faceBtn = page.locator("button span").filter({ hasText: /^[1-5W]$/ }).first();
      if (await faceBtn.isVisible({ timeout: 2000 })) {
        await faceBtn.click();
        await expect(page.getByRole("button", { name: /Gooi|Verder|AI speelt/ })).toBeVisible({ timeout: 8000 });
      }
    }
  });

  test("opnieuw starten na te navigeren", async ({ page }) => {
    await page.goto("/grub");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 12000 });
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.getByRole("button", { name: "Gooi" })).toBeVisible({ timeout: 12000 });
    // Navigeer terug naar startscherm
    await page.goto("/grub");
    // Wacht opnieuw op startscherm — HF Space kan traag zijn bij reload
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 20000 });
  });
});
