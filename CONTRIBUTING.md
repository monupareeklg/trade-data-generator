# Contributing to trade-data-generator

First off — thank you for considering contributing.
Every bug report, feature suggestion and pull request helps.

---

## Ways to contribute

- Report a bug
- Suggest a feature
- Fix a bug
- Write or improve tests
- Improve documentation

---

## Reporting bugs

Open an issue on GitHub:
https://github.com/monupareeklg/trade-data-generator/issues

Include:
- Node.js version (`node --version`)
- Library version (`npm list trade-data-generator`)
- Code that reproduces the bug
- What you expected vs what happened

---

## Suggesting features

Open an issue with the label `enhancement`.
Describe the use case — not just the feature.

Good: "I need forex pairs to support fractional pip pricing"
Less helpful: "Add more precision options"

---

## Pull requests

### Setup

```bash
git clone https://github.com/monupareeklg/trade-data-generator.git
cd trade-data-generator
npm install
```

### Before submitting

```bash
# Run tests
npm test

# Make sure all tests pass
# Coverage should not drop below 85%
```

### Guidelines

- One pull request per feature or bug fix
- Add tests for any new functionality
- Don't break existing tests
- Follow the existing code style
- Update README if you change the public API
- Update CHANGELOG.md under [Unreleased]

### Commit message format

```
type: short description

Examples:
feat: add 15m candle interval support
fix: correct spread calculation for forex pairs
test: add orderBook crossed book edge case
docs: update README WebSocket example
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

---

## Project structure

```
src/
  index.js              ← MarketFeed class (public API)
  core/
    priceEngine.js      ← price movement algorithm
    orderBook.js        ← bid/ask depth generation
    candleManager.js    ← OHLCV candle tracking
    marketClock.js      ← market hours management
  utils/
    validate.js         ← input validation
  constants/
    defaults.js         ← default config values
tests/
  validate.test.js
  priceEngine.test.js
  orderBook.test.js
  candleManager.test.js
  marketClock.test.js
examples/
  crypto.js
  equity.js
  forex.js
```

---

## Code style

- No external dependencies — keep it zero deps
- Clear error messages with examples
- Every public method should be documented with JSDoc
- Prefer explicit over clever

---

## Questions?

Open an issue or email: monupareeklg@gmail.com

We are happy to help you get your PR merged.