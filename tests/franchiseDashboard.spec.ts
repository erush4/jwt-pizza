import { expect, test } from "playwright-test-coverage";
import {
  authMock,
  getFranchisesMock,
  login,
  validUsers,
  getUserFranchiseMock,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await getUserFranchiseMock(page);
  await getFranchisesMock(page);
  await page.goto("/");
});

test("franchise dashboard opens", async ({ page }) => {
  const user = validUsers["franchisee"];
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

test("admin dashboard opens", async ({ page }) => {
  const user = validUsers["admin"];
  await login(page, user);
  await page.getByRole("link", { name: "Admin" }).click();
  expect(page.url()).toContain("/admin-dashboard");
  await page.locator("tbody.divide-y").first().waitFor();
  const franchiseCount = await page.locator("tbody.divide-y").count();
  expect(franchiseCount).toEqual(3);
  const totalStores = await page.locator("tr.bg-neutral-100").count();
  expect(totalStores).toEqual(4);
});

test.describe("new test block", () => {
  test("new test template", async ({ page }) => {});
});
