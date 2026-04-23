import { test, expect } from "@playwright/test";

// Max 20 chars: "tu_" + last 8 digits of timestamp = 3+8 = 11 chars
const UNIQUE = `tu_${Date.now().toString().slice(-8)}`;

test.describe("Authenticatie", () => {
  test("registreren met nieuw account", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");

    await page.locator("button", { hasText: "Inloggen" }).last().click();
    await expect(page.getByText("Account")).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Registreren" }).click();

    await page.getByPlaceholder("Gebruikersnaam").fill(UNIQUE);
    await page.getByPlaceholder("Wachtwoord").fill("testpass123");
    await page.getByRole("button", { name: /Account aanmaken/i }).click();

    // Na succes: modal sluit (titel "Account" verdwijnt met exact match)
    await expect(page.getByText("Account", { exact: true })).not.toBeVisible({ timeout: 5000 });
  });

  test("inloggen met verkeerd wachtwoord toont fout", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await page.locator("button", { hasText: "Inloggen" }).last().click();

    await page.getByPlaceholder("Gebruikersnaam").fill("bestaat_niet_xyz");
    await page.getByPlaceholder("Wachtwoord").fill("fout");
    await page.getByRole("button", { name: /Inloggen →/ }).click();

    await expect(page.getByText(/onbekende gebruiker|onjuist|fout|Er ging/i)).toBeVisible({ timeout: 3000 });
  });

  test("uitloggen werkt", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("catanja-name"));
    await page.goto("/lobby?game=grub");
    await page.locator("button", { hasText: "Inloggen" }).last().click();

    await page.getByPlaceholder("Gebruikersnaam").fill(UNIQUE);
    await page.getByPlaceholder("Wachtwoord").fill("testpass123");
    await page.getByRole("button", { name: /Inloggen →/ }).click();

    await expect(page.getByText("Account", { exact: true })).not.toBeVisible({ timeout: 5000 });

    await page.getByText("Uitloggen").click();
    await expect(page.locator("button", { hasText: "Inloggen" })).toBeVisible({ timeout: 3000 });
  });
});
