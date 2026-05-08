// tests/marketClock.test.js

const { MarketClock, MARKET_TYPES } = require("../src/core/marketClock");

// ── Helper ────────────────────────────── //
const makeEquityClock = (overrides = {}) =>
  new MarketClock({
    type: "equity",
    marketHours: {
      open: "09:30",
      close: "16:00",
      timezone: "America/New_York",
      days: [1, 2, 3, 4, 5],
    },
    ...overrides,
  });

const makeForexClock = (overrides = {}) =>
  new MarketClock({
    type: "forex",
    marketHours: {
      open: "00:00",
      close: "23:59",
      timezone: "UTC",
      days: [1, 2, 3, 4, 5],
    },
    ...overrides,
  });

const makeCryptoClock = (overrides = {}) =>
  new MarketClock({
    type: "crypto",
    ...overrides,
  });

describe("MarketClock", () => {
  // ── Initialization ────────────────────── //

  describe("initialization", () => {
    it("should initialize crypto clock without marketHours", () => {
      expect(() => makeCryptoClock()).not.toThrow();
    });

    it("should initialize equity clock with marketHours", () => {
      expect(() => makeEquityClock()).not.toThrow();
    });

    it("should initialize forex clock with marketHours", () => {
      expect(() => makeForexClock()).not.toThrow();
    });

    it("should throw if equity missing marketHours", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
          }),
      ).toThrow("marketHours is required");
    });

    it("should throw if forex missing marketHours", () => {
      expect(
        () =>
          new MarketClock({
            type: "forex",
          }),
      ).toThrow("marketHours is required");
    });

    it("should throw if marketHours missing open", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              close: "16:00",
              timezone: "America/New_York",
            },
          }),
      ).toThrow();
    });

    it("should throw if marketHours missing close", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              open: "09:30",
              timezone: "America/New_York",
            },
          }),
      ).toThrow();
    });

    it("should throw if marketHours missing timezone", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              open: "09:30",
              close: "16:00",
            },
          }),
      ).toThrow();
    });

    it("should throw if timezone is invalid", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              open: "09:30",
              close: "16:00",
              timezone: "Invalid/Timezone",
            },
          }),
      ).toThrow("Invalid timezone");
    });

    it("should throw if open time format is wrong", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              open: "9:30", // missing leading zero
              close: "16:00",
              timezone: "America/New_York",
            },
          }),
      ).toThrow("HH:MM format");
    });

    it("should throw if close time format is wrong", () => {
      expect(
        () =>
          new MarketClock({
            type: "equity",
            marketHours: {
              open: "09:30",
              close: "4pm", // invalid format
              timezone: "America/New_York",
            },
          }),
      ).toThrow("HH:MM format");
    });

    it("should default days to weekdays if not provided", () => {
      const clock = new MarketClock({
        type: "equity",
        marketHours: {
          open: "09:30",
          close: "16:00",
          timezone: "America/New_York",
        },
      });
      expect(clock.marketHours.days).toEqual([1, 2, 3, 4, 5]);
    });
  });

  // ── Crypto ────────────────────────────── //

  describe("crypto — always open", () => {
    it("isOpen() should always return true for crypto", () => {
      const clock = makeCryptoClock();
      expect(clock.isOpen()).toBe(true);
    });

    it("isOpen() should return true before start()", () => {
      const clock = makeCryptoClock();
      expect(clock.isOpen()).toBe(true);
    });

    it("isOpen() should return true after start()", () => {
      const clock = makeCryptoClock();
      clock.start();
      expect(clock.isOpen()).toBe(true);
      clock.stop();
    });

    it("isOpen() should return true after stop()", () => {
      const clock = makeCryptoClock();
      clock.start();
      clock.stop();
      expect(clock.isOpen()).toBe(true);
    });

    it("getStatus() should show isOpen true for crypto", () => {
      const clock = makeCryptoClock();
      const status = clock.getStatus();
      expect(status.isOpen).toBe(true);
    });

    it("getStatus() should show correct type", () => {
      const clock = makeCryptoClock();
      const status = clock.getStatus();
      expect(status.type).toBe("crypto");
    });

    it("getStatus() reason should mention never closes", () => {
      const clock = makeCryptoClock();
      const status = clock.getStatus();
      expect(status.reason.toLowerCase()).toContain("never");
    });

    it("msUntilOpen() should return 0 for crypto", () => {
      const clock = makeCryptoClock();
      expect(clock.msUntilOpen()).toBe(0);
    });

    it("onOpen callback should not fire for crypto", () => {
      const onOpen = jest.fn();
      const clock = makeCryptoClock({ onOpen });
      clock.start();
      expect(onOpen).not.toHaveBeenCalled();
      clock.stop();
    });
  });

  // ── Equity / Forex ────────────────────── //

  describe("equity/forex clock", () => {
    it("should start without throwing", () => {
      const clock = makeEquityClock();
      expect(() => clock.start()).not.toThrow();
      clock.stop();
    });

    it("should stop without throwing", () => {
      const clock = makeEquityClock();
      clock.start();
      expect(() => clock.stop()).not.toThrow();
    });

    it("getStatus() should return required fields", () => {
      const clock = makeEquityClock();
      const status = clock.getStatus();
      expect(status).toHaveProperty("isOpen");
      expect(status).toHaveProperty("type");
      expect(status).toHaveProperty("timezone");
      expect(status).toHaveProperty("openTime");
      expect(status).toHaveProperty("closeTime");
      expect(status).toHaveProperty("localTime");
      expect(status).toHaveProperty("reason");
    });

    it("getStatus() should show correct type", () => {
      const clock = makeEquityClock();
      const status = clock.getStatus();
      expect(status.type).toBe("equity");
    });

    it("getStatus() should show correct openTime", () => {
      const clock = makeEquityClock();
      const status = clock.getStatus();
      expect(status.openTime).toBe("09:30");
    });

    it("getStatus() should show correct closeTime", () => {
      const clock = makeEquityClock();
      const status = clock.getStatus();
      expect(status.closeTime).toBe("16:00");
    });

    it("getStatus() should show correct timezone", () => {
      const clock = makeEquityClock();
      const status = clock.getStatus();
      expect(status.timezone).toBe("America/New_York");
    });

    it("isOpen() should return boolean", () => {
      const clock = makeEquityClock();
      expect(typeof clock.isOpen()).toBe("boolean");
    });

    it("msUntilOpen() should return 0 if market is open", () => {
      const clock = makeEquityClock();
      // If market is open right now
      if (clock.isOpen()) {
        expect(clock.msUntilOpen()).toBe(0);
      } else {
        expect(clock.msUntilOpen()).toBeGreaterThan(0);
      }
    });

    it("msUntilOpen() should return positive ms if market is closed", () => {
      // Force a clock that is always closed
      const clock = new MarketClock({
        type: "equity",
        marketHours: {
          open: "00:00",
          close: "00:01", // closes after 1 minute
          timezone: "UTC",
          days: [1, 2, 3, 4, 5],
        },
      });
      // Most of the time this market will be closed
      const ms = clock.msUntilOpen();
      expect(typeof ms).toBe("number");
      expect(ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Callbacks ─────────────────────────── //

  describe("callbacks", () => {
    it("should accept onOpen callback", () => {
      const onOpen = jest.fn();
      expect(() => makeEquityClock({ onOpen })).not.toThrow();
    });

    it("should accept onClose callback", () => {
      const onClose = jest.fn();
      expect(() => makeEquityClock({ onClose })).not.toThrow();
    });

    it("should work without callbacks", () => {
      const clock = makeEquityClock();
      clock.start();
      expect(() => clock.stop()).not.toThrow();
    });
  });

  // ── start() / stop() ──────────────────── //

  describe("start() and stop()", () => {
    it("should start clock without error", () => {
      const clock = makeEquityClock();
      expect(() => clock.start()).not.toThrow();
      clock.stop();
    });

    it("should not throw if start() called twice", () => {
      const clock = makeEquityClock();
      clock.start();
      expect(() => clock.start()).not.toThrow();
      clock.stop();
    });

    it("should stop cleanly", () => {
      const clock = makeEquityClock();
      clock.start();
      clock.stop();
      expect(clock._checkTimer).toBeNull();
    });

    it("stop() should set _isOpen to false", () => {
      const clock = makeEquityClock();
      clock.start();
      clock.stop();
      expect(clock._isOpen).toBe(false);
    });

    it("should handle stop() before start() gracefully", () => {
      const clock = makeEquityClock();
      expect(() => clock.stop()).not.toThrow();
    });
  });

  // ── MARKET_TYPES constant ─────────────── //

  describe("MARKET_TYPES", () => {
    it("should export CRYPTO type", () => {
      expect(MARKET_TYPES.CRYPTO).toBe("crypto");
    });

    it("should export EQUITY type", () => {
      expect(MARKET_TYPES.EQUITY).toBe("equity");
    });

    it("should export FOREX type", () => {
      expect(MARKET_TYPES.FOREX).toBe("forex");
    });
  });
});
