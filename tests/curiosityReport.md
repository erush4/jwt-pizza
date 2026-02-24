# Curiosity Report: Advanced Jest—Under The Hood

## The Problem

I really, _really_ hate having test data in my primary database. After just a few test runs, a database will contain hundreds of entries that won't ever be touched again. This is almost never an issue: why would the primary database be stored locally on my computer? Unfortunately, JWT Pizza doesn't have a deployed backend yet, so the primary database is, in fact, stored locally on my computer. Usually, I solve this problem by having a new database be constructed at the top of each test file, and deleted at the end. It's a pretty standard fix, and it's not too hard to implement—using dependency inversion, I can pass the database as an argument when I create the router class.

JWT Pizza Service doesn't have its own router class.

Instead, it uses express.Router(), and creates a independent functions for each route. As a consequence, I can't do dependency injection without restructuring most of the code that deals with these routers. That woudn't be a _huge_ task, but I didn't want to risk breaking code that I knew worked before I had a way to test whether that code worked (shoutout test-driven development—if those South Provo devs had used it, I wouldn't be in this mess). Instead, I wanted to figure out a way to set a different database name, so that I could use a separate database for my tests.

## Approach 1

The JWT Pizza Service database pulls its name from `config.js` file. But `config.js` doesn't contain any functions, so how can we change the data it contains?

### Manual Mocks



## Approach 2: Worker Setup

## Sources

| Concept      | Website                             |
| ------------ | ----------------------------------- |
| Manual Mocks | https://jestjs.io/docs/manual-mocks |
|something||
