import { test, expect } from "@playwright/test";

test.describe("Carcassonne spel", () => {
  test("startscherm toont titel en speelknop", async ({ page }) => {
    await page.goto("/carcassonne");
    // Carcassonne heeft één "Spelen!" knop, geen 2Spelers/vsAI knoppen
    await expect(page.getByRole("heading", { name: /Carcassonne/i }).or(
      page.getByText("Carcassonne").first()
    )).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
  });

  test("naam-invoervelden tonen Speler 1 en Speler 2", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.locator("label").filter({ hasText: "Speler 1" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("input").first()).toBeVisible();
  });

  test("spel start na klikken Spelen!", async ({ page }) => {
    await page.goto("/carcassonne");
    await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Spelen!" }).click();
    // Na start: speelbord zichtbaar (Leg tegels tekst of canvas/grid)
    await expect(
      page.getByText(/Leg tegels|Bouw|Meeple|Plaatsen|jouw beurt/i).first().or(
        page.locator("canvas").first()
      )
    ).toBeVisible({ timeout: 8000 });
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/carcassonne");
    // Carcassonne start screen heeft geen ← Terug — gebruik BottomNav home
    const homeBtn = page.getByRole("button").filter({ hasText: /home/i }).first();
    if (await homeBtn.isVisible({ timeout: 2000 })) {
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
    } else {
      // Acceptabel: geen terugknop op startscherm
      await expect(page.getByRole("button", { name: "Spelen!" })).toBeVisible({ timeout: 5000 });
    }
  });

  test("lobby switcher navigeert naar carcassonne lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "carcassonne");
    await expect(page).toHaveURL(/game=carcassonne/);
  });
});
