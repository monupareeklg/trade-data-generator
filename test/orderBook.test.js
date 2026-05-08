// tests/orderBook.test.js

const { OrderBook } = require('../src/core/orderBook')

// ── Helper ────────────────────────────── //
const makeBook = (overrides = {}) => new OrderBook({
  depth:     10,
  tickSize:  0.01,
  precision: 2,
  volume:    { min: 100, max: 5000 },
  spreadPct: 0.001,
  ...overrides,
})

describe('OrderBook', () => {

  // ── Initialization ────────────────────── //

  describe('initialization', () => {
    it('should initialize with empty book', () => {
      const book     = makeBook()
      const snapshot = book.getSnapshot()
      expect(snapshot.bids).toHaveLength(0)
      expect(snapshot.asks).toHaveLength(0)
    })
  })

  // ── generate() ───────────────────────── //

  describe('generate()', () => {
    it('should return bids and asks arrays', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      expect(depth).toHaveProperty('bids')
      expect(depth).toHaveProperty('asks')
    })

    it('should generate correct number of bid levels', () => {
      const book  = makeBook({ depth: 10 })
      const depth = book.generate(1000)
      expect(depth.bids).toHaveLength(10)
    })

    it('should generate correct number of ask levels', () => {
      const book  = makeBook({ depth: 10 })
      const depth = book.generate(1000)
      expect(depth.asks).toHaveLength(10)
    })

    it('should always have best bid below best ask', () => {
      const book = makeBook()
      for (let i = 0; i < 50; i++) {
        const price = 1000 + Math.random() * 100
        const depth = book.generate(price)
        expect(depth.bids[0].price).toBeLessThan(depth.asks[0].price)
      }
    })

    it('should never have crossed book', () => {
      const book = makeBook()
      for (let i = 0; i < 50; i++) {
        const price = 1000 + Math.random() * 100
        const depth = book.generate(price)
        const bestBid = depth.bids[0].price
        const bestAsk = depth.asks[0].price
        expect(bestBid).toBeLessThan(bestAsk)
      }
    })

    it('bid prices should decrease with depth', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      for (let i = 1; i < depth.bids.length; i++) {
        expect(depth.bids[i].price).toBeLessThan(depth.bids[i - 1].price)
      }
    })

    it('ask prices should increase with depth', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      for (let i = 1; i < depth.asks.length; i++) {
        expect(depth.asks[i].price).toBeGreaterThan(depth.asks[i - 1].price)
      }
    })

    it('all bid volumes should be positive', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      depth.bids.forEach(bid => {
        expect(bid.volume).toBeGreaterThan(0)
      })
    })

    it('all ask volumes should be positive', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      depth.asks.forEach(ask => {
        expect(ask.volume).toBeGreaterThan(0)
      })
    })

    it('bid levels should have side set to bid', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      depth.bids.forEach(bid => {
        expect(bid.side).toBe('bid')
      })
    })

    it('ask levels should have side set to ask', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      depth.asks.forEach(ask => {
        expect(ask.side).toBe('ask')
      })
    })

    it('level index should match position in array', () => {
      const book  = makeBook()
      const depth = book.generate(1000)
      depth.bids.forEach((bid, i) => {
        expect(bid.level).toBe(i)
      })
      depth.asks.forEach((ask, i) => {
        expect(ask.level).toBe(i)
      })
    })

    it('should respect precision on prices', () => {
      const book  = makeBook({ precision: 2 })
      const depth = book.generate(1000)
      depth.bids.forEach(bid => {
        const decimals = (bid.price.toString().split('.')[1] || '').length
        expect(decimals).toBeLessThanOrEqual(2)
      })
    })

    it('should work with custom depth', () => {
      const book  = makeBook({ depth: 5 })
      const depth = book.generate(1000)
      expect(depth.bids).toHaveLength(5)
      expect(depth.asks).toHaveLength(5)
    })

    it('should update internal state after generate', () => {
      const book     = makeBook()
      book.generate(1000)
      const snapshot = book.getSnapshot()
      expect(snapshot.bids).toHaveLength(10)
      expect(snapshot.asks).toHaveLength(10)
    })
  })

  // ── update() ─────────────────────────── //

  describe('update()', () => {
    it('should generate book if no existing book', () => {
      const book  = makeBook()
      const depth = book.update(1000)
      expect(depth.bids).toHaveLength(10)
      expect(depth.asks).toHaveLength(10)
    })

    it('should always keep bid below ask after update', () => {
      const book = makeBook()
      book.generate(1000)
      for (let i = 0; i < 50; i++) {
        const price = 1000 + (Math.random() - 0.5) * 10
        const depth = book.update(price)
        expect(depth.bids[0].price).toBeLessThan(depth.asks[0].price)
      }
    })

    it('should return correct number of levels after update', () => {
      const book = makeBook({ depth: 10 })
      book.generate(1000)
      const depth = book.update(1001)
      expect(depth.bids).toHaveLength(10)
      expect(depth.asks).toHaveLength(10)
    })

    it('volumes should stay within min/max after update', () => {
      const book = makeBook({ volume: { min: 100, max: 5000 } })
      book.generate(1000)
      for (let i = 0; i < 20; i++) {
        const depth = book.update(1000 + i)
        depth.bids.forEach(bid => {
          expect(bid.volume).toBeGreaterThanOrEqual(100)
          expect(bid.volume).toBeLessThanOrEqual(5000)
        })
      }
    })

    it('bid prices should still decrease after update', () => {
      const book = makeBook()
      book.generate(1000)
      const depth = book.update(1001)
      for (let i = 1; i < depth.bids.length; i++) {
        expect(depth.bids[i].price).toBeLessThan(depth.bids[i - 1].price)
      }
    })

    it('ask prices should still increase after update', () => {
      const book = makeBook()
      book.generate(1000)
      const depth = book.update(1001)
      for (let i = 1; i < depth.asks.length; i++) {
        expect(depth.asks[i].price).toBeGreaterThan(depth.asks[i - 1].price)
      }
    })
  })

  // ── getSnapshot() ─────────────────────── //

  describe('getSnapshot()', () => {
    it('should return empty arrays before any generate', () => {
      const book     = makeBook()
      const snapshot = book.getSnapshot()
      expect(snapshot.bids).toHaveLength(0)
      expect(snapshot.asks).toHaveLength(0)
    })

    it('should return last generated book', () => {
      const book = makeBook()
      book.generate(1000)
      const snapshot = book.getSnapshot()
      expect(snapshot.bids).toHaveLength(10)
      expect(snapshot.asks).toHaveLength(10)
    })

    it('should not advance state when called', () => {
      const book = makeBook()
      book.generate(1000)
      const snap1 = book.getSnapshot()
      const snap2 = book.getSnapshot()
      expect(snap1.bids[0].price).toBe(snap2.bids[0].price)
    })
  })

  // ── spread behavior ───────────────────── //

  describe('spread behavior', () => {
    it('spread should be larger with higher spreadPct', () => {
      const bookTight = makeBook({ spreadPct: 0.001 })
      const bookWide  = makeBook({ spreadPct: 0.01  })

      const depthTight = bookTight.generate(1000)
      const depthWide  = bookWide.generate(1000)

      const spreadTight = depthTight.asks[0].price - depthTight.bids[0].price
      const spreadWide  = depthWide.asks[0].price  - depthWide.bids[0].price

      expect(spreadWide).toBeGreaterThan(spreadTight)
    })

    it('spread should scale with price', () => {
      const bookLow  = makeBook()
      const bookHigh = makeBook()

      const depthLow  = bookLow.generate(100)
      const depthHigh = bookHigh.generate(10000)

      const spreadLow  = depthLow.asks[0].price  - depthLow.bids[0].price
      const spreadHigh = depthHigh.asks[0].price - depthHigh.bids[0].price

      expect(spreadHigh).toBeGreaterThan(spreadLow)
    })
  })
})