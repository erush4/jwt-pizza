import { test, expect } from "playwright-test-coverage";

async function login(page) {
  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();
}

async function register(page) {
  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("Test");
  await page.getByRole("textbox", { name: "Email address" }).fill("t");
  await page.getByRole("textbox", { name: "Email address" }).fill("t@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.locator("#navbar-dark")).toContainText("Logout");
}

test("home page", async ({ page }) => {
  await page.goto("/");
  expect(await page.title()).toBe("JWT Pizza");
});

test("login", async ({ page }) => {
  login(page);
  await expect(page.locator("#navbar-dark")).toContainText("Logout");
});

test("register", async ({ page }) => {
  register(page);
  await expect(page.locator("#navbar-dark")).toContainText("Logout");
});
