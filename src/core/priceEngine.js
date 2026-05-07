/**
 * priceEngine.js
 *
 * Generates realistic price movements using:
 * - Random walk with mean reversion
 * - Configurable volatility
 * - Trend bias (slight up/down drift)
 * - Volume correlation (bigger moves = more volume)
 */

"use strict";

class PriceEngine {
  /**
   * @param {Object} config
   * @param {number} config.startPrice    - Initial price
   * @param {number} config.volatility    - Max % move per tick (e.g. 0.002 = 0.2%)
   * @param {number} config.trend         - Drift per tick (e.g. 0.0001 up, -0.0001 down)
   * @param {number} config.precision     - Decimal places (e.g. 2 for stocks, 5 for forex)
   * @param {number} config.minPrice      - Floor price (default: 10% below start)
   * @param {number} config.maxPrice      - Ceiling price (default: 10% above start... grows over time)
   * @param {Object} config.volume        - { min, max } volume range per tick
   */
  constructor(config) {
    this.startPrice = config.startPrice;
    this.volatility = config.volatility ?? 0.002;
    this.trend = config.trend ?? 0;
    this.precision = config.precision ?? 2;
    this.volume = config.volume ?? { min: 100, max: 10000 };

    // Price boundaries — mean reversion pulls price back when it strays too far
    this.minPrice = config.minPrice ?? config.startPrice * 0.5;
    this.maxPrice = config.maxPrice ?? config.startPrice * 1.5;

    // Internal state
    this.currentPrice = config.startPrice;
    this.previousPrice = config.startPrice;
    this.high24h = config.startPrice;
    this.low24h = config.startPrice;
    this.open24h = config.startPrice;
    this.totalVolume = 0;
    this.tickCount = 0;
  }

  /**
   * Generate next price tick
   * @returns {Object} tick data
   */
  next() {
    this.previousPrice = this.currentPrice;

    // ── Price movement algo ──────────────────── //

    // 1. Random component — normal-ish distribution
    const random = this._randomNormal() * this.volatility;

    // 2. Trend component — slight drift
    const trendMove = this.trend;

    // 3. Mean reversion — pulls price back toward start
    //    Stronger pull the further price strays
    const deviation = (this.currentPrice - this.startPrice) / this.startPrice;
    const reversion = -deviation * 0.05; // 5% reversion force

    // 4. Combine all forces
    const pctChange = random + trendMove + reversion;

    // 5. Apply to price
    let newPrice = this.currentPrice * (1 + pctChange);

    // 6. Enforce boundaries
    newPrice = Math.max(this.minPrice, Math.min(this.maxPrice, newPrice));

    // 7. Round to precision
    newPrice = this._round(newPrice);

    this.currentPrice = newPrice;
    this.tickCount++;

    // ── Volume ──────────────────────────────── //
    // Bigger price moves = more volume
    const absMoveSize = Math.abs(pctChange) / this.volatility; // 0 to 1
    const volume = this._generateVolume(absMoveSize);
    this.totalVolume += volume;

    // ── 24h stats ───────────────────────────── //
    if (newPrice > this.high24h) this.high24h = newPrice;
    if (newPrice < this.low24h) this.low24h = newPrice;

    // ── Build tick ──────────────────────────── //
    const change = this._round(newPrice - this.open24h);
    const changePct = this._round(
      ((newPrice - this.open24h) / this.open24h) * 100,
    );

    // Spread — realistic bid/ask around price
    const spreadPct = this.volatility * 0.5;
    const halfSpread = this._round(newPrice * spreadPct);
    const bid = this._round(newPrice - halfSpread);
    const ask = this._round(newPrice + halfSpread);

    return {
      price: newPrice,
      bid,
      ask,
      spread: this._round(ask - bid),
      volume,
      totalVolume: this._round(this.totalVolume),
      change,
      changePct,
      high24h: this.high24h,
      low24h: this.low24h,
      open24h: this.open24h,
      previous: this.previousPrice,
      tickCount: this.tickCount,
    };
  }

  /**
   * Reset 24h stats — call this at start of new trading day
   */
  resetDay() {
    this.open24h = this.currentPrice;
    this.high24h = this.currentPrice;
    this.low24h = this.currentPrice;
    this.totalVolume = 0;
  }

  /**
   * Reset everything back to start price
   */
  reset() {
    this.currentPrice = this.startPrice;
    this.previousPrice = this.startPrice;
    this.high24h = this.startPrice;
    this.low24h = this.startPrice;
    this.open24h = this.startPrice;
    this.totalVolume = 0;
    this.tickCount = 0;
  }

  /**
   * Get current state without advancing price
   */
  getState() {
    return {
      price: this.currentPrice,
      high24h: this.high24h,
      low24h: this.low24h,
      open24h: this.open24h,
      totalVolume: this.totalVolume,
      tickCount: this.tickCount,
    };
  }

  // ── Private helpers ────────────────────────── //

  /**
   * Box-Muller transform — generates normal distribution random number
   * Much more realistic than Math.random() which is flat distribution
   * Most price moves are small, occasional large moves
   */
  _randomNormal() {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Generate volume correlated with price move size
   * @param {number} intensity - 0 to 1, how big the move was
   */
  _generateVolume(intensity) {
    const { min, max } = this.volume;
    const range = max - min;
    // Higher intensity = higher volume
    const base = min + range * Math.random();
    const boost = range * intensity * 0.5;
    return Math.round(base + boost);
  }

  /**
   * Round to configured precision
   */
  _round(value) {
    return parseFloat(value.toFixed(this.precision));
  }
}

module.exports = { PriceEngine };
