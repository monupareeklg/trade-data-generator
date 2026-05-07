/**
 * orderBook.js
 *
 * Generates realistic bid/ask order book depth
 * around the current market price.
 *
 * Features:
 * - Configurable depth levels
 * - Realistic volume distribution (more volume near mid price)
 * - Price levels use correct tick size
 * - Best bid always < best ask (no crossed book)
 * - Randomized but stable between ticks
 */

"use strict";

class OrderBook {
  /**
   * @param {Object} config
   * @param {number} config.depth      - Number of levels each side (default: 10)
   * @param {number} config.tickSize   - Minimum price increment (e.g. 0.01)
   * @param {number} config.precision  - Decimal places for price
   * @param {Object} config.volume     - { min, max } volume per level
   * @param {number} config.spreadPct  - Spread as % of price (default: 0.001 = 0.1%)
   */
  constructor(config = {}) {
    this.depth = config.depth ?? 10;
    this.tickSize = config.tickSize ?? 0.01;
    this.precision = config.precision ?? 2;
    this.volume = config.volume ?? { min: 100, max: 5000 };
    this.spreadPct = config.spreadPct ?? 0.001;

    // Internal state — small random shifts each tick
    // makes the book feel alive without full regeneration
    this._lastBids = [];
    this._lastAsks = [];
  }

  /**
   * Generate full order book snapshot around current price
   * @param {number} price - Current mid price
   * @returns {{ bids: Array, asks: Array }}
   */
  generate(price) {
    const halfSpread = this._round(price * this.spreadPct * 0.5);

    // Best bid is below mid, best ask is above mid
    const bestBid = this._round(price - halfSpread);
    const bestAsk = this._round(price + halfSpread);

    const bids = this._generateSide("bid", bestBid);
    const asks = this._generateSide("ask", bestAsk);

    this._lastBids = bids;
    this._lastAsks = asks;

    return { bids, asks };
  }

  /**
   * Update existing book with small random changes
   * More efficient than full regeneration every tick
   * @param {number} price - Current mid price
   * @returns {{ bids: Array, asks: Array }}
   */
  update(price) {
    // Full regenerate if no existing book
    if (!this._lastBids.length || !this._lastAsks.length) {
      return this.generate(price);
    }

    const halfSpread = this._round(price * this.spreadPct * 0.5);
    const bestBid = this._round(price - halfSpread);
    const bestAsk = this._round(price + halfSpread);

    // Regenerate prices from new best bid/ask
    // but randomize volumes slightly for realism
    const bids = this._updateSide("bid", bestBid, this._lastBids);
    const asks = this._updateSide("ask", bestAsk, this._lastAsks);

    this._lastBids = bids;
    this._lastAsks = asks;

    return { bids, asks };
  }

  /**
   * Get current book without updating
   */
  getSnapshot() {
    return {
      bids: this._lastBids,
      asks: this._lastAsks,
    };
  }

  // ── Private helpers ──────────────────────── //

  /**
   * Generate one side of the order book
   * @param {'bid'|'ask'} side
   * @param {number} bestPrice - Best price on this side
   * @returns {Array} levels sorted best to worst
   */
  _generateSide(side, bestPrice) {
    const levels = [];
    const isBid = side === "bid";

    for (let i = 0; i < this.depth; i++) {
      // Price moves away from mid for each level
      const levelPrice = isBid
        ? this._round(bestPrice - i * this.tickSize)
        : this._round(bestPrice + i * this.tickSize);

      // Volume distribution — more volume near mid price
      // Level 0 (best) has most volume, tapers off deeper
      const volume = this._generateLevelVolume(i);

      levels.push({
        price: levelPrice,
        volume,
        side,
        level: i, // 0 = best price
      });
    }

    return levels;
  }

  /**
   * Update one side — keeps prices fresh, slightly randomizes volumes
   * @param {'bid'|'ask'} side
   * @param {number} bestPrice
   * @param {Array} previousLevels
   */
  _updateSide(side, bestPrice, previousLevels) {
    const isBid = side === "bid";

    return previousLevels.map((level, i) => {
      const levelPrice = isBid
        ? this._round(bestPrice - i * this.tickSize)
        : this._round(bestPrice + i * this.tickSize);

      // Slightly shift volume ±10% for realism
      const shift = 1 + (Math.random() - 0.5) * 0.2;
      const newVolume = Math.round(level.volume * shift);
      const { min, max } = this.volume;
      const clampedVol = Math.max(min, Math.min(max, newVolume));

      return {
        price: levelPrice,
        volume: clampedVol,
        side,
        level: i,
      };
    });
  }

  /**
   * Generate volume for a specific depth level
   * Levels closer to mid (lower index) get more volume
   * @param {number} levelIndex - 0 is best price
   */
  _generateLevelVolume(levelIndex) {
    const { min, max } = this.volume;

    // Taper factor — level 0 gets full range
    // level 9 gets ~30% of range
    const taper = Math.max(0.3, 1 - levelIndex * 0.07);
    const range = (max - min) * taper;
    const volume = Math.round(min + Math.random() * range);

    return Math.max(min, Math.min(max, volume));
  }

  /**
   * Round to configured precision
   */
  _round(value) {
    return parseFloat(value.toFixed(this.precision));
  }
}

module.exports = { OrderBook };
