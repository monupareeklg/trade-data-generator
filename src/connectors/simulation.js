/**
 * simulation.js
 *
 * Simulation connector — wraps the existing price engine,
 * order book and candle manager into the connector interface.
 *
 * This is the default connector when no source is specified.
 * Generates realistic fake market data locally.
 * No API keys, no network calls, no dependencies.
 *
 * source: 'simulation' (default)
 */

'use strict'

const { BaseConnector } = require('./base')
const { PriceEngine }   = require('../core/priceEngine')
const { OrderBook }     = require('../core/orderBook')
const { CandleManager } = require('../core/candleManager')
const { MarketClock }   = require('../core/marketClock')
const { DEFAULTS }      = require('../constants/defaults')

class SimulationConnector extends BaseConnector {
  /**
   * @param {Object} config
   * @param {Array}    config.pairs           - pair configs
   * @param {number}   config.interval        - ms between ticks
   * @param {string[]} config.candleIntervals - e.g. ['1m', '5m']
   * @param {number}   config.depth           - order book levels
   * @param {number}   config.maxCandles      - max candle history
   * @param {string}   config.type            - 'crypto'|'equity'|'forex'
   * @param {Object}   config.marketHours     - for equity/forex
   */
  constructor(config = {}) {
    super(config)

    this._name           = 'simulation'
    this._type           = config.type           ?? 'crypto'
    this._candleIntervals = config.candleIntervals ?? DEFAULTS.candleIntervals
    this._depth          = config.depth           ?? DEFAULTS.depth
    this._maxCandles     = config.maxCandles      ?? DEFAULTS.maxCandles
    this._timer          = null
    this._paused         = false

    // Per-symbol engines — Map<symbol, { priceEngine, orderBook, candleManager }>
    this._symbols = new Map()

    // Initialize engines for each pair
    config.pairs.forEach((pair) => this._initSymbol(pair))

    // Market clock — handles open/close for equity/forex
    this._clock = new MarketClock({
      type:        config.type,
      marketHours: config.marketHours ?? DEFAULTS.marketHours[config.type],
      onOpen:      (info) => this._emitOpen(info),
      onClose:     (info) => this._emitClose(info),
    })
  }

  // ── Lifecycle ─────────────────────────── //

  async connect() {
    if (this._running) return

    this._running = true
    this._paused  = false

    // Start market clock
    this._clock.start()

    // Start tick loop
    this._timer = setInterval(() => {
      this._tick()
    }, this.interval)

    // First tick immediately
    this._tick()
  }

  async disconnect() {
    if (!this._running) return

    this._running = false
    this._paused  = false

    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }

    this._clock.stop()
  }

  async subscribe(symbols) {
    // Simulation subscribes to all pairs at init
    // Nothing to do here — all pairs already running
  }

  async unsubscribe(symbols) {
    // Could pause specific symbols in future
    // For now no-op
  }

  // ── Pause / Resume ────────────────────── //

  pause() {
    this._paused = true
  }

  resume() {
    this._paused = false
  }

  // ── Normalization ─────────────────────── //

  /**
   * Simulation data is already in standard format
   * from PriceEngine — just add source field
   */
  normalizeTick(raw) {
    return {
      ...raw,
      source: 'simulation',
    }
  }

  normalizeCandle(raw) {
    return {
      ...raw,
      source: 'simulation',
    }
  }

  normalizeDepth(raw) {
    return {
      ...raw,
      source: 'simulation',
    }
  }

  // ── State ─────────────────────────────── //

  getState(symbol) {
    const entry = this._symbols.get(symbol)
    if (!entry) return null

    const priceState = entry.priceEngine.getState()
    const depth      = entry.orderBook.getSnapshot()
    const candles    = entry.candleManager.getAllHistory()

    return {
      symbol,
      type:       this._type,
      source:     'simulation',
      marketOpen: this._clock.isOpen(),
      ...priceState,
      depth,
      candles,
    }
  }

  reset(symbol) {
    const entry = this._symbols.get(symbol)
    if (!entry) return
    entry.priceEngine.reset()
    entry.candleManager.reset()
  }

  resetAll() {
    this._symbols.forEach((entry) => {
      entry.priceEngine.reset()
      entry.candleManager.reset()
    })
  }

  getSymbols() {
    return Array.from(this._symbols.keys())
  }

  getMarketStatus() {
    return this._clock.getStatus()
  }

  // ── Private ───────────────────────────── //

  /**
   * Initialize engines for one pair
   */
  _initSymbol(pair) {
    const defaults = DEFAULTS.pair

    const priceEngine = new PriceEngine({
      startPrice: pair.startPrice,
      volatility: pair.volatility ?? defaults.volatility,
      trend:      pair.trend      ?? defaults.trend,
      precision:  pair.precision  ?? defaults.precision,
      tickSize:   pair.tickSize   ?? defaults.tickSize,
      minPrice:   pair.minPrice,
      maxPrice:   pair.maxPrice,
      volume:     pair.volume     ?? defaults.volume,
    })

    const orderBook = new OrderBook({
      depth:     this._depth,
      tickSize:  pair.tickSize  ?? defaults.tickSize,
      precision: pair.precision ?? defaults.precision,
      volume:    pair.volume    ?? defaults.volume,
      spreadPct: pair.spreadPct ?? defaults.spreadPct,
    })

    const candleManager = new CandleManager({
      intervals:  this._candleIntervals,
      precision:  pair.precision ?? defaults.precision,
      maxCandles: this._maxCandles,
      onClose:    (candle) => {
        this._emitCandle(this.normalizeCandle({
          symbol: pair.symbol,
          type:   this._type,
          ...candle,
        }))
      },
    })

    this._symbols.set(pair.symbol, {
      priceEngine,
      orderBook,
      candleManager,
      config: pair,
    })
  }

  /**
   * Main tick — advance price, update book, emit events
   */
  _tick() {
    if (this._paused) return

    // Market closed — emit closed event and skip
    if (!this._clock.isOpen()) {
      this._emitClose(this._clock.getStatus())
      return
    }

    const timestamp = Date.now()

    this._symbols.forEach((entry, symbol) => {
      try {
        // 1. Advance price
        const tick = entry.priceEngine.next()

        // 2. Update order book
        const depth = entry.orderBook.update(tick.price)

        // 3. Update candles
        entry.candleManager.tick(tick.price, tick.volume, timestamp)

        // 4. Emit tick
        this._emitTick(this.normalizeTick({
          symbol,
          type:      this._type,
          timestamp,
          price:     tick.price,
          bid:       tick.bid,
          ask:       tick.ask,
          spread:    tick.spread,
          volume:    tick.volume,
          change:    tick.change,
          changePct: tick.changePct,
          high24h:   tick.high24h,
          low24h:    tick.low24h,
          open24h:   tick.open24h,
          previous:  tick.previous,
        }))

        // 5. Emit depth
        this._emitDepth(this.normalizeDepth({
          symbol,
          type: this._type,
          timestamp,
          bids: depth.bids,
          asks: depth.asks,
        }))

      } catch (err) {
        this._emitError(symbol, err)
      }
    })
  }
}

module.exports = { SimulationConnector }