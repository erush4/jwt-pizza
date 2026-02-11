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
  await getFranchisesMock(page);
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe("admin dashboard", () => {
  test("dashboard opens", async ({ page }) => {
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

  test("", async ({ page }) => {

  });
});
