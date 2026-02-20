import { expect, test } from "playwright-test-coverage";
import {
  authMock,
  franchisesMock,
  listUsersMock,
  listUsersPageMock,
  login,
  testUsers,
  validUsers,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await page.unrouteAll();
  await authMock(page);
  await franchisesMock(page);
  await listUsersMock(page);
  await page.goto("/");
  const user = testUsers["admin"];
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
    const franchiseTable = page.getByTestId("franchiselist");
    await franchiseTable.locator("tbody.divide-y").first().waitFor();

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
    await page.getByRole("link", { name: "Admin" }).click();
    const testFranchiseName = "test pizza franchise";
    //add franchise
    await page.getByRole("button", { name: "Add Franchise" }).click();
    await page
      .getByRole("textbox", { name: "franchise name" })
      .fill(testFranchiseName);
    await page
      .getByRole("textbox", { name: "franchisee admin email" })
      .fill(testUsers["franchisee"].email!);
    await page.getByRole("button", { name: "Create" }).click();

    //verify franchise
    let franchiseTable = page.getByTestId("franchiselist");
    await franchiseTable.locator("tbody.divide-y").first().waitFor();
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
    await franchiseTable.locator("tbody.divide-y").first().waitFor();
    franchiseTable = page.getByTestId("franchiselist");
    await expect(franchiseTable).not.toContainText(testFranchiseName);
    franchiseCount = await franchiseTable.locator("tbody.divide-y").count();
    expect(franchiseCount).toEqual(3);
  });
  // // todo: add error message

  test.describe("listUsers", () => {
    test("list users", async ({ page }) => {
      await page.getByRole("link", { name: "Admin" }).click();
      let userTable = page.getByTestId("userlist");
      let userCount = 0;
      await userTable.locator("tbody.divide-y").first().waitFor();
      for (const user of Object.values(validUsers)) {
        userCount++;
        const row = userTable
          .locator("tbody.divide-y")
          .filter({ hasText: user.name });
        await expect(row).toContainText(user.email!);
      }
      expect(userCount).toBe(Object.keys(validUsers).length);
    });

    test("list users pagination", async ({ page }) => {
      //add page mock
      const path = /.*\/api\/user\?page=\d+&limit=\d+&name=.*/;
      await page.unroute(path);
      const limit = 2;
      await listUsersPageMock(page, limit);

      //navigate
      await page.getByRole("link", { name: "Admin" }).click();
      const userTable = page.getByTestId("userlist");

      //verify first page
      await userTable.locator("tbody.divide-y").first().waitFor();
      let userCount = await userTable.locator("tbody.divide-y").count();
      expect(userCount).toBe(limit);
      const backButton = userTable.getByRole("button", { name: "«" });
      const nextButton = userTable.getByRole("button", { name: "»" });
      let firstRow = userTable.locator("tbody.divide-y").nth(0);
      const before = await firstRow.textContent();
      await expect(backButton).toBeDisabled();
      await expect(nextButton).toBeEnabled();

      //verify next page
      await nextButton.click();
      await userTable.locator("tbody.divide-y").first().waitFor();

      userCount = await userTable.locator("tbody.divide-y").count();
      expect(userCount).toBeLessThanOrEqual(limit);
      firstRow = userTable.locator("tbody.divide-y").nth(0);
      await expect(firstRow).not.toHaveText(before!);
      await expect(backButton).toBeEnabled();

      //verify first page didn't change
      await backButton.click();
      await userTable.locator("tbody.divide-y").first().waitFor();
      await expect(backButton).toBeDisabled();
      await expect(nextButton).toBeEnabled();
      await expect(firstRow).toHaveText(before!);
    });

    test("list users filtering", async ({ page }) => {
      await page.getByRole("link", { name: "Admin" }).click();
      const userTable = page.getByTestId("userlist");
      await userTable.locator("tbody.divide-y").first().waitFor();
      let userCount = await userTable.locator("tbody.divide-y").count();
      expect(userCount).toBe(Object.keys(validUsers).length);
      const user = testUsers["diner"];

      //filter all but one
      await page
        .getByTestId("userlist")
        .getByRole("textbox", { name: "Filter users" })
        .fill(user.name!);
      await page
        .getByTestId("userlist")
        .getByRole("button", { name: "Submit" })
        .click();
      await userTable.locator("tbody.divide-y").first().waitFor();
      userCount = await userTable.locator("tbody.divide-y").count();
      expect(userCount).toBe(1);
      await expect(
        userTable.locator("tbody.divide-y").filter({ hasText: user.name! }),
      ).toContainText(user.email!);

      // back to normal
      await page
        .getByTestId("userlist")
        .getByRole("textbox", { name: "Filter users" })
        .fill("");
      await page
        .getByTestId("userlist")
        .getByRole("button", { name: "Submit" })
        .click();
      await userTable.locator("tbody.divide-y").first().waitFor();
      userCount = await userTable.locator("tbody.divide-y").count();
      expect(userCount).toBe(Object.keys(validUsers).length);
    });
  });
});
