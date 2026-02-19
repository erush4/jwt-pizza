import { expect, test } from "playwright-test-coverage";
import { authMock, login, orderMock, updateUserMock, validUsers } from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await orderMock(page);
  await updateUserMock(page);
  await updateUserMock(page);
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("dinerDashboard opens", async ({ page }) => {
  const user = validUsers["diner"];
  await login(page, user);
  await page.getByTestId("diner-dash").click();
  expect(page.url()).toContain("/diner-dashboard");
  await expect(page.getByTestId("username")).toContainText(user.name!);
  await expect(page.getByTestId("email")).toContainText(user.email!);
  await expect(page.getByTestId("roles")).toContainText("diner");
  await expect(page.getByTestId("roles")).toContainText("diner");

  expect(await page.getByTestId("orders").locator("tr").count()).toBe(2);
});

test("updateUser works and persists", async ({ page }) => {
  const user = validUsers["diner"];
  const newName = "pizzaDinerX";
  await login(page, user);

  await page.getByTestId("diner-dash").click();
  await expect(page.getByRole("main")).toContainText(user.name!);
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
  await expect(page.getByRole("main")).toContainText(user.name!);

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill(newName);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newName);
  await page.getByRole("link", { name: "Logout" }).click();
  expect(page.url()).not.toContain("/diner-dashboard");

  login(page, user);
  await page.getByTestId("diner-dash").click();
  expect(page.url()).toContain("/diner-dashboard");
  await expect(page.getByRole("main")).toContainText(newName);
});
