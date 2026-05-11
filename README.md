# trade-data-generator

[![npm version](https://img.shields.io/npm/v/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)
[![license](https://img.shields.io/npm/l/trade-data-generator.svg)](https://github.com/monupareeklg/trade-data-generator/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/trade-data-generator)
[![tests](https://img.shields.io/badge/tests-167%20passed-brightgreen.svg)]()
[![coverage](https://img.shields.io/badge/coverage-91.9%25-brightgreen.svg)]()

The universal market data layer for trading UIs.  
**Simulation** for development. **Real exchange data** for production.  
Same API. Same format. One library.

---

## Why this exists

Building a trading UI requires live market data at every stage:

- **Development** — you need realistic fake data to build and test your UI
- **Production** — you need real exchange data for your users

Most developers use two completely different libraries for this — one for testing, one for production. That means rewriting your data handling code when you go live.

`trade-data-generator` solves both with one API. Switch from simulation to real Binance data by changing one line.

---

## Features

- **Simulation mode** — realistic fake data, zero API keys, works offline
- **Binance connector** — real-time Binance WebSocket data, no API key needed
- **Same API for both** — switch sources with one config change
- **Pluggable connectors** — build your own connector for any exchange
- **Realistic price engine** — mean reversion, volatility, trend bias
- **Accurate order book** — bid always below ask, volume tapers with depth
- **OHLCV candles** — multiple intervals simultaneously
- **Market hours** — equity and forex respect open/close times
- **EventEmitter API** — wire into any WebSocket server
- **Zero dependencies** — nothing extra installs
- **TypeScript support** — full `.d.ts` definitions included
- **167 tests** — 91.9% coverage

---

## Installation

```bash
npm install trade-data-generator
```

---

## The core idea

```javascript
const { MarketFeed } = require("trade-data-generator");

// Development — realistic fake data
const feed = new MarketFeed({
  source: "simulation", // default, can be omitted
  type: "crypto",
  pairs: [{ symbol: "BTC/USDT", startPrice: 45000 }],
});

// Production — real Binance data (one line change)
const feed = new MarketFeed({
  source: "binance", // switch source
  type: "crypto",
  pairs: [{ symbol: "BTC/USDT" }], // no startPrice needed
});

// Same events. Same format. Always.
feed.on("tick", (data) => console.log(data));
feed.on("candle", (data) => console.log(data));
feed.on("depth", (data) => console.log(data));

feed.start();
```

---

## Sources

### `simulation` (default)

Generates realistic synthetic market data locally.
No network calls. No API keys. Works offline.

```javascript
const feed = new MarketFeed({
  source: "simulation", // or omit — simulation is the default
  type: "crypto",
  pairs: [
    { symbol: "BTC/USDT", startPrice: 45000, volatility: 0.004 },
    { symbol: "ETH/USDT", startPrice: 2800, volatility: 0.005 },
    { symbol: "SOL/USDT", startPrice: 120, volatility: 0.008 },
  ],
});
```

### `binance`

Real-time market data from Binance public WebSocket.
No API key required.

```javascript
const feed = new MarketFeed({
  source: "binance",
  type: "crypto",
  pairs: [
    { symbol: "BTC/USDT" },
    { symbol: "ETH/USDT" },
    { symbol: "SOL/USDT" },
  ],
});
```

Streams per symbol:

- `@ticker` — price, volume, 24h stats
- `@depth10` — order book top 10 levels
- `@kline_*` — candles per interval

Auto-reconnect with exponential backoff included.

### Custom connectors

Build your own connector for any exchange or data source:

```javascript
const {
  MarketFeed,
  BaseConnector,
  registerConnector,
} = require("trade-data-generator");

class MyExchangeConnector extends BaseConnector {
  async connect() {
    /* open WebSocket */
  }
  async disconnect() {
    /* close WebSocket */
  }
  async subscribe(symbols) {
    /* subscribe to pairs */
  }
  async unsubscribe(symbols) {
    /* unsubscribe */
  }
  normalizeTick(raw) {
    /* convert to standard format */
  }
  normalizeCandle(raw) {
    /* convert to standard format */
  }
  normalizeDepth(raw) {
    /* convert to standard format */
  }
}

registerConnector("myexchange", MyExchangeConnector);

const feed = new MarketFeed({
  source: "myexchange",
  type: "crypto",
  pairs: [{ symbol: "BTC/USDT" }],
});
```

---

## WebSocket integration

The library emits events — you own the WebSocket server.
Works with Socket.io, ws, Pusher, Ably or any transport.

```javascript
const { MarketFeed } = require("trade-data-generator");
const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });

const feed = new MarketFeed({
  source: "binance",
  type: "crypto",
  pairs: [{ symbol: "BTC/USDT" }, { symbol: "ETH/USDT" }],
});

feed.on("tick", (data) => io.to(data.symbol).emit("ticker", data));
feed.on("candle", (data) => io.to(data.symbol).emit("candle", data));
feed.on("depth", (data) => io.to(data.symbol).emit("orderbook", data));

io.on("connection", (socket) => {
  socket.on("subscribe", ({ symbol }) => {
    socket.join(symbol);
    socket.emit("snapshot", feed.getState(symbol));
  });
  socket.on("unsubscribe", ({ symbol }) => {
    socket.leave(symbol);
  });
});

feed.start();
server.listen(3001);
```

---

## Market types

### Crypto — always open

```javascript
const feed = new MarketFeed({
  type: "crypto",
  pairs: [
    { symbol: "BTC/USDT", startPrice: 45000, volatility: 0.004, precision: 2 },
    { symbol: "ETH/USDT", startPrice: 2800, volatility: 0.005, precision: 2 },
  ],
});
```

### Equity — market hours

```javascript
const feed = new MarketFeed({
  type: "equity",
  marketHours: {
    open: "09:30",
    close: "16:00",
    timezone: "America/New_York",
    days: [1, 2, 3, 4, 5],
  },
  pairs: [
    { symbol: "AAPL", startPrice: 175.5, volatility: 0.002, precision: 2 },
    { symbol: "GOOGL", startPrice: 142.3, volatility: 0.003, precision: 2 },
  ],
});
```

### Forex — pip precision

```javascript
const feed = new MarketFeed({
  type: "forex",
  marketHours: {
    open: "00:00",
    close: "23:59",
    timezone: "UTC",
    days: [1, 2, 3, 4, 5],
  },
  pairs: [
    { symbol: "EUR/USD", startPrice: 1.0845, volatility: 0.0003, precision: 5 },
    { symbol: "GBP/USD", startPrice: 1.2678, volatility: 0.0004, precision: 5 },
    { symbol: "USD/JPY", startPrice: 149.85, volatility: 0.0002, precision: 3 },
  ],
});
```

---

## Events

```javascript
feed.on("tick", (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   type:      'crypto',
  //   source:    'binance',
  //   timestamp:  1714900000000,
  //   price:      80920.00,
  //   bid:        80920.00,
  //   ask:        80920.01,
  //   spread:     0.01,
  //   volume:     14376.18,
  //   change:     +88.68,
  //   changePct:  +0.11,
  //   high24h:    82479.32,
  //   low24h:     80279.77,
  //   open24h:    80831.32,
  //   previous:   80919.99,
  // }
});

feed.on("candle", (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   interval:  '1m',
  //   openTime:  1714900000000,
  //   closeTime: 1714900060000,
  //   open:      80900.00,
  //   high:      80950.00,
  //   low:       80880.00,
  //   close:     80920.00,
  //   volume:    42.18,
  //   closed:    true,
  //   source:    'binance',
  // }
});

feed.on("depth", (data) => {
  // {
  //   symbol:    'BTC/USDT',
  //   timestamp:  1714900000000,
  //   source:    'binance',
  //   bids: [{ price, volume, side }, ...10 levels],
  //   asks: [{ price, volume, side }, ...10 levels],
  // }
});

feed.on("open", (info) => {}); // market opened (equity/forex)
feed.on("closed", (info) => {}); // market closed (equity/forex)
feed.on("error", (err) => {}); // error on a symbol
```

---

## Configuration

### MarketFeed options

| Option            | Type       | Default        | Description                             |
| ----------------- | ---------- | -------------- | --------------------------------------- |
| `source`          | `string`   | `'simulation'` | `'simulation'` \| `'binance'` \| custom |
| `type`            | `string`   | required       | `'crypto'` \| `'forex'` \| `'equity'`   |
| `pairs`           | `Array`    | required       | Array of pair configs                   |
| `interval`        | `number`   | `1000`         | Ms between ticks (simulation only)      |
| `candleIntervals` | `string[]` | `['1m']`       | Candle intervals to track               |
| `depth`           | `number`   | `10`           | Order book levels each side             |
| `maxCandles`      | `number`   | `1000`         | Max candle history (simulation only)    |
| `marketHours`     | `Object`   | —              | Required for `equity` and `forex`       |

### Pair options

| Option       | Type     | Required        | Description                  |
| ------------ | -------- | --------------- | ---------------------------- |
| `symbol`     | `string` | always          | e.g. `'BTC/USDT'`            |
| `startPrice` | `number` | simulation only | Initial price                |
| `volatility` | `number` | —               | Max % move per tick          |
| `trend`      | `number` | —               | Drift per tick               |
| `precision`  | `number` | —               | Decimal places               |
| `tickSize`   | `number` | —               | Minimum price increment      |
| `spreadPct`  | `number` | —               | Bid/ask spread as % of price |
| `volume`     | `Object` | —               | `{ min: 100, max: 10000 }`   |

### Candle intervals

`'1s'` `'1m'` `'5m'` `'15m'` `'1h'` `'4h'` `'1d'`

---

## API

```javascript
feed.start(); // Start feed
feed.stop(); // Stop completely
feed.pause(); // Pause (simulation only)
feed.resume(); // Resume after pause

feed.getState(symbol); // Current state for symbol
feed.getCandles(symbol, interval, limit); // Candle history (simulation)
feed.getSymbols(); // All symbol names
feed.getMarketStatus(); // Market open/close status
feed.getSource(); // Active source name

feed.reset(symbol); // Reset symbol (simulation)
feed.resetAll(); // Reset all (simulation)
feed.isRunning(); // true | false

// Register custom connector
registerConnector("myexchange", MyConnectorClass);

// List available sources
getAvailableSources(); // ['simulation', 'binance', ...]
```

---

## Examples

```bash
node examples/crypto.js    # Simulation — crypto
node examples/equity.js    # Simulation — US stocks
node examples/forex.js     # Simulation — forex pairs
```

---

## Changelog

### v3.0.0

- Connector architecture — pluggable data sources
- `source` option — `'simulation'` | `'binance'` | custom
- Binance connector — real-time data, no API key needed
- `BaseConnector` — extend to build your own connector
- `registerConnector()` — register custom connectors
- `getAvailableSources()` — list available sources
- `getSource()` — get active source name
- `source` field added to all events
- Fully backward compatible — existing code works unchanged

### v2.0.0

- Complete rewrite — EventEmitter API
- Accurate order book, mean reversion price engine
- Multiple candle intervals, market hours
- Zero dependencies, TypeScript support

---

## Contributing

We welcome connectors for new exchanges and data sources.

1. Fork the repository
2. Create `src/connectors/yourexchange.js`
3. Extend `BaseConnector`
4. Add tests in `test/`
5. Open a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

---

## Author

**Love Pareek** — [monupareeklg@gmail.com](mailto:monupareeklg@gmail.com)  
GitHub: [monupareeklg](https://github.com/monupareeklg)  
Contributor: [Kush Pareek](https://github.com/kushpareek)

---

## License

MIT — see [LICENSE](./LICENSE)

---

⭐️ If this saved you time, star it on [GitHub](https://github.com/monupareeklg/trade-data-generator)!
