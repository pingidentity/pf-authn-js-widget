# Pf-authn-widget

**PingFederate Authentication Widget** 

pf-authn-widget

# Features

* **ES6/ESNext** - Write _ES6_ code and _Babel_ will transpile it to ES5 for backwards compatibility
* **Test** - _Mocha_ with _Istanbul_ coverage
* **Lint** - Preconfigured _ESlint_ with _Airbnb_ config
* **CI** - _TravisCI_ configuration setup
* **Minify** - Built code will be minified for performance

# Commands
- `npm run clean` - Remove `lib/` directory
- `npm test` - Run tests with linting and coverage results.
- `npm test:only` - Run tests without linting or coverage.
- `npm test:watch` - You can even re-run tests on file changes!
- `npm test:prod` - Run tests with minified code.
- `npm run lint` - Run ESlint with airbnb-config
- `npm run cover` - Get coverage report for your code.
- `npm run build` - Babel will transpile ES6 => ES5 and minify the code.

# Installation

# Test server
  Execute `npm run start` in the command line to start the test server. `https://localhost:9031` host name will be used as the base URL. In order to change the base URL use `BASEURL=https://example.com npm run start`.
  
  To  access the test server open a browser and goto `https://localhost:8443`.  

# License

