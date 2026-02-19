import { expect, test } from "playwright-test-coverage";
import {
  authMock,
  franchisesMock,
  listUsersMock,
  login,
  validUsers,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await franchisesMock(page);
  await listUsersMock(page);
  await page.goto("/");
  const user = validUsers["admin"];
  await login(page, user);
  await page.getByRole("link", { name: "Admin" }).click();
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
    expect(page.url()).toContain("/admin-dashboard");
    await page.locator("tbody.divide-y").first().waitFor();
    const franchiseTable = page.getByTestId("franchiselist");
    const franchiseCount = await franchiseTable
      .locator("tbody.divide-y")
      .count();
    expect(franchiseCount).toEqual(3);
    const totalStores = await franchiseTable
      .locator("tr.bg-neutral-100")
      .count();
    expect(totalStores).toEqual(4);
  });

  test("create and close franchise", async ({ page }) => {
    const testFranchiseName = "test pizza franchise";
    //add franchise
    await page.getByRole("button", { name: "Add Franchise" }).click();
    await page
      .getByRole("textbox", { name: "franchise name" })
      .fill(testFranchiseName);
    await page
      .getByRole("textbox", { name: "franchisee admin email" })
      .fill(validUsers["franchisee"].email!);
    await page.getByRole("button", { name: "Create" }).click();

    //verify franchise
    await page.locator("tbody.divide-y").first().waitFor();
    let franchiseTable = page.getByTestId("franchiselist");
    await expect(franchiseTable).toContainText("test franchise");
    let franchiseCount = await franchiseTable.locator("tbody.divide-y").count();
    expect(franchiseCount).toEqual(4);
    //close franchise
    await page
      .getByRole("row", { name: testFranchiseName })
      .getByRole("button")
      .click();
    expect(page.url()).toContain("/close-franchise");
    await page.getByRole("button", { name: "Close" }).click();

    //verify deletion
    await page.locator("tbody.divide-y").first().waitFor();
    franchiseTable = page.getByTestId("franchiselist");
    await expect(franchiseTable).not.toContainText(testFranchiseName);
    franchiseCount = await franchiseTable.locator("tbody.divide-y").count();
    expect(franchiseCount).toEqual(3);
  });

  test("list users", async ({ page }) => {
    let userTable = page.getByTestId("userlist");
    for (const user of Object.values(validUsers)) {
      const row = userTable
        .locator("tbody.divide-y")
        .filter({ hasText: user.name });
      await expect(row).toContainText(user.email!);
    }
  });

  // // todo: add error message
});
