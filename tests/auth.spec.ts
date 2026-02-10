import { expect, test } from "playwright-test-coverage";
import { authMock, authTokenValue, validUsers } from "./mocks";
import { Page } from "@playwright/test";
import { User } from "../src/service/pizzaService";

async function login(page: Page, user: User) {
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(user.email!);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password!);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForResponse((response) => {
    return response.url().includes("/api/auth") && response.status() === 200;
  });
}

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await page.goto("/");
});

test("login diner", async ({ page }) => {
  await login(page, validUsers["diner"]);
  await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).not.toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("token")),
  ).resolves.toBe(authTokenValue);
});

//TODO: failed login

test("logout", async ({ page }) => {
  await login(page, validUsers["diner"]);
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "KC" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).not.toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("token")),
  ).resolves.toBeNull();
});

test("new test template", async ({ page }) => {});
