import { Page, Route } from "@playwright/test";
import { expect, test } from "playwright-test-coverage";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("About loads", async ({ page }) => {
  await page.getByRole("link", { name: "About" }).click();
  expect(page.url()).toContain("/about");
});

test("History loads", async ({ page }) => {
  await page.getByRole("link", { name: "History" }).click();
  expect(page.url()).toContain("/history");
});
