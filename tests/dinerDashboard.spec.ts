import { expect, test } from "playwright-test-coverage";
import { authMock, login, orderMock, validUsers } from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await orderMock(page);
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

  expect(await page.getByTestId("orders").locator('tr').count()).toBe(2);
});
