/**
 * index.js
 *
 * MarketFeed — main class
 * Now supports multiple data sources via connector architecture.
 *
 * Usage:
 *   const { MarketFeed } = require('trade-data-generator')
 *
 *   // Simulation (default — no source needed, backward compatible)
 *   const feed = new MarketFeed({
 *     type:  'crypto',
 *     pairs: [{ symbol: 'BTC/USDT', startPrice: 45000 }]
 *   })
 *
 *   // Binance live data (one line change)
 *   const feed = new MarketFeed({
 *     source: 'binance',
 *     type:   'crypto',
 *     pairs:  [{ symbol: 'BTC/USDT' }]
 *   })
 *
 *   // Same events regardless of source
 *   feed.on('tick',   (data) => {})
 *   feed.on('candle', (data) => {})
 *   feed.on('depth',  (data) => {})
 *   feed.on('open',   (info) => {})
 *   feed.on('closed', (info) => {})
 *   feed.on('error',  (err)  => {})
 *
 *   feed.start()
 */

"use strict";

const EventEmitter = require("events");

const { validateConfig } = require("./utils/validate");
const { DEFAULTS } = require("./constants/defaults");
const { getConnector } = require("./connectors/index");
const {
  registerConnector,
  getAvailableSources,
} = require("./connectors/index");
const { BaseConnector } = require("./connectors/base");

class MarketFeed extends EventEmitter {
  /**
   * @param {Object}   config
   * @param {string}   config.source          - 'simulation' | 'binance' | ... (default: 'simulation')
   * @param {string}   config.type            - 'crypto' | 'forex' | 'equity'
   * @param {Array}    config.pairs           - Array of pair configs
   * @param {number}   config.interval        - Ms between ticks (default: 1000)
   * @param {string[]} config.candleIntervals - e.g. ['1m','5m'] (default: ['1m'])
   * @param {number}   config.depth           - Order book levels (default: 10)
   * @param {number}   config.maxCandles      - Max candle history (default: 1000)
   * @param {Object}   config.marketHours     - Required for equity/forex
   */
  constructor(config) {
    super();

    // Validate before anything else
    validateConfig(config);

    this._config = config;
    this._source = config.source ?? "simulation";
    this._running = false;

    // ── Get connector class from registry ── //
    const ConnectorClass = getConnector(this._source);

    // ── Initialize connector ──────────────── //
    this._connector = new ConnectorClass({
      // Pass everything through to connector
      ...config,

      // Wire connector callbacks to EventEmitter
      onTick: (data) => this.emit("tick", data),
      onCandle: (data) => this.emit("candle", data),
      onDepth: (data) => this.emit("depth", data),
      onOpen: (info) => this.emit("open", info),
      onClose: (info) => this.emit("closed", info),
      onError: (err) => this.emit("error", err),
    });
  }

  // ── Public API ─────────────────────────── //
  // All methods proxy to connector
  // Public interface stays identical

  /**
   * Start the feed
   */
  async start() {
    if (this._running) {
      console.warn("[MarketFeed] Already running. Call stop() first.");
      return this;
    }

    this._running = true;
    await this._connector.connect();
    return this;
  }

  /**
   * Stop the feed completely
   */
  async stop() {
    if (!this._running) return this;

    this._running = false;
    await this._connector.disconnect();
    return this;
  }

  /**
   * Pause ticks — simulation only
   * Live connectors ignore this
   */
  pause() {
    if (!this._running) {
      console.warn("[MarketFeed] Not running. Call start() first.");
      return this;
    }
    if (this._connector.pause) this._connector.pause();
    return this;
  }

  /**
   * Resume after pause — simulation only
   */
  resume() {
    if (!this._running) {
      console.warn("[MarketFeed] Not running. Call start() first.");
      return this;
    }
    if (this._connector.resume) this._connector.resume();
    return this;
  }

  /**
   * Get current state for a symbol
   * @param {string} symbol
   * @returns {Object|null}
   */
  getState(symbol) {
    return this._connector.getState(symbol);
  }

  /**
   * Get candle history for a symbol and interval
   * Only available for simulation connector.
   * Live connectors return empty array.
   *
   * @param {string} symbol
   * @param {string} interval
   * @param {number} limit
   * @returns {Array}
   */
  getCandles(symbol, interval, limit) {
    if (this._connector.getCandles) {
      return this._connector.getCandles(symbol, interval, limit);
    }
    // Simulation connector has CandleManager
    // Live connectors track candles differently
    return [];
  }

  /**
   * Reset a symbol to start price
   * Simulation only — live connectors ignore
   * @param {string} symbol
   */
  reset(symbol) {
    this._connector.reset(symbol);
    return this;
  }

  /**
   * Reset all symbols
   * Simulation only
   */
  resetAll() {
    this._connector.resetAll();
    return this;
  }

  /**
   * Get list of all symbols
   * @returns {string[]}
   */
  getSymbols() {
    if (this._connector.getSymbols) {
      return this._connector.getSymbols();
    }
    return this._config.pairs.map((p) => p.symbol);
  }

  /**
   * Is the feed currently running
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Get market status
   * @returns {Object}
   */
  getMarketStatus() {
    if (this._connector.getMarketStatus) {
      return this._connector.getMarketStatus();
    }
    return {
      isOpen: true,
      type: this._config.type,
      source: this._source,
      reason: "Live connector — always open",
    };
  }

  /**
   * Get active source name
   * @returns {string}
   */
  getSource() {
    return this._source;
  }
}

module.exports = {
  MarketFeed,
  BaseConnector,
  registerConnector,
  getAvailableSources,
};
