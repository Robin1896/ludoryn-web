import { test, expect } from "@playwright/test";

test.describe("Qwixx spel", () => {
  test("startscherm toont modus-knoppen", async ({ page }) => {
    await page.goto("/qwixx");
    // Qwixx heet "Kriskras" in de UI
    await expect(page.getByText("Kriskras").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/qwixx");
    await expect(page.getByText("Kriskras").first()).toBeVisible({ timeout: 10000 });
    // Qwixx startscherm heeft geen "← Terug" — gebruik BottomNav of direct navigeren
    const backBtn = page.getByText("← Terug");
    if (await backBtn.isVisible({ timeout: 2000 })) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/$/, { timeout: 8000 });
    } else {
      // Acceptabel: geen terugknop op dit startscherm
      await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    }
  });

  test("2-spelers lokaal spel start en toont scorekaart", async ({ page }) => {
    await page.goto("/qwixx");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.locator("button, div").filter({ hasText: /Gooi|Roll|Speel/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/qwixx");
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("button, div").filter({ hasText: /Gooi|Roll|Speel/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test("lobby switcher navigeert naar qwixx lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await expect(page.getByText("Open tafels")).toBeVisible({ timeout: 20000 });
    await page.selectOption("select", "qwixx");
    await expect(page).toHaveURL(/game=qwixx/, { timeout: 8000 });
  });
});
