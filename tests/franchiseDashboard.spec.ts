import { expect, test } from "playwright-test-coverage";
import {
  authMock,
  franchisesMock,
  login,
  testUsers,
  getUserFranchiseMock,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await getUserFranchiseMock(page);
  await franchisesMock(page);
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("franchise dashboard opens", async ({ page }) => {
  const user = testUsers["franchisee"];
  await login(page, user);
  await page
    .getByLabel("Global")
    .getByRole("link", { name: "Franchise" })
    .click();
  expect(page.url()).toContain("/franchise-dashboard");
  await expect(page.getByTestId("franchise-stores")).toBeVisible();
  const storeCount = await page
    .getByTestId("franchise-stores")
    .locator("tr")
    .count();
  expect(storeCount).toEqual(3);
});
