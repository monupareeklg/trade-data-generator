# Changelog

All notable changes to this project will be documented in this file.

---

## [3.0.0] — 2026-05-11

### Added
- Connector architecture — pluggable data sources
- `source` config option — `'simulation'` | `'binance'`
- `BinanceConnector` — real-time Binance WebSocket data
  No API key required for public market data
- `SimulationConnector` — wraps existing engine
- `BaseConnector` — abstract base for custom connectors
- `registerConnector()` — community can add own connectors
- `getAvailableSources()` — list available sources

### Breaking changes
- None — fully backward compatible
  Existing code with no `source` option
  continues to work exactly as before

### Migration
```javascript
// Before (still works)
const feed = new MarketFeed({
  type:  'crypto',
  pairs: [{ symbol: 'BTC/USDT', startPrice: 45000 }]
})

// New — switch to real Binance data
const feed = new MarketFeed({
  source: 'binance',
  type:   'crypto',
  pairs:  [{ symbol: 'BTC/USDT' }]
})
```

## [2.0.0] — 2026-05-08

### ⚠️ Breaking Changes
- Class renamed from `MarketDepthGenerator` → `MarketFeed`
- Old API is not compatible with v2. See README for migration.

### Added
- New `MarketFeed` class extending EventEmitter
- `PriceEngine` — realistic price simulation with mean reversion,
  volatility, trend bias and Box-Muller normal distribution
- `OrderBook` — accurate bid/ask depth, bid always below ask,
  volume tapers with depth
- `CandleManager` — multiple intervals simultaneously
  (`1s`, `1m`, `5m`, `15m`, `1h`, `4h`, `1d`)
- `MarketClock` — market hours via IANA timezones, onOpen/onClose events
- Full input validation with clear error messages
- TypeScript definitions (`index.d.ts`)
- Working examples for crypto, equity and forex
- 167 tests, 91.9% coverage

### Fixed
- Crossed order book (bid was equal to or above ask)
- Double candle append bug (candles were pushed twice to history)
- Volume accumulation as string instead of number (caused NaN)
- Hardcoded `oneDayBeforePrice` global used for all symbols
- Timezone math using manual offset addition (always wrong)
- Per-symbol precision ignored (was hardcoded to 5 everywhere)
- `maxTradeVolume` config ignored entirely

### Removed
- `axios`, `node-fetch`, `redis`, `ws` dead dependencies
- `bignumber.js` dependency (replaced with native `toFixed`)
- Dead code: `src/models/candlestick.js`, `src/utils/timeUtils.js`
- Built-in WebSocket server (developer owns transport layer)

---

## [1.4.3] — 2025-12-01

### Added
- Market hours support for forex and equity
- Per-symbol precision and step size configuration

### Fixed
- Improved candlestick data streaming

---

## [1.4.1] — 2025-11-15

### Added
- Initial market hours support
- Multi-symbol configuration

---

## [1.0.0] — 2025-10-01

### Added
- Initial release
- Basic market depth generation
- OHLC candlestick support
- WebSocket integration example