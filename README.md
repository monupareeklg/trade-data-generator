# trade-data-generator

[![npm version](https://img.shields.io/npm/v/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)
[![license](https://img.shields.io/npm/l/trade-data-generator.svg)](https://github.com/monupareeklg/trade-data-generator/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/trade-data-generator)
[![tests](https://img.shields.io/badge/tests-167%20passed-brightgreen.svg)]()
[![coverage](https://img.shields.io/badge/coverage-91.9%25-brightgreen.svg)]()

Generate realistic real-time market data for trading UIs — equity, forex and crypto.  
Emits price ticks, order book depth, OHLCV candles and market status events via **EventEmitter**.  
Wire it into your own WebSocket server in minutes.

---

## Why this exists

Building a trading UI requires live market data. Real data feeds (Bloomberg, Refinitiv) cost thousands per month. Free APIs have rate limits and no order book depth.

`trade-data-generator` gives you realistic synthetic data for **equity, forex and crypto** so you can build and test your trading UI without any external dependencies or API keys.

---

## Features

- **Realistic price simulation** — random walk with mean reversion, volatility and trend bias
- **Accurate order book** — bid always below ask, volume tapers with depth
- **OHLCV candlesticks** — multiple intervals simultaneously (`1m`, `5m`, `1h`, etc.)
- **Market hours** — equity and forex respect open/close times and timezones
- **Crypto always open** — no market hours needed
- **EventEmitter API** — wire into any WebSocket (Socket.io, ws, Pusher, Ably)
- **Zero dependencies** — nothing to install beyond the library itself
- **Multi-symbol** — run dozens of pairs simultaneously
- **Full controls** — start, stop, pause, resume, reset per symbol

---

## Installation

```bash
npm install trade-data-generator
```

---

## Quick Start

```javascript
const { MarketFeed } = require('trade-data-generator')

const feed = new MarketFeed({
  type:  'crypto',
  pairs: [
    { symbol: 'BTC/USDT', startPrice: 45000, volatility: 0.004 },
    { symbol: 'ETH/USDT', startPrice: 2800,  volatility: 0.005 },
  ]
})

feed.on('tick',  (data) => console.log(data))
feed.on('candle',(data) => console.log(data))
feed.on('depth', (data) => console.log(data))

feed.start()
```

---

## WebSocket Integration

The library emits events — you own the WebSocket server.  
This works with **any** WebSocket library.

```javascript
const { MarketFeed } = require('trade-data-generator')
const { Server }     = require('socket.io')
const http           = require('http')

const server = http.createServer()
const io     = new Server(server, { cors: { origin: '*' } })

const feed = new MarketFeed({
  type:            'equity',
  interval:        1000,
  candleIntervals: ['1m', '5m'],
  marketHours: {
    open:     '09:30',
    close:    '16:00',
    timezone: 'America/New_York',
  },
  pairs: [
    { symbol: 'AAPL',  startPrice: 175.50, volatility: 0.002, precision: 2 },
    { symbol: 'GOOGL', startPrice: 142.30, volatility: 0.003, precision: 2 },
  ]
})

// Library events → broadcast to clients
feed.on('tick',   (data) => io.to(data.symbol).emit('ticker_update',    data))
feed.on('candle', (data) => io.to(data.symbol).emit('candle_update',    data))
feed.on('depth',  (data) => io.to(data.symbol).emit('orderbook_update', data))
feed.on('open',   (info) => io.emit('market_open',   info))
feed.on('closed', (info) => io.emit('market_closed', info))

// Client subscription
io.on('connection', (socket) => {
  socket.on('subscribe', ({ symbol }) => {
    socket.join(symbol)
    socket.emit('snapshot', feed.getState(symbol))
  })
  socket.on('unsubscribe', ({ symbol }) => {
    socket.leave(symbol)
  })
})

feed.start()
server.listen(3001)
```

---

## Market Types

### Crypto — always open

```javascript
const feed = new MarketFeed({
  type:  'crypto',
  pairs: [
    { symbol: 'BTC/USDT', startPrice: 45000, volatility: 0.004, precision: 2 },
    { symbol: 'ETH/USDT', startPrice: 2800,  volatility: 0.005, precision: 2 },
    { symbol: 'SOL/USDT', startPrice: 120,   volatility: 0.008, precision: 3 },
  ]
})
```

### Equity — respects market hours

```javascript
const feed = new MarketFeed({
  type: 'equity',
  marketHours: {
    open:     '09:30',
    close:    '16:00',
    timezone: 'America/New_York',
    days:     [1, 2, 3, 4, 5],   // Mon–Fri
  },
  pairs: [
    { symbol: 'AAPL',  startPrice: 175.50, volatility: 0.002, precision: 2 },
    { symbol: 'GOOGL', startPrice: 142.30, volatility: 0.003, precision: 2 },
  ]
})
```

### Forex — pip precision

```javascript
const feed = new MarketFeed({
  type: 'forex',
  marketHours: {
    open:     '00:00',
    close:    '23:59',
    timezone: 'UTC',
    days:     [1, 2, 3, 4, 5],
  },
  pairs: [
    { symbol: 'EUR/USD', startPrice: 1.08450, volatility: 0.0003, precision: 5, tickSize: 0.00001 },
    { symbol: 'GBP/USD', startPrice: 1.26780, volatility: 0.0004, precision: 5, tickSize: 0.00001 },
    { symbol: 'USD/JPY', startPrice: 149.850, volatility: 0.0002, precision: 3, tickSize: 0.001   },
  ]
})
```

---

## Events

```javascript
// Price tick — emitted every interval for every symbol
feed.on('tick', (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   type:      'crypto',
  //   timestamp:  1714900000000,
  //   price:      45016.14,
  //   bid:        44993.63,
  //   ask:        45038.65,
  //   spread:     45.02,
  //   volume:     4,
  //   change:     +16.14,
  //   changePct:  +0.04,
  //   high24h:    45200.00,
  //   low24h:     44800.00,
  //   open24h:    45000.00,
  //   previous:   45000.00,
  // }
})

// Completed OHLCV candle
feed.on('candle', (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   interval:  '1m',
  //   openTime:  1714900000000,
  //   closeTime: 1714900060000,
  //   open:      45000.00,
  //   high:      45200.00,
  //   low:       44800.00,
  //   close:     45016.14,
  //   volume:    284,
  //   ticks:     60,
  //   closed:    true,
  // }
})

// Order book snapshot
feed.on('depth', (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   timestamp:  1714900000000,
  //   bids: [
  //     { price: 44993.63, volume: 5, side: 'bid', level: 0 },
  //     { price: 44993.62, volume: 3, side: 'bid', level: 1 },
  //     ...10 levels
  //   ],
  //   asks: [
  //     { price: 45038.65, volume: 4, side: 'ask', level: 0 },
  //     ...10 levels
  //   ]
  // }
})

// Market opened (equity/forex only)
feed.on('open', (info) => {
  // { type: 'equity', time: '09:30', timezone: 'America/New_York', timestamp: ... }
})

// Market closed (equity/forex only)
feed.on('closed', (info) => {
  // { type: 'equity', time: '16:00', timezone: 'America/New_York', timestamp: ... }
})

// Error on a symbol
feed.on('error', (err) => {
  // { symbol: 'BTC/USDT', error: 'message', stack: '...' }
})
```

---

## Configuration

### MarketFeed options

| Option            | Type       | Default  | Description                                      |
|-------------------|------------|----------|--------------------------------------------------|
| `type`            | `string`   | required | `'crypto'` \| `'forex'` \| `'equity'`           |
| `pairs`           | `Array`    | required | Array of pair configs (see below)                |
| `interval`        | `number`   | `1000`   | Milliseconds between ticks                       |
| `candleIntervals` | `string[]` | `['1m']` | Candle intervals to track                        |
| `depth`           | `number`   | `10`     | Order book levels each side                      |
| `maxCandles`      | `number`   | `1000`   | Max candle history per interval                  |
| `marketHours`     | `Object`   | —        | Required for `equity` and `forex`                |

### marketHours options

| Option     | Type       | Default        | Description                          |
|------------|------------|----------------|--------------------------------------|
| `open`     | `string`   | required       | Opening time e.g. `'09:30'`         |
| `close`    | `string`   | required       | Closing time e.g. `'16:00'`         |
| `timezone` | `string`   | required       | IANA timezone e.g. `'America/New_York'` |
| `days`     | `number[]` | `[1,2,3,4,5]` | Trading days (0=Sun, 6=Sat)         |

### Pair options

| Option       | Type     | Default   | Description                                     |
|--------------|----------|-----------|-------------------------------------------------|
| `symbol`     | `string` | required  | e.g. `'BTC/USDT'`                              |
| `startPrice` | `number` | required  | Initial price                                   |
| `volatility` | `number` | `0.002`   | Max % move per tick (0.002 = 0.2%)             |
| `trend`      | `number` | `0`       | Drift per tick (0.0001 up, -0.0001 down)       |
| `precision`  | `number` | `2`       | Decimal places                                  |
| `tickSize`   | `number` | `0.01`    | Minimum price increment                         |
| `spreadPct`  | `number` | `0.001`   | Bid/ask spread as % of price                   |
| `volume`     | `Object` | see below | `{ min: 100, max: 10000 }`                     |
| `minPrice`   | `number` | —         | Price floor (default: 50% of startPrice)        |
| `maxPrice`   | `number` | —         | Price ceiling (default: 150% of startPrice)     |

### Candle intervals

`'1s'` `'1m'` `'5m'` `'15m'` `'1h'` `'4h'` `'1d'`

---

## API

```javascript
feed.start()                        // Start emitting ticks
feed.stop()                         // Stop completely
feed.pause()                        // Pause ticks (clock keeps running)
feed.resume()                       // Resume after pause

feed.getState(symbol)               // Current price, stats, depth, candles
feed.getCandles(symbol, interval, limit) // Candle history
feed.getSymbols()                   // ['BTC/USDT', 'ETH/USDT', ...]
feed.getMarketStatus()              // { isOpen, type, timezone, ... }

feed.reset(symbol)                  // Reset one symbol to startPrice
feed.resetAll()                     // Reset all symbols
feed.isRunning()                    // true | false
```

---

## Examples

```bash
node examples/crypto.js    # Crypto feed — always open
node examples/equity.js    # US stocks — market hours
node examples/forex.js     # Forex pairs — pip precision
```

---

## v2.0.0 — Complete Rewrite

Version 2 is a full rewrite. The old API is not compatible.

**What changed:**
- New class name: `MarketFeed` (was `MarketDepthGenerator`)
- EventEmitter API — no polling required
- Accurate order book — bid always below ask
- Correct timezone handling via `Intl` API
- Per-symbol 24h stats — no more hardcoded globals
- Multiple candle intervals simultaneously
- Volume correlated with price move size
- Mean reversion — prices don't drift to infinity
- Zero dependencies — removed axios, redis, ws, node-fetch
- Full input validation with clear error messages

---

## Author

**Love Pareek** — [monupareeklg@gmail.com](mailto:monupareeklg@gmail.com)  
GitHub: [monupareeklg](https://github.com/monupareeklg)  
Contributor: [Kush Pareek](https://github.com/kushpareek)

---

## License

MIT — see [LICENSE](https://github.com/monupareeklg/trade-data-generator/blob/master/LICENSE)

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature-name`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature-name`
5. Open a pull request

Issues and PRs welcome on [GitHub](https://github.com/monupareeklg/trade-data-generator/issues).

---

⭐️ If this saved you time, star it on [GitHub](https://github.com/monupareeklg/trade-data-generator)!