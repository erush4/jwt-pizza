import { Page, Route } from "@playwright/test";
import { expect } from "playwright-test-coverage";
import { User, Role } from "../src/service/pizzaService";

const pizzaFactoryUrl = process.env.VITE_PIZZA_FACTORY_URL;

const authTokenValue: string = "yeah this authoken is fake sorry";
const mockedJwt: string = "hi I'm a jwt";

async function hasAuthToken(route: Route) {
  const authHeader = await route.request().headerValue("Authorization");
  expect(authHeader).not.toBeNull();
  expect(authHeader).toContain(authTokenValue);
}

const validUsers: Record<string, User> = {
  diner: {
    id: "3",
    name: "Kai Chen",
    email: "d@test.com",
    password: "a",
    roles: [{ role: Role.Diner }],
  },
  franchisee: {
    id: "10",
    name: "Best Pizza",
    email: "pizza@test.com",
    password: "b",
    roles: [{ role: Role.Franchisee }],
  },
  admin: {
    id: "7",
    name: "Head Honcho",
    email: "admin@test.com",
    password: "c",
    roles: [{ role: Role.Admin }],
  },
  new: {
    id: "1000",
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

async function getFranchisesMock(page: Page) {
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: "LotaPizza",
          stores: [
            { id: 4, name: "Lehi" },
            { id: 5, name: "Springville" },
            { id: 6, name: "American Fork" },
          ],
        },
        { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
        { id: 4, name: "topSpot", stores: [] },
      ],
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });
}

async function orderMock(page: Page) {
  await page.route("*/**/api/order", async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: mockedJwt,
    };
    expect(route.request().method()).toBe("POST");
    await hasAuthToken(route);
    await route.fulfill({ json: orderRes });
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
            items: [{ menuId: 1, description: "Veggie", price: 0.008 }, { menuId: 1, description: "Pepperoni", price: 0.0042 }],
            storeId: "4",
            franchiseId: 2,
            id: 23,
          },
        },
      },
    });
  });
}

async function fakeMock(page: Page) {
  await page.route("route", async (route) => {});
}
export {
  authMock,
  menuMock,
  getFranchisesMock,
  orderMock,
  jwtMock,
  authTokenValue,
  validUsers,
};
