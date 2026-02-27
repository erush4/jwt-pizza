# Curiosity Report: More Jest

## The Root Problem

I really, _really_ hate having test data in my primary database. After just a few test runs, a database will contain hundreds of entries that won't ever be touched again. This is almost never an issue: why would the primary database be stored locally on my computer? Unfortunately, JWT Pizza doesn't have a deployed backend yet, so the primary database is, in fact, stored locally on my computer. Usually, I solve this problem by having a new database be constructed at the top of each test file, and deleted at the end. It's a pretty standard fix, and it's not too hard to implement—using dependency inversion, I can pass the database as an argument when I create the router class.

JWT Pizza Service doesn't have its own router class.

Instead, it uses express.Router(), and creates a independent functions for each route. As a consequence, I can't do dependency injection without restructuring most of the code that deals with these routers. That wouldn't be a _huge_ task, but I didn't want to risk breaking code that I knew worked before I had a way to test whether that code worked (shoutout test-driven development—if those South Provo devs had used it, I wouldn't be in this mess). Instead, I wanted to figure out a way to have a variable database name, so that I could use one (or more) database(s) for testing and one database for production.

## Single Test Database

The JWT Pizza Service database pulls its name from the `config.js` file. The most obvious way to change the name is to use a Jest mock. Since config doesn't have any functions, we can't use a function mock for this. We could use a module mock, but if we separate our tests across multiple files (something I wanted to do, so that my `service.test.js` file wasn't 1200 lines long), we'd have to redeclare our mock in every file, or separate it out to its own file, create a function that makes the mock, and then import and run the function at the head of each file. Not a lot of toil, but as it happens, there's a secret third type of Jest mock designed for this situation.

### Manual Mocks

A manual mock is a file that will be loaded in place of another file. They're often used to mock out Node modules (yes, you can do that) to prevent real HTTP calls, mocking multi-file systems, and mocks that are used many times across files—perfect for `config`, which we'll have to use in every test in order to avoid calling the real `pizza` database.

To make a manual mock, you first need to create a `__mocks__` folder next to the file you plan to mock out, and then put our mock file inside with the same name as our target . In my case, that looks like this:

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

> [!NOTE]
> If you're mocking something from `node_modules`, you'll need to put it in the root folder, and then name the file after the module you're mocking.

Since we only want to change one thing from `config`, we can use another useful function: `requireActual()`.

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

> [!WARNING]
> If you don't use `requireActual()`, Jest will try to replace `config` with your mock and create a loop that can't be resolved.

Now, in each of our test files, we update our imports, from this:

```javascript
const request = require("supertest");
const app = require("./service");
const config = require("./config.js");
```

> [!NOTE]
> You might not have config in your test files. You will still need to add the mock, so that the database uses the new value.

to this:

```javascript
const request = require("supertest");
const app = require("./service");
const config = jest.mock("./config.js");
```

> [!CAUTION]
> Be sure to use the appropriate path.

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

We're still using the `pizza` database! What was all that work for?

### Jest Mock Order

Let's take a look at our imports again:

```javascript
const request = require("supertest");
const app = require("./service");
const config = jest.mock("./config.js");
```

Jest uses a plugin (Babel, specifically) to look for mocks in the top-level scope. It then "hoists" these mocks up so that they run before other imports. However, this only works when using `jest.mock("...")` on its own line. In my case, I'm also assigning the value of our mock: `const config = jest.mock("...")`, so Babel doesn't see the line.

When we import `service`, we also get all of it's imports—and in this case, that includes our database. When the database is loaded, it also runs all of _that_ code, which includes the lazy loader:

```javascript
const db = new DB();
module.exports = { Role, DB: db };
```

Since the database is created before the mock takes effect, it never has the chance to see the updated name from our `config` file. There are two possible fixes to this problem:

#### 1. Just move it up

```javascript
const request = require("supertest");
const config = jest.mock("./config.js");
const app = require("./service");
```

This one's pretty self-explanatory. If the mock is already in place before the database initializes, there's no problem.

#### 2. Separate the mock from assigning to `config`

```javascript
const request = require("supertest");
const app = require("./service");
jest.mock("./config.js");
const config = require("./config.js");
```

This will ensure that Babel hoists the mock statement up, so that it is already in place _before_ the `./service` import. I don't recommend this one, but it does work.

Once either fix is in place, everything ought to works just fine.

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

## Multiple Databases

Creating a single database is probably the way to go, but it's possible you'd want something different. Depending on how you write your tests, you might encounter issues caused from pre-existing test data or modifiers. For instance, if your `deleteFranchise` and `createFranchise` tests run simultaneously, your tests get a little flaky, since the number of franchises might remain the same depending on how the tests run. To tackle this issue, we need to look into the mechanics of how Jest runs tests concurrently.

### Workers

You've probably seen something like this when you run your Playwright tests:

```shell
Running 16 tests using 8 workers
  16 passed (16.8s)
```

Workers are how tests are able to run concurrently. Although I used Playwright in the example, Jest also uses workers (they just don't display the worker count). Each worker is its own process—it essentially has its own variables, copy of the code, and environment (if you've taken CS 324, you'll know the significance of this). Jest will queue your test files, and each worker will take one at a time until all files have been run. The workers are set up so that they delete all the data from the previous test file before starting the next, to prevent old modules or mocks from interfering with the current test.

### Jest Setup

We've already used a `jest.config.js` file to add coverage tracking to our tests, but now, we can add some extra configuration to get what we want:

```js
module.exports = {
  setupFiles: ["<rootDir>/jest.env.js"],
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
};
```

This defines code that each worker will run once before each file: essentially, a `beforeAll` that will run before the testing framework is initialized and the app loads. We can use this to add a per-worker name, so that each parallel process will connect to its own database, preventing those "double access" errors.

Now, we can create the actual `jest.env.js` file.

```javascript
const worker = process.env.JEST_WORKER_ID || "0";
const dbName = `test_db_${worker}_${Date.now()}`;
process.env.TEST_DB_NAME = dbName;
```

> [!NOTE]
> Since a single worker might run multiple files, we also add a date to distinguish databases from files run by the same worker.

This takes advantage of environment variables (global variables specific to one process—CS 324 teaches you about these). Since each worker is a new process, they will have their own set of environment variables, even though they're running the same code.

- `process.env.JEST_WORKER_ID`
  - This is an environment variable that contains the ID of the current worker, created by Jest. This ID is also the number of workers that exist so far (starting at 1).

- `process.env.TEST_DB_NAME = dbName;`
  - This creates a new environment variable, `TEST_DB_NAME` and gives it the value stored in `dbName`.

Now that we have a unique name for each file, we need a way to assign it to our database. We can do this by adjusting the `config.js` file itself:

```javascript
connection: {
      host: '127.0.0.1',
      user: 'root',
      password: ' YOUR PASSWORD HERE',
      database: process.env.TEST_DB_NAME || 'pizza',
      connectTimeout: 60000,
   },
```

Now, when config is initialized (which will happen once per file), it will check to see if there is an environment variable called `TEST_DB_NAME`. If it exists, that will be the name the database uses. Since we only set `TEST_DB_NAME` when we run our tests, the variable won't exist when we are really deploying, so it uses the default name `pizza`.

Running our tests again, we can see the databases being created.

```shell
    console.log
      Checking if database test_db_4 exists...

      at DB.log [as checkDatabaseExists] (src/database/database.js:539:13)

    console.log
      Database does not exist, creating test_db_4 at 127.0.0.1

      at DB.log [as initializeDatabase] (src/database/database.js:482:17)

    console.log
      Successfully created database

      at DB.log [as initializeDatabase] (src/database/database.js:495:19)
```

Each worker will now have its own database, preventing the double-access errors we might have gotten when we only used one. However, there's still an issue. If we accidentally insert bad data into our database in prior tests, this data will persist. So, it'd be nice to have a way to drop each database once all the tests are over.

There are a number of ways to do this, but I'll highlight two.

<details open>
<summary><h4>Approach 1: Add an <code>afterAll()</code></h4> </summary>

You might think this is strange, considering that we haven't defined any tests in our setup file. However, we don't need to—Jest handles `afterAll()` in the scope it's called in. If you've ever used a `describe()` block (like you do in CS 340), you might have added an `afterAll()` call that would run only for the tests in that block. There's something similar happening here: our `afterAll()` may not be defined in the test file, but it will run once the test file finishes.

Unfortunately, we can't just drop it straight into our `jest.env.js` file. We've configured this to run _before_ the Jest framework initializes—if we hadn't, our app would be loaded, and `config` would have already initialized. As a consequence, we can't call any of the global Jest functions, including `afterAll()`.

Fortunately, Jest has another attribute: `setupFilesAfterEnv`. As you might guess, this will configure files that should run _after_ the Jest testing environment initializes, but _before_ it starts at the top of the test file. In other words, it's a little like adding a `beforeEach()` that runs for each _test file_, instead of each _test_.

So, we update our `jest.config.js` file again, and add:

```javascript
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
```

to our `module.exports`, and then create a `jest.setup.js` file:

```javascript
const config = require("./src/config");
const mysql = require("mysql2/promise");

const dbName = process.env.TEST_DB_NAME;
afterAll(async () => {
  const { host, user, password } = config.db.connection;
  const connection = await mysql.createConnection({ host, user, password });
  await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await connection.end();

  console.log(`Dropped test database: ${dbName}`);
});
```

Now, our test run ends up looking like this:

```shell
 PASS  src/routes/userRouter.test.js
  ● Console

    console.log
      Checking if database test_db_1 exists...

      at DB.log [as checkDatabaseExists] (src/database/database.js:539:13)

    console.log
      Database does not exist, creating test_db_1 at 127.0.0.1

      at DB.log [as initializeDatabase] (src/database/database.js:482:17)

    console.log
      Successfully created database

      at DB.log [as initializeDatabase] (src/database/database.js:495:19)

    console.log
      Dropped test database: test_db_1

      at Object.log (jest.setup.js:11:11)
```

And we can be confident that each test will have its own, fresh database.

</details>

<details open>
<summary> <h4>Approach 2: Global Teardown </h4></summary>

This method isn't particularly efficient or clean, but I wanted to include it to introduce two other configuration options you can add: `globalSetup` and `globalTeardown`. These define code that doesn't run per-file—it runs in the main Jest process, before the workers are created.

In this case, we can't use the `globalSetup` option to create our database, since any environment variables or mocks we set here won't be passed on to the workers. Our tests wouldn't be able to use the new database name we set in `config`, and they'd default back to using the `pizza` database. While `globalSetup` is indeed used for slow processes like starting databases, creating test data, or spinning up Docker containers (the kinds of things you only want to do once), the JWT Pizza Service architecture doesn't allow us to extricate these steps from the app (if this weren't a school project or I had spare time, I'd definitely want to put in the work to refactor). Plus, since `globalSetup` runs before the workers, we'd only create one database anyway.

We _will_ use `globalTeardown`, which defines what happens after all the workers have finished. All we need is a way to loop through the databases we created, and call delete on each of them.

Unfortunately, Jest doesn't have a good way for workers to persist information after they finish, and there's also currently no way to see how many workers you created. We'll work around this issue by having the workers write their database names to a file. To avoid race conditions, we'll need each worker to create its own file of names. We'll do this by adding the following to our `setupFiles` function:

```js
const fs = require("fs");
const path = require("path");
const infoPath = path.join(__dirname, `test-db-info-${worker}.txt`);
fs.appendFileSync(infoPath, dbName + "\n", "utf8");
```

This will result in one file for each worker, with each line in the file representing the database name. We can then parse this in our `globalTeardown` file, which we'll create now. I named mine `jest.teardown.js`:

```js
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("./src/config.js");

module.exports = async () => {
  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.startsWith("test-db-info-") && f.endsWith(".txt"));

  const { host, user, password } = config.db.connection;
  const connection = await mysql.createConnection({ host, user, password });

  for (const file of files) {
    const lines = fs
      .readFileSync(path.join(__dirname, file), "utf8")
      .split("\n")
      .filter(Boolean);

    for (const dbName of lines) {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`Dropped test database: ${dbName}`);
    }

    fs.unlinkSync(path.join(__dirname, file));
  }

  await connection.end();
};
```

There's a lot in this file, so I'll break the important parts down:

`module.exports = async () => {}`:

- `globalTeardown` files can't make asynchronous calls at the root level, but they can still execute asynchronous functions by putting them in `module.exports`. In this case, we need asynchronous calls to drop each database.

`const files = fs ...`:

- Here, we create an array of files that match the filename pattern we had the worker files follow.

`const { host, user, password } = config.db.connection`:

- Pretty self explanatory, but do note that we're importing the default `config` file here. Since we're getting the database name from the worker files, this isn't an issue.

`const lines = fs ...`:

- Here, we parse each line, adding it to an array of database names

`for (const dbName of lines){}`:

- This loop calls the database and tells it to delete a database with the name we're on.

` fs.unlinkSync(path.join(__dirname, file));`:

- This deletes the worker file once we're done, so that we don't end up trying to delete extra databases in all future test runs.

Of course, we still haven't told Jest to run this file, which we can do by updating our `jest.config.cjs` again:

```js
module.exports = {
  setupFiles: ["<rootDir>/jest.env.js"],
  globalTeardown: "<rootDir>/jest.teardown.js", // This is the added line
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
};
```

One last test run shows our print statement demonstrating the databases have been dropped:

```shell
Test Suites: 4 passed, 4 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        4.602 s
Ran all test suites.
Dropped test database: test_db_1_1772148996141
Dropped test database: test_db_2_1772148996140
Dropped test database: test_db_3_1772148996140
Dropped test database: test_db_4_1772148996141
```

> [!TIP]
> If, like me, you have more cores than test files, you can set the `maxWorkers`configuration option, which I'll link to in my Sources section, in order to test parsing multiple lines per file.

</details>

## Summary

There isn't really a pressing reason to actually do this for class. We're going to be deploying our backend remotely, at which point we won't need to worry about infecting our real database with our test data. However, for other projects, it will be very useful to understand your testing framework and how it works, especially as you write more and more advanced tests.

### Jest Execution Sequence

1. Global Setup Phase
   - Examine `jest.config` file to determine configuration
   - Create test file queue
   - Run any `globalSetup` files
   - Spin up workers (limited by the number of cores)
2. File Execution (concurrently across workers)
   - Get file from test queue
   - Run `setupFiles`
   - Set up test environment (e.g. node)
   - Initialize Jest Framework
   - Run `setupFilesAfterEnv`
   - Collect tests (run describe blocks)
   - `beforeAll()`
   - For each test (synchronous within each file):
     - `beforeEach()`
     - run test
     - `afterEach()`
     - Report test results
   - `afterAll()`
   - Clear imported modules
   - Pull next file from test queue (if one exists) and repeat
3. Global Teardown Phase
   - Wait for workers to finish
   - Print test result summary
   - Run any `globalTeardown` files

## Sources

| Concept              | Website                                                          |
| -------------------- | ---------------------------------------------------------------- |
| Manual Mocks         | https://jestjs.io/docs/manual-mocks                              |
| `requireActual()`    | https://jestjs.io/docs/jest-object#jestrequireactualmodulename   |
| Hoisting             | https://jestjs.io/docs/manual-mocks#using-with-es-module-imports |
| `afterAll()`         | https://jestjs.io/docs/api#afterallfn-timeout                    |
| `globalSetup`        | https://jestjs.io/docs/configuration#globalsetup-string          |
| `JEST_WORKER_ID`     | https://jestjs.io/docs/environment-variables#jest_worker_id      |
| `setupFiles`         | https://jestjs.io/docs/configuration#setupfiles-array            |
| `setupFilesAfterEnv` | https://jestjs.io/docs/configuration#setupfilesafterenv-array    |
| `globalTeardown`     | https://jestjs.io/docs/configuration#globalteardown-string       |
| `maxWorkers`         | https://jestjs.io/docs/configuration#maxworkers-number--string   |
