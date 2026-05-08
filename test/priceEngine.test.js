// tests/priceEngine.test.js

const { PriceEngine } = require('../src/core/priceEngine')

// ── Helper to create a default engine ─── //
const makeEngine = (overrides = {}) => new PriceEngine({
  startPrice: 1000,
  volatility: 0.002,
  precision:  2,
  volume:     { min: 100, max: 10000 },
  ...overrides,
})

describe('PriceEngine', () => {

  // ── Initialization ────────────────────── //

  describe('initialization', () => {
    it('should set currentPrice to startPrice', () => {
      const engine = makeEngine({ startPrice: 45000 })
      expect(engine.currentPrice).toBe(45000)
    })

    it('should set open24h to startPrice', () => {
      const engine = makeEngine({ startPrice: 45000 })
      expect(engine.open24h).toBe(45000)
    })

    it('should set high24h to startPrice initially', () => {
      const engine = makeEngine({ startPrice: 45000 })
      expect(engine.high24h).toBe(45000)
    })

    it('should set low24h to startPrice initially', () => {
      const engine = makeEngine({ startPrice: 45000 })
      expect(engine.low24h).toBe(45000)
    })

    it('should start with tickCount of 0', () => {
      const engine = makeEngine()
      expect(engine.tickCount).toBe(0)
    })
  })

  // ── next() ────────────────────────────── //

  describe('next()', () => {
    it('should return a tick object with all required fields', () => {
      const engine = makeEngine()
      const tick   = engine.next()

      expect(tick).toHaveProperty('price')
      expect(tick).toHaveProperty('bid')
      expect(tick).toHaveProperty('ask')
      expect(tick).toHaveProperty('spread')
      expect(tick).toHaveProperty('volume')
      expect(tick).toHaveProperty('change')
      expect(tick).toHaveProperty('changePct')
      expect(tick).toHaveProperty('high24h')
      expect(tick).toHaveProperty('low24h')
      expect(tick).toHaveProperty('open24h')
      expect(tick).toHaveProperty('previous')
      expect(tick).toHaveProperty('tickCount')
    })

    it('should always have bid below ask', () => {
      const engine = makeEngine()
      for (let i = 0; i < 100; i++) {
        const tick = engine.next()
        expect(tick.bid).toBeLessThan(tick.ask)
      }
    })

    it('should always have positive spread', () => {
      const engine = makeEngine()
      for (let i = 0; i < 100; i++) {
        const tick = engine.next()
        expect(tick.spread).toBeGreaterThan(0)
      }
    })

    it('should always have positive price', () => {
      const engine = makeEngine()
      for (let i = 0; i < 100; i++) {
        const tick = engine.next()
        expect(tick.price).toBeGreaterThan(0)
      }
    })

    it('should always have positive volume', () => {
      const engine = makeEngine()
      for (let i = 0; i < 100; i++) {
        const tick = engine.next()
        expect(tick.volume).toBeGreaterThan(0)
      }
    })

    it('should respect volume min', () => {
      const engine = makeEngine({ volume: { min: 500, max: 1000 } })
      for (let i = 0; i < 50; i++) {
        const tick = engine.next()
        expect(tick.volume).toBeGreaterThanOrEqual(500)
      }
    })

    it('should increment tickCount on each call', () => {
      const engine = makeEngine()
      engine.next()
      engine.next()
      engine.next()
      expect(engine.tickCount).toBe(3)
    })

    it('should update previous to last price', () => {
      const engine = makeEngine()
      const tick1  = engine.next()
      const tick2  = engine.next()
      expect(tick2.previous).toBe(tick1.price)
    })

    it('should keep price within minPrice boundary', () => {
      const engine = makeEngine({
        startPrice: 1000,
        minPrice:   900,
        maxPrice:   1100,
      })
      for (let i = 0; i < 200; i++) {
        const tick = engine.next()
        expect(tick.price).toBeGreaterThanOrEqual(900)
        expect(tick.price).toBeLessThanOrEqual(1100)
      }
    })

    it('high24h should never go below low24h', () => {
      const engine = makeEngine()
      for (let i = 0; i < 100; i++) {
        const tick = engine.next()
        expect(tick.high24h).toBeGreaterThanOrEqual(tick.low24h)
      }
    })

    it('high24h should update when price exceeds it', () => {
      const engine = makeEngine({ startPrice: 1000 })
      let maxPrice = 1000

      for (let i = 0; i < 50; i++) {
        const tick = engine.next()
        if (tick.price > maxPrice) maxPrice = tick.price
      }

      expect(engine.high24h).toBe(maxPrice)
    })

    it('low24h should update when price goes below it', () => {
      const engine = makeEngine({ startPrice: 1000 })
      let minPrice = 1000

      for (let i = 0; i < 50; i++) {
        const tick = engine.next()
        if (tick.price < minPrice) minPrice = tick.price
      }

      expect(engine.low24h).toBe(minPrice)
    })

    it('should respect precision — price should have correct decimal places', () => {
      const engine = makeEngine({ precision: 2 })
      for (let i = 0; i < 20; i++) {
        const tick     = engine.next()
        const decimals = (tick.price.toString().split('.')[1] || '').length
        expect(decimals).toBeLessThanOrEqual(2)
      }
    })

    it('should work with precision 5 for forex', () => {
      const engine = makeEngine({
        startPrice: 1.08450,
        precision:  5,
        volatility: 0.0003,
      })
      for (let i = 0; i < 20; i++) {
        const tick     = engine.next()
        const decimals = (tick.price.toString().split('.')[1] || '').length
        expect(decimals).toBeLessThanOrEqual(5)
      }
    })
  })

  // ── reset() ───────────────────────────── //

  describe('reset()', () => {
    it('should reset price to startPrice', () => {
      const engine = makeEngine({ startPrice: 1000 })
      // advance price
      for (let i = 0; i < 20; i++) engine.next()
      engine.reset()
      expect(engine.currentPrice).toBe(1000)
    })

    it('should reset tickCount to 0', () => {
      const engine = makeEngine()
      for (let i = 0; i < 10; i++) engine.next()
      engine.reset()
      expect(engine.tickCount).toBe(0)
    })

    it('should reset high24h to startPrice', () => {
      const engine = makeEngine({ startPrice: 1000 })
      for (let i = 0; i < 20; i++) engine.next()
      engine.reset()
      expect(engine.high24h).toBe(1000)
    })

    it('should reset low24h to startPrice', () => {
      const engine = makeEngine({ startPrice: 1000 })
      for (let i = 0; i < 20; i++) engine.next()
      engine.reset()
      expect(engine.low24h).toBe(1000)
    })

    it('should reset totalVolume to 0', () => {
      const engine = makeEngine()
      for (let i = 0; i < 10; i++) engine.next()
      engine.reset()
      expect(engine.totalVolume).toBe(0)
    })
  })

  // ── resetDay() ────────────────────────── //

  describe('resetDay()', () => {
    it('should reset open24h to current price', () => {
      const engine = makeEngine({ startPrice: 1000 })
      for (let i = 0; i < 10; i++) engine.next()
      const priceBeforeReset = engine.currentPrice
      engine.resetDay()
      expect(engine.open24h).toBe(priceBeforeReset)
    })

    it('should reset totalVolume to 0', () => {
      const engine = makeEngine()
      for (let i = 0; i < 10; i++) engine.next()
      engine.resetDay()
      expect(engine.totalVolume).toBe(0)
    })

    it('should not change currentPrice', () => {
      const engine = makeEngine({ startPrice: 1000 })
      for (let i = 0; i < 10; i++) engine.next()
      const priceBefore = engine.currentPrice
      engine.resetDay()
      expect(engine.currentPrice).toBe(priceBefore)
    })
  })

  // ── getState() ────────────────────────── //

  describe('getState()', () => {
    it('should return current state without advancing price', () => {
      const engine = makeEngine({ startPrice: 1000 })
      const state1 = engine.getState()
      const state2 = engine.getState()
      expect(state1.price).toBe(state2.price)
      expect(engine.tickCount).toBe(0)
    })

    it('should return all required state fields', () => {
      const engine = makeEngine()
      const state  = engine.getState()
      expect(state).toHaveProperty('price')
      expect(state).toHaveProperty('high24h')
      expect(state).toHaveProperty('low24h')
      expect(state).toHaveProperty('open24h')
      expect(state).toHaveProperty('totalVolume')
      expect(state).toHaveProperty('tickCount')
    })
  })
})