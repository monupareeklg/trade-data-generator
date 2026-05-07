/**
 * index.js
 *
 * MarketFeed — main class
 * Ties together PriceEngine, OrderBook, CandleManager, MarketClock
 * Emits events that developer pipes into their WebSocket
 *
 * Usage:
 *   const { MarketFeed } = require('trade-data-generator')
 *
 *   const feed = new MarketFeed({
 *     type: 'crypto',
 *     pairs: [{ symbol: 'BTC/USDT', startPrice: 45000 }]
 *   })
 *
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

const { PriceEngine } = require("./core/priceEngine");
const { OrderBook } = require("./core/orderBook");
const { CandleManager } = require("./core/candleManager");
const { MarketClock } = require("./core/marketClock");
const { validateConfig } = require("./utils/validate");
const { DEFAULTS } = require("./constants/defaults");

class MarketFeed extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string}   config.type             - 'crypto' | 'forex' | 'equity'
   * @param {Array}    config.pairs            - Array of pair configs
   * @param {number}   config.interval         - Ms between ticks (default: 1000)
   * @param {string[]} config.candleIntervals  - e.g. ['1m','5m'] (default: ['1m'])
   * @param {number}   config.depth            - Order book levels (default: 10)
   * @param {number}   config.maxCandles       - Max candle history (default: 1000)
   * @param {Object}   config.marketHours      - Required for equity/forex
   */
  constructor(config) {
    super();

    // Validate before anything else
    validateConfig(config);

    this._config = config;
    this._type = config.type;
    this._interval = config.interval ?? DEFAULTS.interval;
    this._depth = config.depth ?? DEFAULTS.depth;
    this._running = false;
    this._paused = false;
    this._timer = null;

    // ── Per-symbol engines ─────────────────── //
    // Map of symbol → { priceEngine, orderBook, candleManager }
    this._symbols = new Map();

    config.pairs.forEach((pair) => {
      this._initSymbol(pair);
    });

    // ── Market clock ───────────────────────── //
    this._clock = new MarketClock({
      type: config.type,
      marketHours: config.marketHours ?? DEFAULTS.marketHours[config.type],
      onOpen: (info) => this.emit("open", info),
      onClose: (info) => this.emit("closed", info),
    });
  }

  // ── Public API ─────────────────────────────── //

  /**
   * Start the feed
   * Begins emitting ticks at configured interval
   */
  start() {
    if (this._running) {
      console.warn("[MarketFeed] Already running. Call stop() first.");
      return this;
    }

    this._running = true;
    this._paused = false;

    // Start market clock
    this._clock.start();

    // Start tick loop
    this._timer = setInterval(() => {
      this._tick();
    }, this._interval);

    // Emit first tick immediately
    this._tick();

    return this;
  }

  /**
   * Stop the feed completely
   */
  stop() {
    if (!this._running) return this;

    this._running = false;
    this._paused = false;

    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    this._clock.stop();

    return this;
  }

  /**
   * Pause ticks without stopping the clock
   */
  pause() {
    if (!this._running) {
      console.warn("[MarketFeed] Not running. Call start() first.");
      return this;
    }
    this._paused = true;
    return this;
  }

  /**
   * Resume after pause
   */
  resume() {
    if (!this._running) {
      console.warn("[MarketFeed] Not running. Call start() first.");
      return this;
    }
    this._paused = false;
    return this;
  }

  /**
   * Get current state for a symbol
   * @param {string} symbol - e.g. 'BTC/USDT'
   * @returns {Object|null}
   */
  getState(symbol) {
    const entry = this._symbols.get(symbol);
    if (!entry) {
      console.warn(`[MarketFeed] Unknown symbol "${symbol}"`);
      return null;
    }

    const priceState = entry.priceEngine.getState();
    const depth = entry.orderBook.getSnapshot();
    const candles = entry.candleManager.getAllHistory();

    return {
      symbol,
      type: this._type,
      ...priceState,
      depth,
      candles,
      marketOpen: this._clock.isOpen(),
    };
  }

  /**
   * Get candle history for a symbol and interval
   * @param {string} symbol
   * @param {string} interval - e.g. '1m'
   * @param {number} limit    - max candles to return
   * @returns {Array}
   */
  getCandles(symbol, interval, limit) {
    const entry = this._symbols.get(symbol);
    if (!entry) {
      console.warn(`[MarketFeed] Unknown symbol "${symbol}"`);
      return [];
    }
    return entry.candleManager.getHistory(interval, limit);
  }

  /**
   * Reset a symbol back to its start price
   * @param {string} symbol
   */
  reset(symbol) {
    const entry = this._symbols.get(symbol);
    if (!entry) {
      console.warn(`[MarketFeed] Unknown symbol "${symbol}"`);
      return this;
    }
    entry.priceEngine.reset();
    entry.candleManager.reset();
    return this;
  }

  /**
   * Reset all symbols
   */
  resetAll() {
    this._symbols.forEach((entry) => {
      entry.priceEngine.reset();
      entry.candleManager.reset();
    });
    return this;
  }

  /**
   * Get list of all symbols
   * @returns {string[]}
   */
  getSymbols() {
    return Array.from(this._symbols.keys());
  }

  /**
   * Is the feed currently running
   * @returns {boolean}
   */
  isRunning() {
    return this._running && !this._paused;
  }

  /**
   * Get market status
   * @returns {Object}
   */
  getMarketStatus() {
    return this._clock.getStatus();
  }

  // ── Private ────────────────────────────────── //

  /**
   * Initialize engines for one symbol
   * @param {Object} pair - pair config
   */
  _initSymbol(pair) {
    const defaults = DEFAULTS.pair;

    const priceEngine = new PriceEngine({
      startPrice: pair.startPrice,
      volatility: pair.volatility ?? defaults.volatility,
      trend: pair.trend ?? defaults.trend,
      precision: pair.precision ?? defaults.precision,
      tickSize: pair.tickSize ?? defaults.tickSize,
      minPrice: pair.minPrice,
      maxPrice: pair.maxPrice,
      volume: pair.volume ?? defaults.volume,
    });

    const orderBook = new OrderBook({
      depth: this._depth,
      tickSize: pair.tickSize ?? defaults.tickSize,
      precision: pair.precision ?? defaults.precision,
      volume: pair.volume ?? defaults.volume,
      spreadPct: pair.spreadPct ?? defaults.spreadPct,
    });

    const candleManager = new CandleManager({
      intervals: this._config.candleIntervals ?? DEFAULTS.candleIntervals,
      precision: pair.precision ?? defaults.precision,
      maxCandles: this._config.maxCandles ?? DEFAULTS.maxCandles,
      onClose: (candle) => {
        this.emit("candle", {
          symbol,
          type: this._type,
          ...candle,
        });
      },
    });

    const symbol = pair.symbol;

    this._symbols.set(symbol, {
      priceEngine,
      orderBook,
      candleManager,
      config: pair,
    });
  }

  /**
   * Main tick — called on every interval
   * Generates price, depth, updates candles
   * Emits events to developer
   */
  _tick() {
    // Skip if paused
    if (this._paused) return;

    // Skip if market closed — but still emit closed event
    if (!this._clock.isOpen()) {
      this.emit("closed", this._clock.getStatus());
      return;
    }

    const timestamp = Date.now();

    // Tick every symbol
    this._symbols.forEach((entry, symbol) => {
      try {
        // 1. Advance price
        const tick = entry.priceEngine.next();

        // 2. Update order book
        const depth = entry.orderBook.update(tick.price);

        // 3. Update candles
        const { closed } = entry.candleManager.tick(
          tick.price,
          tick.volume,
          timestamp,
        );

        // 4. Emit tick event
        this.emit("tick", {
          symbol,
          type: this._type,
          timestamp,
          price: tick.price,
          bid: tick.bid,
          ask: tick.ask,
          spread: tick.spread,
          volume: tick.volume,
          change: tick.change,
          changePct: tick.changePct,
          high24h: tick.high24h,
          low24h: tick.low24h,
          open24h: tick.open24h,
          previous: tick.previous,
        });

        // 5. Emit depth event
        this.emit("depth", {
          symbol,
          type: this._type,
          timestamp,
          bids: depth.bids,
          asks: depth.asks,
        });

        // 6. Closed candles already emitted via onClose callback
        // in candleManager — nothing to do here
      } catch (err) {
        this.emit("error", {
          symbol,
          error: err.message,
          stack: err.stack,
        });
      }
    });
  }
}

module.exports = { MarketFeed };
