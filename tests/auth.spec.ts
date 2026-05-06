import { test, expect } from "@playwright/test";

const UNIQUE = `tu_${Date.now().toString().slice(-8)}`;

test.describe("Authenticatie", () => {
  test("registreren met nieuw account", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Inloggen" }).last().click();
    await expect(page.getByText("Account")).toBeVisible({ timeout: 5000 });

    // Wissel naar de "Account aanmaken" tab (= registreer tab)
    await page.getByRole("button", { name: "Account aanmaken" }).first().click();

    await page.getByPlaceholder("Gebruikersnaam").fill(UNIQUE);
    await page.getByPlaceholder("Wachtwoord").fill("testpass123");
    // Submit-knop is de laatste "Account aanmaken" knop
    await page.getByRole("button", { name: "Account aanmaken" }).last().click();

    await expect(page.getByText("Account", { exact: true })).not.toBeVisible({ timeout: 10000 });
  });

  test("inloggen met verkeerd wachtwoord toont fout", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Inloggen" }).last().click();
    await expect(page.getByPlaceholder("Gebruikersnaam")).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder("Gebruikersnaam").fill("bestaat_niet_xyz");
    await page.getByPlaceholder("Wachtwoord").fill("fout");
    // Submit-knop in login tab is "Inloggen" (t.signIn) — klik de laatste knop
    await page.getByRole("button", { name: "Inloggen" }).last().click();

    await expect(page.getByText(/onbekende gebruiker|onjuist|fout|Er ging|niet gevonden/i)).toBeVisible({ timeout: 8000 });
  });

  test("uitloggen werkt", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Inloggen" }).last().click();
    await expect(page.getByPlaceholder("Gebruikersnaam")).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder("Gebruikersnaam").fill(UNIQUE);
    await page.getByPlaceholder("Wachtwoord").fill("testpass123");
    await page.getByRole("button", { name: "Inloggen" }).last().click();
    await expect(page.getByText("Account", { exact: true })).not.toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Uitloggen" }).click();
    await expect(page.getByRole("button", { name: "Inloggen" })).toBeVisible({ timeout: 5000 });
  });
});
