/**
 * base.js
 *
 * Abstract base class for all connectors.
 * Every connector (simulation, binance, coinbase, kraken)
 * must extend this class and implement all methods.
 *
 * This ensures every connector speaks the same language
 * regardless of where the data comes from.
 */

"use strict";

class BaseConnector {
  /**
   * @param {Object} config
   * @param {Array}  config.pairs     - Array of pair configs
   * @param {number} config.interval  - Ms between ticks (for simulation)
   * @param {Function} config.onTick  - Called on every price update
   * @param {Function} config.onCandle - Called on every closed candle
   * @param {Function} config.onDepth  - Called on every order book update
   * @param {Function} config.onOpen   - Called when market opens
   * @param {Function} config.onClose  - Called when market closes
   * @param {Function} config.onError  - Called on error
   */
  constructor(config = {}) {
    if (new.target === BaseConnector) {
      throw new Error(
        "[BaseConnector] Cannot instantiate BaseConnector directly. " +
          "Use a connector like SimulationConnector or BinanceConnector.",
      );
    }

    this.pairs = config.pairs ?? [];
    this.interval = config.interval ?? 1000;
    this.onTick = config.onTick ?? null;
    this.onCandle = config.onCandle ?? null;
    this.onDepth = config.onDepth ?? null;
    this.onOpen = config.onOpen ?? null;
    this.onClose = config.onClose ?? null;
    this.onError = config.onError ?? null;

    this._running = false;
    this._name = "base";
  }

  // ── Lifecycle ─────────────────────────── //

  /**
   * Connect to data source and start receiving data.
   * For simulation: starts the tick interval.
   * For live: opens WebSocket connection.
   *
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error(`[${this._name}] connect() must be implemented.`);
  }

  /**
   * Disconnect from data source and stop receiving data.
   * For simulation: clears the tick interval.
   * For live: closes WebSocket connection cleanly.
   *
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error(`[${this._name}] disconnect() must be implemented.`);
  }

  /**
   * Subscribe to specific pairs.
   * For simulation: already subscribed via config.
   * For live: sends subscribe message to exchange.
   *
   * @param {string[]} symbols - e.g. ['BTC/USDT', 'ETH/USDT']
   * @returns {Promise<void>}
   */
  async subscribe(symbols) {
    throw new Error(`[${this._name}] subscribe() must be implemented.`);
  }

  /**
   * Unsubscribe from specific pairs.
   *
   * @param {string[]} symbols
   * @returns {Promise<void>}
   */
  async unsubscribe(symbols) {
    throw new Error(`[${this._name}] unsubscribe() must be implemented.`);
  }

  // ── Normalization ─────────────────────── //

  /**
   * Normalize raw exchange data into standard tick format.
   * Every connector MUST return this exact shape.
   *
   * @param {Object} raw - Raw data from exchange
   * @returns {Object} normalized tick
   *
   * Standard tick shape:
   * {
   *   symbol:    'BTC/USDT',
   *   price:     45016.14,
   *   bid:       44993.63,
   *   ask:       45038.65,
   *   spread:    45.02,
   *   volume:    1243,
   *   change:    +16.14,
   *   changePct: +0.04,
   *   high24h:   45200.00,
   *   low24h:    44800.00,
   *   open24h:   45000.00,
   *   previous:  45000.00,
   *   timestamp: 1714900000000,
   *   source:    'binance',
   * }
   */
  normalizeTick(raw) {
    throw new Error(`[${this._name}] normalizeTick() must be implemented.`);
  }

  /**
   * Normalize raw exchange candle data into standard format.
   *
   * Standard candle shape:
   * {
   *   symbol:    'BTC/USDT',
   *   interval:  '1m',
   *   openTime:  1714900000000,
   *   closeTime: 1714900060000,
   *   open:      45000.00,
   *   high:      45200.00,
   *   low:       44800.00,
   *   close:     45016.14,
   *   volume:    284,
   *   closed:    true,
   *   source:    'binance',
   * }
   */
  normalizeCandle(raw) {
    throw new Error(`[${this._name}] normalizeCandle() must be implemented.`);
  }

  /**
   * Normalize raw order book data into standard format.
   *
   * Standard depth shape:
   * {
   *   symbol: 'BTC/USDT',
   *   bids: [
   *     { price: 44993.63, volume: 500 },
   *     ...10 levels
   *   ],
   *   asks: [
   *     { price: 45038.65, volume: 300 },
   *     ...10 levels
   *   ],
   *   timestamp: 1714900000000,
   *   source:    'binance',
   * }
   */
  normalizeDepth(raw) {
    throw new Error(`[${this._name}] normalizeDepth() must be implemented.`);
  }

  // ── State ─────────────────────────────── //

  /**
   * Is the connector currently running?
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Get connector name
   * @returns {string}
   */
  getName() {
    return this._name;
  }

  /**
   * Get current state for a symbol.
   * Override in connectors that track state (simulation).
   *
   * @param {string} symbol
   * @returns {Object|null}
   */
  getState(symbol) {
    return null;
  }

  /**
   * Reset a symbol back to initial state.
   * Only meaningful for simulation connector.
   * Live connectors ignore this.
   *
   * @param {string} symbol
   */
  reset(symbol) {}

  /**
   * Reset all symbols.
   * Only meaningful for simulation connector.
   */
  resetAll() {}

  // ── Protected helpers ─────────────────── //

  /**
   * Emit a tick to the MarketFeed
   * @param {Object} tick - normalized tick
   */
  _emitTick(tick) {
    if (this.onTick) this.onTick(tick);
  }

  /**
   * Emit a closed candle to the MarketFeed
   * @param {Object} candle - normalized candle
   */
  _emitCandle(candle) {
    if (this.onCandle) this.onCandle(candle);
  }

  /**
   * Emit an order book update to the MarketFeed
   * @param {Object} depth - normalized depth
   */
  _emitDepth(depth) {
    if (this.onDepth) this.onDepth(depth);
  }

  /**
   * Emit market open event
   * @param {Object} info
   */
  _emitOpen(info) {
    if (this.onOpen) this.onOpen(info);
  }

  /**
   * Emit market close event
   * @param {Object} info
   */
  _emitClose(info) {
    if (this.onClose) this.onClose(info);
  }

  /**
   * Emit error event
   * @param {string} symbol
   * @param {Error}  error
   */
  _emitError(symbol, error) {
    if (this.onError) {
      this.onError({
        symbol,
        error: error.message,
        stack: error.stack,
        source: this._name,
      });
    }
  }
}

module.exports = { BaseConnector };
