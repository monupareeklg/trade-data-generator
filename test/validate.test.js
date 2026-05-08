// tests/validate.test.js

const { validateConfig, validatePair } = require("../src/utils/validate");

describe("validateConfig", () => {
  // ── Valid config should not throw ─────── //

  it("should not throw for valid crypto config", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).not.toThrow();
  });

  it("should not throw for valid equity config", () => {
    expect(() =>
      validateConfig({
        type: "equity",
        marketHours: {
          open: "09:30",
          close: "16:00",
          timezone: "America/New_York",
        },
        pairs: [{ symbol: "AAPL", startPrice: 175 }],
      }),
    ).not.toThrow();
  });

  it("should not throw for valid forex config", () => {
    expect(() =>
      validateConfig({
        type: "forex",
        marketHours: {
          open: "00:00",
          close: "23:59",
          timezone: "UTC",
        },
        pairs: [{ symbol: "EUR/USD", startPrice: 1.0845 }],
      }),
    ).not.toThrow();
  });

  // ── type validation ───────────────────── //

  it("should throw if type is missing", () => {
    expect(() =>
      validateConfig({
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).toThrow("type is required");
  });

  it("should throw if type is invalid", () => {
    expect(() =>
      validateConfig({
        type: "stocks",
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).toThrow("Invalid type");
  });

  // ── pairs validation ──────────────────── //

  it("should throw if pairs is missing", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
      }),
    ).toThrow("pairs is required");
  });

  it("should throw if pairs is empty array", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        pairs: [],
      }),
    ).toThrow("pairs cannot be empty");
  });

  it("should throw if pairs is not an array", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        pairs: "BTC/USDT",
      }),
    ).toThrow("pairs must be an array");
  });

  it("should throw if duplicate symbols exist", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        pairs: [
          { symbol: "BTC/USDT", startPrice: 45000 },
          { symbol: "BTC/USDT", startPrice: 45000 },
        ],
      }),
    ).toThrow("Duplicate symbols");
  });

  // ── marketHours validation ────────────── //

  it("should throw if equity missing marketHours", () => {
    expect(() =>
      validateConfig({
        type: "equity",
        pairs: [{ symbol: "AAPL", startPrice: 175 }],
      }),
    ).toThrow("marketHours is required");
  });

  it("should throw if forex missing marketHours", () => {
    expect(() =>
      validateConfig({
        type: "forex",
        pairs: [{ symbol: "EUR/USD", startPrice: 1.08 }],
      }),
    ).toThrow("marketHours is required");
  });

  it("should warn but not throw if crypto has marketHours", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        marketHours: { open: "09:30", close: "16:00", timezone: "UTC" },
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).not.toThrow();
  });

  // ── interval validation ───────────────── //

  it("should throw if interval is below 100ms", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        interval: 50,
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).toThrow("interval must be at least 100ms");
  });

  it("should not throw for valid interval", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        interval: 1000,
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).not.toThrow();
  });

  // ── candleIntervals validation ────────── //

  it("should throw if candleIntervals contains invalid interval", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        candleIntervals: ["1m", "3m"], // 3m is not valid
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).toThrow("Invalid candleInterval");
  });

  it("should not throw for valid candleIntervals", () => {
    expect(() =>
      validateConfig({
        type: "crypto",
        candleIntervals: ["1m", "5m", "1h"],
        pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
      }),
    ).not.toThrow();
  });
});

describe("validatePair", () => {
  // ── Valid pair should not throw ───────── //

  it("should not throw for valid pair", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          volatility: 0.002,
          precision: 2,
        },
        0,
      ),
    ).not.toThrow();
  });

  // ── symbol ────────────────────────────── //

  it("should throw if symbol is missing", () => {
    expect(() =>
      validatePair(
        {
          startPrice: 45000,
        },
        0,
      ),
    ).toThrow("symbol is required");
  });

  it("should throw if symbol is empty string", () => {
    expect(() =>
      validatePair(
        {
          symbol: "",
          startPrice: 45000,
        },
        0,
      ),
    ).toThrow("symbol is required");
  });

  // ── startPrice ────────────────────────── //

  it("should throw if startPrice is missing", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
        },
        0,
      ),
    ).toThrow("startPrice is required");
  });

  it("should throw if startPrice is zero", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 0,
        },
        0,
      ),
    ).toThrow("greater than 0");
  });

  it("should throw if startPrice is negative", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: -100,
        },
        0,
      ),
    ).toThrow("greater than 0");
  });

  it("should throw if startPrice is NaN", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: NaN,
        },
        0,
      ),
    ).toThrow("must be a number");
  });

  // ── volatility ────────────────────────── //

  it("should throw if volatility is >= 1", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          volatility: 1.5,
        },
        0,
      ),
    ).toThrow("between 0 and 1");
  });

  it("should throw if volatility is 0", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          volatility: 0,
        },
        0,
      ),
    ).toThrow("between 0 and 1");
  });

  // ── precision ─────────────────────────── //

  it("should throw if precision is negative", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          precision: -1,
        },
        0,
      ),
    ).toThrow("between 0 and 10");
  });

  it("should throw if precision is above 10", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          precision: 11,
        },
        0,
      ),
    ).toThrow("between 0 and 10");
  });

  // ── volume ────────────────────────────── //

  it("should throw if volume.max <= volume.min", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          volume: { min: 1000, max: 500 },
        },
        0,
      ),
    ).toThrow("max must be greater than");
  });

  it("should not throw for valid volume", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          volume: { min: 100, max: 10000 },
        },
        0,
      ),
    ).not.toThrow();
  });

  // ── minPrice / maxPrice ───────────────── //

  it("should throw if maxPrice <= minPrice", () => {
    expect(() =>
      validatePair(
        {
          symbol: "BTC/USDT",
          startPrice: 45000,
          minPrice: 40000,
          maxPrice: 30000,
        },
        0,
      ),
    ).toThrow("maxPrice must be greater than minPrice");
  });
});
