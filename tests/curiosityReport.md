# Curiosity Report: More Jest

## The Problem

I really, _really_ hate having test data in my primary database. After just a few test runs, a database will contain hundreds of entries that won't ever be touched again. This is almost never an issue: why would the primary database be stored locally on my computer? Unfortunately, JWT Pizza doesn't have a deployed backend yet, so the primary database is, in fact, stored locally on my computer. Usually, I solve this problem by having a new database be constructed at the top of each test file, and deleted at the end. It's a pretty standard fix, and it's not too hard to implement—using dependency inversion, I can pass the database as an argument when I create the router class.

JWT Pizza Service doesn't have its own router class.

Instead, it uses express.Router(), and creates a independent functions for each route. As a consequence, I can't do dependency injection without restructuring most of the code that deals with these routers. That woudn't be a _huge_ task, but I didn't want to risk breaking code that I knew worked before I had a way to test whether that code worked (shoutout test-driven development—if those South Provo devs had used it, I wouldn't be in this mess). Instead, I wanted to figure out a way to set a different database name, so that I could use a separate database for my tests.

## Approach 1

The JWT Pizza Service database pulls its name from `config.js` file. The most obvious way to change the name is to use a Jest mock. Since config.js doesn't have any functions, we can't use a function mock for this. We could use a module mock, but if we separate our tests across multiple files (something I wanted to do, so that my `service.test.js` file wasn't 1200 lines long), we'd have to redeclare our mock in every file, or separate it out to its own file, create a function that makes the mock, and then import and run the function at the head of each file. Not a lot of toil, but as it happens, there's a secret third type of Jest mock designed for this situation.

### Manual Mocks

A manual mock is a file that will be loaded in place of another file. They're often used to mock out Node modules (yes, you can do that) to prevent real HTTP calls, mocking multi-file systems, and mocks that are used many times across files—perfect for `config.js`, which we'll have to use in every test in order to avoid calling the real `pizza` database.

To make a manual mock, you first need to create a `__mocks__` folder next to the file you plan to mock out, and then put our mock file inside with the same name as our target . In our case, that would look like this:

```
/root
    /node_modules
    /public
    /src
        config.js
        /__mocks__
            config.js
    /tests

```

Side note: if you _are_ mocking something from `node_modules`, you'll need to put it in the root folder, and then name the file after the module you're mocking.

Since we only want to change one thing from `config.js`, we can use another useful function: `requireActual()`.

```javascript
const config = jest.requireActual("../config");

module.exports = {
  ...config,
  db: {
    ...config.db,
    connection: {
      ...config.db.connection,
      database: "test",
    },
  },
};
```

**If you don't use `requireActual()`, Jest will try to replace `config.js` with your mock and create a loop that can't be resolved.**

Now, in each of our test files, we can update our imports, from this:

```javascript
const request = require("supertest");
const app = require("./service");
const config = require("./config.js");
/*
You might not have config in your test file. I extracted my admin username and password to config.js (for security), so I needed to import it in order to sign in as an admin.
*/
```

to this:

```javascript
const request = require("supertest");
const app = require("./service");
const config = jest.mock("./config.js");
```
We adjust our `database.initializeDatabase()` function so that it prints out the database it uses, just so we can see if it's using the right database.

```javascript
console.log(
  dbExists
    ? `Database ${config.db.connection.database} exists`
    : `Database ${config.db.connection.database} does not exist, creating it`,
);
```

Now, we run the tests, and...

```shell
> jwt-pizza-service@1.0.0 test
> jest

  console.log
    Database pizza exists

      at DB.log [as initializeDatabase] (src/database/database.js:445:17)
```

We're still using the `pizza` database! What was all that work for? Let's take a look at our imports again:

```javascript
const request = require("supertest");
const app = require("./service");
const config = jest.mock("./config.js");
```

Here's the issue: we're mocking `config.js` _after_ we imported `service`. Normally, this isn't a problem—Jest uses a plugin (Babel, specifically) to look for mocks and then "hoist" them up so they run before the other imports. However, this only works when using `jest.mock("...")` on its on line. In my case, I'm also assigning the value of our mock: `const config = jest.mock("...")`, so Babel doesn't see the line.

When we import `service`, we also get all of it's imports—and in this case, that includes our database. When the database is loaded, it also runs all of _that_ code, which includes the lazy loader:

```javascript
const db = new DB();
module.exports = { Role, DB: db };
```

Since the database is created before the mock takes effect, it never has the chance to see the updated name from our `config` file. There are two possible fixes to this problem:

#### 1. Import first, then assign to `config

```javascript
const request = require("supertest");
const app = require("./service");
jest.mock("./config.js");
const config = require("./config.js");
```

This will ensure that Babel hoists the mock statement up, so that all imports get the mock.

#### 2. Just move it up

```javascript
const request = require("supertest");
const config = jest.mock("./config.js");
const app = require("./service");
```

This one's pretty self-explanatory. If the mock happens before the database initializes, there's no problem.

Once either fix is in place, everything works just fine.

```shell
$ npm run test

> jwt-pizza-service@1.0.0 test
> jest

  console.log
    Database pizza exists

      at DB.log [as initializeDatabase] (src/database/database.js:445:17)

 PASS  src/service.test.js
  √ login (129 ms)
  √ logout (153 ms)
  √ getUser (15 ms)
  √ getFranchises (15 ms)
```

## Approach 2

The first approach works just fine, but it only creates a single database. Depending on how you write your tests, you might encounter issues caused from pre-existing test data or modifiers. For instance, if your `deleteFranchise` and `createFranchise` tests run simultaneously, your tests get a little flaky, since the number of franchises might remain the same depending on how the tests run. To tackle this issue, we need to look into the mefchanics of how Jest runs tests concurrently.

You've probably seen something like this when you run your tests: ```

## Sources

| Concept      | Website                                         |
| ------------ | ----------------------------------------------- |
| Manual Mocks | https://jestjs.io/docs/manual-mocks             |
| Hoisting     | https://jestjs.io/docs/jest-object#mock-modules |
