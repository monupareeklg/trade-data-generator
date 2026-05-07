import { EventEmitter } from 'events'

// ── Shared types ───────────────────────────── //

export type MarketType = 'crypto' | 'forex' | 'equity'

export type CandleInterval = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface VolumeConfig {
  min: number
  max: number
}

export interface MarketHoursConfig {
  /** Opening time e.g. '09:30' */
  open: string
  /** Closing time e.g. '16:00' */
  close: string
  /** IANA timezone e.g. 'America/New_York' */
  timezone: string
  /** Trading days — 0=Sun, 6=Sat. Default: [1,2,3,4,5] */
  days?: number[]
}

export interface PairConfig {
  /** e.g. 'BTC/USDT' */
  symbol: string
  /** Initial price */
  startPrice: number
  /** Max % move per tick. e.g. 0.002 = 0.2%. Default: 0.002 */
  volatility?: number
  /** Drift per tick. e.g. 0.0001 up, -0.0001 down. Default: 0 */
  trend?: number
  /** Decimal places. Default: 2 */
  precision?: number
  /** Minimum price increment. Default: 0.01 */
  tickSize?: number
  /** Bid/ask spread as % of price. Default: 0.001 */
  spreadPct?: number
  /** Volume range per tick */
  volume?: VolumeConfig
  /** Price floor. Default: 50% of startPrice */
  minPrice?: number
  /** Price ceiling. Default: 150% of startPrice */
  maxPrice?: number
}

export interface MarketFeedConfig {
  /** Market type */
  type: MarketType
  /** Array of pair configs */
  pairs: PairConfig[]
  /** Milliseconds between ticks. Default: 1000 */
  interval?: number
  /** Candle intervals to track. Default: ['1m'] */
  candleIntervals?: CandleInterval[]
  /** Order book levels each side. Default: 10 */
  depth?: number
  /** Max candle history per interval. Default: 1000 */
  maxCandles?: number
  /** Required for equity and forex */
  marketHours?: MarketHoursConfig
}

// ── Event data types ───────────────────────── //

export interface TickData {
  symbol:      string
  type:        MarketType
  timestamp:   number
  price:       number
  bid:         number
  ask:         number
  spread:      number
  volume:      number
  change:      number
  changePct:   number
  high24h:     number
  low24h:      number
  open24h:     number
  previous:    number
}

export interface CandleData {
  symbol:    string
  type:      MarketType
  interval:  CandleInterval
  openTime:  number
  closeTime: number
  open:      number
  high:      number
  low:       number
  close:     number
  volume:    number
  ticks:     number
  closed:    boolean
}

export interface OrderBookLevel {
  price:  number
  volume: number
  side:   'bid' | 'ask'
  level:  number
}

export interface DepthData {
  symbol:    string
  type:      MarketType
  timestamp: number
  bids:      OrderBookLevel[]
  asks:      OrderBookLevel[]
}

export interface MarketStatusData {
  type:      MarketType
  time:      string
  timezone:  string
  timestamp: number
}

export interface MarketStatus {
  isOpen:    boolean
  type:      MarketType
  timezone?: string
  openTime?: string
  closeTime?: string
  localTime?: string
  reason:    string
}

export interface SymbolState {
  symbol:      string
  type:        MarketType
  price:       number
  high24h:     number
  low24h:      number
  open24h:     number
  totalVolume: number
  tickCount:   number
  depth: {
    bids: OrderBookLevel[]
    asks: OrderBookLevel[]
  }
  candles:     Record<CandleInterval, CandleData[]>
  marketOpen:  boolean
}

export interface ErrorData {
  symbol: string
  error:  string
  stack:  string
}

// ── MarketFeed class ───────────────────────── //

export declare class MarketFeed extends EventEmitter {
  constructor(config: MarketFeedConfig)

  /** Start emitting ticks */
  start(): this

  /** Stop completely */
  stop(): this

  /** Pause ticks — clock keeps running */
  pause(): this

  /** Resume after pause */
  resume(): this

  /** Get current state for a symbol */
  getState(symbol: string): SymbolState | null

  /** Get candle history for a symbol and interval */
  getCandles(symbol: string, interval: CandleInterval, limit?: number): CandleData[]

  /** Get all symbol names */
  getSymbols(): string[]

  /** Get market open/close status */
  getMarketStatus(): MarketStatus

  /** Reset a symbol to its start price */
  reset(symbol: string): this

  /** Reset all symbols */
  resetAll(): this

  /** Is the feed currently running and not paused */
  isRunning(): boolean

  // ── Typed event overloads ──────────────────── //

  /** Price tick — emitted every interval for every symbol */
  on(event: 'tick',   listener: (data: TickData)         => void): this
  /** Completed OHLCV candle */
  on(event: 'candle', listener: (data: CandleData)       => void): this
  /** Order book snapshot */
  on(event: 'depth',  listener: (data: DepthData)        => void): this
  /** Market opened (equity/forex only) */
  on(event: 'open',   listener: (data: MarketStatusData) => void): this
  /** Market closed (equity/forex only) */
  on(event: 'closed', listener: (data: MarketStatusData) => void): this
  /** Error on a symbol */
  on(event: 'error',  listener: (data: ErrorData)        => void): this
  on(event: string,   listener: (...args: any[]) => void): this
}