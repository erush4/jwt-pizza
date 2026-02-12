import { Page, Route } from "@playwright/test";
import { expect } from "playwright-test-coverage";
import { User, Role, Franchise } from "../src/service/pizzaService";

const pizzaFactoryUrl = process.env.VITE_PIZZA_FACTORY_URL;

const authTokenValue: string = "yeah this authoken is fake sorry";
const mockedJwt: string = "hi I'm a jwt";

async function hasAuthToken(route: Route) {
  const authHeader = await route.request().headerValue("Authorization");
  expect(authHeader).not.toBeNull();
  expect(authHeader).toContain(authTokenValue);
}

async function login(page: Page, user: User) {
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(user.email!);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password!);
  await page.getByTestId("submit").click();
}

const validUsers: Record<string, User> = {
  diner: {
    id: 3,
    name: "Kai Chen",
    email: "d@test.com",
    password: "a",
    roles: [{ role: Role.Diner }],
  },
  franchisee: {
    id: 10,
    name: "Best Pizza",
    email: "pizza@test.com",
    password: "b",
    roles: [{ role: Role.Franchisee }],
  },
  admin: {
    id: 7,
    name: "Head Honcho",
    email: "admin@test.com",
    password: "c",
    roles: [{ role: Role.Admin }],
  },
  new: {
    id: 1000,
    name: "newbie",
    email: "new@test.com",
    password: "d",
    roles: [{ role: Role.Diner }],
  },
};

async function authMock(page: Page) {
  let loggedInUser: User | undefined;

  // login and logout for the given user
  await page.route("*/**/api/auth", async (route) => {
    //handle route methods
    const method = route.request().method();
    switch (method) {
      //login
      case "PUT":
        const loginReq = route.request().postDataJSON();
        const user = Object.values(validUsers).find(
          (u) => u.email === loginReq.email,
        );
        if (!user || user.password !== loginReq.password) {
          await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
          return;
        }
        loggedInUser = user;
        const loginRes = {
          user: loggedInUser,
          token: authTokenValue,
        };
        await route.fulfill({ json: loginRes });
        break;

      //logout
      case "DELETE":
        await hasAuthToken(route);
        loggedInUser = undefined;
        await route.fulfill({ json: { message: "logout successful" } });
        break;

      //register
      case "POST":
        const registerReq = route.request().postDataJSON();
        if (!registerReq.email || !registerReq.name || !registerReq.password) {
          await route.fulfill({
            status: 400,
            json: { error: "name, email, and password are required" },
          });
        }
        loggedInUser = validUsers["new"];
        const registerRes = {
          user: loggedInUser,
          token: authTokenValue,
        };
        await route.fulfill({ json: registerRes });
        break;
    }
  });

  // Return the currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await hasAuthToken(route);
    await route.fulfill({ json: loggedInUser });
  });
}

async function menuMock(page: Page) {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });
}
async function franchisesMock(page: Page) {
  let idNum = 4;
  const franchiseUser = validUsers["franchisee"];
  const franchises: Franchise[] = [
    {
      id: 1,
      admins: [
        {
          id: franchiseUser.id,
          name: franchiseUser.name,
          email: franchiseUser.email!,
        },
      ],
      name: "LotaPizza",
      stores: [
        { id: 4, name: "Lehi" },
        { id: 5, name: "Springville" },
        { id: 6, name: "American Fork" },
      ],
    },
    {
      id: 2,
      name: "PizzaCorp",
      admins: [{ id: 3, name: "test franchisee", email: "test@test/com" }],
      stores: [{ id: 7, name: "Spanish Fork" }],
    },
    {
      id: 3,
      name: "topSpot",
      admins: [{ id: 3, name: "test franchisee", email: "test@test.com" }],
      stores: [],
    },
  ];
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    //handle route methods
    const method = route.request().method();
    switch (method) {
      case "GET":
        const franchiseRes = {
          franchises: franchises,
        };
        await route.fulfill({ json: franchiseRes });
        break;
      case "POST":
        hasAuthToken(route);
        const newFranchise: Franchise = route.request().postDataJSON();
        const adminEmails = newFranchise.admins!.map((admin) => admin.email);
        const newAdmins = adminEmails.flatMap((email) => {
          const user = Object.values(validUsers).find((u) => u.email === email);
          return user?.email
            ? [
                {
                  email: user.email,
                  id: user.id,
                  name: user.name,
                },
              ]
            : [];
        });
        newFranchise.id = idNum++;
        newFranchise.admins = newAdmins;
        franchises.push(newFranchise);
        await route.fulfill({ json: newFranchise });
        break;
    }
  });
  await page.route("*/**/api/franchise/*", async (route) => {
    const method = route.request().method();
    const user = validUsers["franchisee"];

    switch (method) {
      case "GET":
        await hasAuthToken(route);
        // Filter franchises for the franchisee user
        const userFranchises = franchises.filter((f) =>
          f.admins?.some((admin) => admin.email === user.email),
        );
        await route.fulfill({ json: userFranchises });
        break;

      case "DELETE":
        await hasAuthToken(route);
        const urlParts = route.request().url().split("/");
        const franchiseId: number = Number(urlParts[urlParts.length - 1]);

        const index = franchises.findIndex((f) => f.id === franchiseId);
        if (index !== -1) {
          franchises.splice(index, 1);
        }
        route.fulfill({ json: { message: "franchise deleted" } });
        break;
    }
  });
}

async function orderMock(page: Page) {
  await page.route("*/**/api/order", async (route) => {
    const method = route.request().method();
    switch (method) {
      case "POST":
        const orderReq = route.request().postDataJSON();
        const orderRes = {
          order: { ...orderReq, id: 23 },
          jwt: mockedJwt,
        };
        expect(route.request().method()).toBe("POST");
        await hasAuthToken(route);
        await route.fulfill({ json: orderRes });
        break;

      // get orders for diner-dashboard
      case "GET":
        await hasAuthToken(route);
        await route.fulfill({
          json: {
            dinerId: validUsers["diner"].id,
            orders: [
              {
                id: 1,
                franchiseId: 1,
                storeId: 1,
                date: "2026-02-10T19:42:48.000Z",
                items: [
                  { id: 1, menuId: 2, description: "Pepperoni", price: 0.0042 },
                ],
              },
              {
                id: 2,
                franchiseId: 1,
                storeId: 1,
                date: "2026-02-10T19:44:40.000Z",
                items: [
                  { id: 2, menuId: 1, description: "Veggie", price: 0.0038 },
                  { id: 3, menuId: 2, description: "Pepperoni", price: 0.0042 },
                ],
              },
            ],
            page: 1,
          },
        });
        break;
    }
  });
}

async function jwtMock(page: Page) {
  await page.route(pizzaFactoryUrl + "/api/order/verify", async (route) => {
    expect(route.request().method()).toBe("POST");
    const jwtReq = route.request().postDataJSON();
    if (jwtReq.jwt != mockedJwt) {
      await route.fulfill({
        status: 401,
        json: { error: "bad jwt" },
      });
    }
    await route.fulfill({
      json: {
        message: "valid",
        payload: {
          vendor: { id: "etrush4", name: "Ethan Rushforth" },
          diner: { id: 10, name: "test3", email: "t@jwt.com" },
          order: {
            items: [
              { menuId: 1, description: "Veggie", price: 0.008 },
              { menuId: 1, description: "Pepperoni", price: 0.0042 },
            ],
            storeId: "4",
            franchiseId: 2,
            id: 23,
          },
        },
      },
    });
  });
}

async function getUserFranchiseMock(page: Page) {
  await page.route("*/**/api/franchise/*", async (route) => {
    const method = route.request().method();
    const user = validUsers["franchisee"];
    switch (method) {
      case "GET":
        const franchiseRes = [
          {
            id: 2,
            name: "LotaPizza",
            admins: [{ id: 3, name: "pizza franchisee", email: user.email! }],
            stores: [
              { id: 4, name: "Lehi", totalRevenue: 0 },
              { id: 5, name: "Springville", totalRevenue: 0 },
              { id: 6, name: "American Fork", totalRevenue: 0 },
            ],
          },
        ];
        await hasAuthToken(route);
        await route.fulfill({ json: franchiseRes });
        break;

      case "DELETE":
    }
  });
}

async function fakeMock(page: Page) {
  await page.route("route", async (route) => {});
}
export {
  authMock,
  menuMock,
  franchisesMock,
  orderMock,
  jwtMock,
  login,
  fakeMock as getUserFranchiseMock,
  authTokenValue,
  validUsers,
};
