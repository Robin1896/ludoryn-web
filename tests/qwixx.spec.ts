import { test, expect } from "@playwright/test";

test.describe("Qwixx spel", () => {
  test("startscherm toont modus-knoppen", async ({ page }) => {
    await page.goto("/qwixx");
    await expect(page.getByRole("button", { name: "2 Spelers" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "vs AI" })).toBeVisible();
  });

  test("terugknop navigeert naar home", async ({ page }) => {
    await page.goto("/qwixx");
    await page.getByText("← Terug").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("2-spelers lokaal spel start en toont scorekaart", async ({ page }) => {
    await page.goto("/qwixx");
    await page.getByRole("button", { name: "2 Spelers" }).click();
    await expect(page.locator("button, div").filter({ hasText: /Gooi|Roll|Speel/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test("vs AI start en toont speelbord", async ({ page }) => {
    await page.goto("/qwixx");
    await page.getByRole("button", { name: "vs AI" }).click();
    await expect(page.locator("button, div").filter({ hasText: /Gooi|Roll|Speel/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test("lobby switcher navigeert naar qwixx lobby", async ({ page }) => {
    await page.goto("/lobby?game=grub");
    await page.selectOption("select", "qwixx");
    await expect(page).toHaveURL(/game=qwixx/);
  });
});
