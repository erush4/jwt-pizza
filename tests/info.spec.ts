import { Page, Route } from "@playwright/test";
import { expect, test } from "playwright-test-coverage";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("About loads", async ({ page }) => {
  await page.getByRole("link", { name: "About" }).click();
  expect(page.url()).toContain("/about");
});

test("History loads", async ({ page }) => {
  await page.getByRole("link", { name: "History" }).click();
  expect(page.url()).toContain("/history");
});
