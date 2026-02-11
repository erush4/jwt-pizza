import { expect, test } from "playwright-test-coverage";
import {
  authMock,
  menuMock,
  getFranchisesMock,
  orderMock,
  validUsers,
  jwtMock,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await authMock(page);
  await authMock(page);
  await menuMock(page);
  await getFranchisesMock(page);
  await orderMock(page);
  await jwtMock(page);
  await page.goto("/");
});

test("purchase pizza", async ({ page }) => {
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

  // Login — can't use default login since we would lose the order
  const user = validUsers["diner"];
  expect(page.url()).toContain("/payment/login");
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill(user.email!);
  await page.getByPlaceholder("Password").fill(user.password!);
  await page.getByTestId("submit").click();
  await page.waitForResponse((response) => {
    return response.url().includes("/api/auth") && response.status() === 200;
  });

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

  // verify jwt
  await expect(page.getByTestId("jwt-display")).not.toBeVisible();
  await page.getByTestId("verify-jwt").click();
  await expect(page.getByTestId("jwt-display")).toBeVisible();
  await expect(page.getByTestId("jwt-display")).toContainText(
    "JWT Pizza - valid",
  );
  //tried testing close but it was so flaky I got rid of it
});
