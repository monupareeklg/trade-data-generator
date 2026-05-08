// tests/candleManager.test.js

const { CandleManager } = require('../src/core/candleManager')

// ── Helper ────────────────────────────── //
const makeManager = (overrides = {}) => new CandleManager({
  intervals:  ['1m'],
  precision:  2,
  maxCandles: 100,
  ...overrides,
})

// Fixed timestamps for predictable testing
const MIN_MS  = 60 * 1000        // 1 minute in ms
const BASE_TS = 1700000000000    // fixed base timestamp

describe('CandleManager', () => {

  // ── Initialization ────────────────────── //

  describe('initialization', () => {
    it('should initialize with no current candle', () => {
      const mgr = makeManager()
      expect(mgr.getCurrent('1m')).toBeNull()
    })

    it('should initialize with empty history', () => {
      const mgr = makeManager()
      expect(mgr.getHistory('1m')).toHaveLength(0)
    })

    it('should support multiple intervals', () => {
      const mgr = makeManager({ intervals: ['1m', '5m', '1h'] })
      expect(mgr.intervals).toContain('1m')
      expect(mgr.intervals).toContain('5m')
      expect(mgr.intervals).toContain('1h')
    })

    it('should warn and skip unknown intervals', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const mgr = makeManager({ intervals: ['1m', '3m'] })
      expect(mgr.intervals).not.toContain('3m')
      expect(mgr.intervals).toContain('1m')
      spy.mockRestore()
    })

    it('should default to 1m if no intervals provided', () => {
      const mgr = new CandleManager({ precision: 2 })
      expect(mgr.intervals).toContain('1m')
    })
  })

  // ── tick() ────────────────────────────── //

  describe('tick()', () => {
    it('should open a new candle on first tick', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      const current = mgr.getCurrent('1m')
      expect(current).not.toBeNull()
    })

    it('should set open price to first tick price', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      const current = mgr.getCurrent('1m')
      expect(current.open).toBe(100)
    })

    it('should update high when price exceeds current high', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(120, 500, BASE_TS + 1000)
      const current = mgr.getCurrent('1m')
      expect(current.high).toBe(120)
    })

    it('should update low when price goes below current low', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(80,  500, BASE_TS + 1000)
      const current = mgr.getCurrent('1m')
      expect(current.low).toBe(80)
    })

    it('should update close to latest price', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(110, 500, BASE_TS + 1000)
      mgr.tick(105, 500, BASE_TS + 2000)
      const current = mgr.getCurrent('1m')
      expect(current.close).toBe(105)
    })

    it('should accumulate volume correctly', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(100, 300, BASE_TS + 1000)
      mgr.tick(100, 200, BASE_TS + 2000)
      const current = mgr.getCurrent('1m')
      expect(current.volume).toBe(1000)
    })

    it('should increment tick count', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(100, 500, BASE_TS + 1000)
      mgr.tick(100, 500, BASE_TS + 2000)
      const current = mgr.getCurrent('1m')
      expect(current.ticks).toBe(3)
    })

    it('high should always be >= open', () => {
      const mgr = makeManager()
      const prices = [100, 110, 95, 120, 88, 105]
      prices.forEach((p, i) => mgr.tick(p, 500, BASE_TS + i * 1000))
      const current = mgr.getCurrent('1m')
      expect(current.high).toBeGreaterThanOrEqual(current.open)
    })

    it('low should always be <= open', () => {
      const mgr = makeManager()
      const prices = [100, 110, 95, 120, 88, 105]
      prices.forEach((p, i) => mgr.tick(p, 500, BASE_TS + i * 1000))
      const current = mgr.getCurrent('1m')
      expect(current.low).toBeLessThanOrEqual(current.open)
    })

    it('high should always be >= close', () => {
      const mgr = makeManager()
      const prices = [100, 110, 95, 120, 88, 105]
      prices.forEach((p, i) => mgr.tick(p, 500, BASE_TS + i * 1000))
      const current = mgr.getCurrent('1m')
      expect(current.high).toBeGreaterThanOrEqual(current.close)
    })

    it('low should always be <= close', () => {
      const mgr = makeManager()
      const prices = [100, 110, 95, 120, 88, 105]
      prices.forEach((p, i) => mgr.tick(p, 500, BASE_TS + i * 1000))
      const current = mgr.getCurrent('1m')
      expect(current.low).toBeLessThanOrEqual(current.close)
    })

    it('should return updated and closed in result', () => {
      const mgr    = makeManager()
      const result = mgr.tick(100, 500, BASE_TS)
      expect(result).toHaveProperty('updated')
      expect(result).toHaveProperty('closed')
    })

    it('should not close candle within same interval', () => {
      const mgr    = makeManager()
      const result = mgr.tick(100, 500, BASE_TS)
      mgr.tick(101, 500, BASE_TS + 1000)
      mgr.tick(102, 500, BASE_TS + 2000)
      expect(result.closed).toHaveLength(0)
    })
  })

  // ── candle close ──────────────────────── //

  describe('candle closing', () => {
    it('should close candle when interval expires', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)

      // Jump to next interval
      const result = mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      expect(result.closed).toHaveLength(1)
    })

    it('closed candle should have closed=true', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      const result = mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      expect(result.closed[0].closed).toBe(true)
    })

    it('closed candle should be added to history', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      expect(mgr.getHistory('1m')).toHaveLength(1)
    })

    it('should only close candle once — no double append', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      mgr.tick(106, 500, BASE_TS + MIN_MS + 2000)
      mgr.tick(107, 500, BASE_TS + MIN_MS + 3000)
      expect(mgr.getHistory('1m')).toHaveLength(1)
    })

    it('should open new candle after closing old one', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      const current = mgr.getCurrent('1m')
      expect(current).not.toBeNull()
      expect(current.open).toBe(105)
    })

    it('closed candle open should match first tick of that interval', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(110, 500, BASE_TS + 5000)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      const history = mgr.getHistory('1m')
      expect(history[0].open).toBe(100)
    })

    it('onClose callback should fire when candle closes', () => {
      const onClose = jest.fn()
      const mgr = new CandleManager({
        intervals: ['1m'],
        precision: 2,
        onClose,
      })
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('onClose callback should receive the closed candle', () => {
      const onClose = jest.fn()
      const mgr = new CandleManager({
        intervals: ['1m'],
        precision: 2,
        onClose,
      })
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(105, 500, BASE_TS + MIN_MS + 1)
      const candle = onClose.mock.calls[0][0]
      expect(candle.closed).toBe(true)
      expect(candle.open).toBe(100)
    })

    it('should trim history when maxCandles is exceeded', () => {
      const mgr = new CandleManager({
        intervals:  ['1m'],
        precision:  2,
        maxCandles: 3,
      })

      // Generate 4 candles
      for (let i = 0; i < 4; i++) {
        mgr.tick(100 + i, 500, BASE_TS + i * MIN_MS)
        mgr.tick(101 + i, 500, BASE_TS + i * MIN_MS + MIN_MS + 1)
      }

      expect(mgr.getHistory('1m').length).toBeLessThanOrEqual(3)
    })
  })

  // ── getHistory() ──────────────────────── //

  describe('getHistory()', () => {
    it('should return empty array for unknown interval', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const mgr = makeManager()
      expect(mgr.getHistory('3m')).toHaveLength(0)
      spy.mockRestore()
    })

    it('should respect limit parameter', () => {
      const mgr = makeManager()
      // Generate 3 closed candles
      for (let i = 0; i < 3; i++) {
        mgr.tick(100, 500, BASE_TS + i * MIN_MS)
        mgr.tick(101, 500, BASE_TS + i * MIN_MS + MIN_MS + 1)
      }
      const history = mgr.getHistory('1m', 2)
      expect(history).toHaveLength(2)
    })

    it('should return all candles when no limit given', () => {
      const mgr = makeManager()
      for (let i = 0; i < 3; i++) {
        mgr.tick(100, 500, BASE_TS + i * MIN_MS)
        mgr.tick(101, 500, BASE_TS + i * MIN_MS + MIN_MS + 1)
      }
      expect(mgr.getHistory('1m')).toHaveLength(3)
    })
  })

  // ── getCurrent() ──────────────────────── //

  describe('getCurrent()', () => {
    it('should return null before first tick', () => {
      const mgr = makeManager()
      expect(mgr.getCurrent('1m')).toBeNull()
    })

    it('should return current open candle', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      expect(mgr.getCurrent('1m')).not.toBeNull()
    })

    it('should return null for unknown interval', () => {
      const mgr = makeManager()
      expect(mgr.getCurrent('3m')).toBeNull()
    })

    it('should not mutate internal state when called', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      const c1 = mgr.getCurrent('1m')
      const c2 = mgr.getCurrent('1m')
      expect(c1.open).toBe(c2.open)
      expect(c1.ticks).toBe(c2.ticks)
    })
  })

  // ── getAllHistory() ────────────────────── //

  describe('getAllHistory()', () => {
    it('should return object with all interval keys', () => {
      const mgr = makeManager({ intervals: ['1m', '5m'] })
      const all = mgr.getAllHistory()
      expect(all).toHaveProperty('1m')
      expect(all).toHaveProperty('5m')
    })

    it('should return empty arrays initially', () => {
      const mgr = makeManager({ intervals: ['1m', '5m'] })
      const all = mgr.getAllHistory()
      expect(all['1m']).toHaveLength(0)
      expect(all['5m']).toHaveLength(0)
    })
  })

  // ── reset() ───────────────────────────── //

  describe('reset()', () => {
    it('should clear current candle', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.reset()
      expect(mgr.getCurrent('1m')).toBeNull()
    })

    it('should clear history', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.tick(101, 500, BASE_TS + MIN_MS + 1)
      mgr.reset()
      expect(mgr.getHistory('1m')).toHaveLength(0)
    })

    it('should allow new candles after reset', () => {
      const mgr = makeManager()
      mgr.tick(100, 500, BASE_TS)
      mgr.reset()
      mgr.tick(200, 500, BASE_TS + MIN_MS * 10)
      const current = mgr.getCurrent('1m')
      expect(current.open).toBe(200)
    })
  })
})