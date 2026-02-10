import { expect, test } from "playwright-test-coverage";
import { loginMock, menuMock, getFranchisesMock, orderMock } from "./mocks";
import { Page } from "@playwright/test";

async function mockSetup(page: Page) {
  await loginMock(page);
  await menuMock(page);
  await getFranchisesMock(page);
  await orderMock(page);
  await page.goto("/");
}

test("purchase with login", async ({ page }) => {
  await mockSetup(page);

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  expect(page.url()).toContain("/menu");
  await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
  await page.getByRole("combobox").selectOption("4");
  await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await expect(page.getByRole("button", { name: "Checkout" })).toBeEnabled();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  expect(page.url()).toContain("/payment/login");
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Checkout
  expect(page.url()).toContain("/payment");
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");

  // Cancel
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(page.url()).toContain("/menu");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Payment
  expect(page.url()).toContain("/payment");
  await page.getByRole("button", { name: "Pay now" }).click();
  await page.waitForURL("**/delivery");

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();
  await expect(page.getByTestId("order-length")).toContainText("2");
});
