import { expect, test } from "playwright-test-coverage";
import { authMock, authTokenValue, login, testUsers } from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe("login", () => {
  test("login diner", async ({ page }) => {
    await login(page, testUsers["diner"]);
    await expect(page.getByTestId("diner-dash")).toBeVisible();
    await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Register" }),
    ).not.toBeVisible();
    await expect(
      page.evaluate(() => localStorage.getItem("token")),
    ).resolves.toBe(authTokenValue);
  });

  //TODO: failed login
});

test("logout", async ({ page }) => {
  await login(page, testUsers["diner"]);
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByTestId("diner-dash")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).not.toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("token")),
  ).resolves.toBeNull();
});

test("register", async ({ page }) => {
  const user = testUsers["new"];
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill(user.name!);
  await page.getByRole("textbox", { name: "Email address" }).fill(user.email!);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password!);
  await page.getByTestId("submit").click();
  await expect(page.getByTestId("diner-dash")).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).not.toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("token")),
  ).resolves.toBe(authTokenValue);
});
