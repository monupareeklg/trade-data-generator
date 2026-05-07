/**
 * candleManager.js
 *
 * Manages OHLCV candlestick data per symbol.
 *
 * Features:
 * - Multiple configurable intervals (1s, 1m, 5m, 15m, 1h, 4h, 1d)
 * - Accurate OHLCV — open is always first tick of interval
 * - Emits completed candle when interval closes
 * - Keeps rolling history (configurable max candles)
 * - No double-append bug from old code
 */

"use strict";

const INTERVALS = {
  "1s": 1000,
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

class CandleManager {
  /**
   * @param {Object} config
   * @param {string|string[]} config.intervals  - e.g. '1m' or ['1m','5m','1h']
   * @param {number} config.precision           - Decimal places for price
   * @param {number} config.maxCandles          - Max candles to keep per interval (default 1000)
   * @param {Function} config.onClose           - Callback when candle closes: (candle) => {}
   */
  constructor(config = {}) {
    this.precision = config.precision ?? 2;
    this.maxCandles = config.maxCandles ?? 1000;
    this.onClose = config.onClose ?? null;

    // Normalize intervals to array
    const requested = config.intervals
      ? Array.isArray(config.intervals)
        ? config.intervals
        : [config.intervals]
      : ["1m"];

    // Validate intervals
    this.intervals = requested.filter((i) => {
      if (!INTERVALS[i]) {
        console.warn(`[CandleManager] Unknown interval "${i}" — skipped.`);
        return false;
      }
      return true;
    });

    // Per-interval state
    // { '1m': { current: Candle|null, history: Candle[] }, ... }
    this._state = {};
    this.intervals.forEach((interval) => {
      this._state[interval] = {
        current: null,
        history: [],
        intervalMs: INTERVALS[interval],
      };
    });
  }

  /**
   * Feed a new price tick into the candle manager
   * Call this on every price update
   *
   * @param {number} price     - Current price
   * @param {number} volume    - Volume for this tick
   * @param {number} timestamp - Unix ms timestamp (default: Date.now())
   * @returns {Object} { updated: Object, closed: Object[] }
   *   updated → current in-progress candles per interval
   *   closed  → candles that just completed this tick
   */
  tick(price, volume, timestamp = Date.now()) {
    const updated = {};
    const closed = [];

    this.intervals.forEach((interval) => {
      const state = this._state[interval];
      const intervalMs = state.intervalMs;

      // Calculate which interval bucket this timestamp belongs to
      const bucketStart = Math.floor(timestamp / intervalMs) * intervalMs;
      const bucketEnd = bucketStart + intervalMs;

      if (!state.current) {
        // No open candle — open a new one
        state.current = this._openCandle(
          interval,
          price,
          volume,
          bucketStart,
          bucketEnd,
        );
      } else if (timestamp >= state.current.closeTime) {
        // Current candle has expired — close it and open new one
        const closed_candle = this._closeCandle(state, interval);
        closed.push(closed_candle);

        // Fire callback if provided
        if (this.onClose) this.onClose(closed_candle);

        // Open new candle
        state.current = this._openCandle(
          interval,
          price,
          volume,
          bucketStart,
          bucketEnd,
        );
      } else {
        // Update existing candle
        this._updateCandle(state.current, price, volume);
      }

      updated[interval] = { ...state.current };
    });

    return { updated, closed };
  }

  /**
   * Get completed candle history for an interval
   * @param {string} interval - e.g. '1m'
   * @param {number} limit    - Max candles to return (default: all)
   * @returns {Array} candles oldest → newest
   */
  getHistory(interval, limit) {
    const state = this._state[interval];
    if (!state) {
      console.warn(`[CandleManager] Unknown interval "${interval}"`);
      return [];
    }

    const history = state.history;
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get current in-progress candle for an interval
   * @param {string} interval
   * @returns {Object|null}
   */
  getCurrent(interval) {
    const state = this._state[interval];
    if (!state) return null;
    return state.current ? { ...state.current } : null;
  }

  /**
   * Get all history for all intervals
   * @returns {Object} { '1m': [...], '5m': [...] }
   */
  getAllHistory() {
    const result = {};
    this.intervals.forEach((interval) => {
      result[interval] = this.getHistory(interval);
    });
    return result;
  }

  /**
   * Reset all candle state — call at start of new trading day
   */
  reset() {
    this.intervals.forEach((interval) => {
      this._state[interval].current = null;
      this._state[interval].history = [];
    });
  }

  // ── Private helpers ──────────────────────── //

  /**
   * Open a new candle
   */
  _openCandle(interval, price, volume, openTime, closeTime) {
    return {
      interval,
      openTime,
      closeTime,
      open: this._round(price),
      high: this._round(price),
      low: this._round(price),
      close: this._round(price),
      volume: volume,
      ticks: 1, // number of price updates in this candle
      closed: false,
    };
  }

  /**
   * Update an open candle with new price and volume
   */
  _updateCandle(candle, price, volume) {
    const rounded = this._round(price);
    if (rounded > candle.high) candle.high = rounded;
    if (rounded < candle.low) candle.low = rounded;
    candle.close = rounded;
    candle.volume += volume; // numeric addition — no string bug
    candle.ticks += 1;
  }

  /**
   * Close current candle and add to history
   */
  _closeCandle(state, interval) {
    const candle = state.current;
    candle.closed = true;
    candle.close = this._round(candle.close);
    candle.volume = this._round(candle.volume);

    // Add to history
    state.history.push(candle);

    // Trim history if over max
    if (state.history.length > this.maxCandles) {
      state.history.shift();
    }

    state.current = null;
    return candle;
  }

  /**
   * Round to configured precision
   */
  _round(value) {
    return parseFloat(value.toFixed(this.precision));
  }
}

module.exports = { CandleManager, INTERVALS };
