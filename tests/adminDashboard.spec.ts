import { expect, test } from "playwright-test-coverage";
import { authMock, franchisesMock, login, validUsers } from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await franchisesMock(page);
  await page.goto("/");
  const user = validUsers["admin"];
  await login(page, user);
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
    await page.getByRole("link", { name: "Admin" }).click();
    expect(page.url()).toContain("/admin-dashboard");
    await page.locator("tbody.divide-y").first().waitFor();
    const franchiseCount = await page.locator("tbody.divide-y").count();
    expect(franchiseCount).toEqual(3);
    const totalStores = await page.locator("tr.bg-neutral-100").count();
    expect(totalStores).toEqual(4);
  });

  // test("create and close franchise", async ({ page }) => {
  //   await page.getByRole("link", { name: "Admin" }).click();

  //   //add franchise
  //   await page.getByRole("button", { name: "Add Franchise" }).click();
  //   await page
  //     .getByRole("textbox", { name: "franchise name" })
  //     .fill("test franchise");
  //   await page
  //     .getByRole("textbox", { name: "franchisee admin email" })
  //     .fill("test@test.com");
  //   await page.getByRole("button", { name: "Create" }).click();

  //   //verify franchise
  //   await expect(
  //     page.getByRole("cell", { name: "testfranchise" }),
  //   ).toBeVisible();
  //   await expect(
  //     page.getByRole("cell", { name: "pizza franchisee" }).nth(1),
  //   ).toBeVisible();

  //   //close franchise
  //   await page
  //     .getByRole("row", { name: "testfranchise pizza" })
  //     .getByRole("button")
  //     .click();
  //   expect(page.url()).toContain("/close-franchise");
  //   await page.getByRole("button", { name: "Close" }).click();
  // });

  // // todo: add error message
});
