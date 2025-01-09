# trade-data-generator

[![npm version](https://img.shields.io/npm/v/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)
[![license](https://img.shields.io/npm/l/trade-data-generator.svg)](https://github.com/monupareeklg/trade-data-generator/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/trade-data-generator.svg)](https://www.npmjs.com/package/trade-data-generator)

**Market Depth Generator** is a lightweight library for simulating market depth, trade data, and OHLC candlesticks. Designed for trading platforms and financial applications, it generates realistic trading data with customizable configurations.

---

## 🌟 Features

- Simulate **Market Depth** with dynamic buy and sell orders.
- Generate **OHLC Candlesticks** (Open, High, Low, Close) with customizable intervals.
- Track **Executed Trades** in real-time.
- Redis support for caching candlestick data.
- Multi-symbol support for crypto.
- WebSocket integration for real-time updates.
- Fully customizable and developer-friendly.

---

## 🚀 Installation

Install via npm:

```bash
npm install market-depth-generator
```

## 🛠️ Usage

### 1. Basic Example

Create a simple WebSocket server that generates and serves market depth and trade data:

```javascript
const MarketDepthGenerator = require("market-depth-generator");
const express = require("express");
const WebSocket = require("ws");

const PORT = 8080;
const app = express();

// Initialize the MarketDepthGenerator
const generator = new MarketDepthGenerator({
  redisHost: "127.0.0.1",
  redisPort: 6379,
  symbols: ["BTCUSD", "ETHUSD"], // Add multiple symbols
  middlePrice: 305.12, // Base price for simulation
});

(async () => {
  await generator.init(); // Initialize the generator
  setInterval(() => {
    generator.simulateTrade("BTCUSDT");
  }, 1000);
})();

// HTTP API for fetching market depth for a specific symbol
app.get("/api/market-depth/:symbol", (req, res) => {
  const symbol = req.params.symbol;
  try {
    const depth = generator.getMarketDepth(symbol);
    res.json(depth);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// HTTP API for fetching market stats for a specific symbol
app.get("/api/market-stats/:symbol", (req, res) => {
  const symbol = req.params.symbol;
  try {
    const stats = generator.getMarketStats(symbol);
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const sendMarketUpdates = setInterval(() => {
    const updates = {};

    Object.keys(generator.symbols).forEach((symbol) => {
      updates[symbol] = {
        depth: generator.getMarketDepth(symbol),
        stats: generator.getMarketStats(symbol),
      };
    });

    ws.send(JSON.stringify(updates));
  }, 2500);

  ws.on("close", () => {
    clearInterval(sendMarketUpdates);
    console.log("Client disconnected");
  });
});
```

Run the script and connect a WebSocket client to view the live simulation data.

### 2. Custom Configuration

Customize the generator by passing your own configuration:

```javascript
const generator = new MarketDepthGenerator({
  redisHost: "your-redis-host",
  redisPort: 6379,
  middlePrice: "<your-price>",
});
```

---

## 📡 Output

The WebSocket server broadcasts the following JSON structure:

```json
{
  "BTCUSD": {
    "marketDepth": {
      "buyOrders": [
        { "price": "1.23456", "quantity": "10.1234" },
        { "price": "1.23450", "quantity": "5.4321" }
      ],
      "sellOrders": [
        { "price": "1.23470", "quantity": "8.5678" },
        { "price": "1.23480", "quantity": "3.2100" }
      ]
    },
    "lastPrice": "1.23456",
    "priceChange": "0.00010",
    "percentageChange": "0.81",
    "highPrice": "1.23480",
    "lowPrice": "1.23450",
    "volume": "123.45",
    "executedTrades": [
      { "price": "1.23460", "volume": "10.1234", "time": "12:34:56" },
      { "price": "1.23450", "volume": "5.6789", "time": "12:35:12" }
    ]
  },
  "ETHUSD": {
    // Similar structure for ETHUSD
  }
}
```

---

## 📖 Documentation

### Configuration Options

| Option               | Type   | Default       | Description                             |
| -------------------- | ------ | ------------- | --------------------------------------- |
| `redisHost`          | String | `127.0.0.1`   | Redis server hostname.                  |
| `redisPort`          | Number | `6379`        | Redis server port.                      |
| `symbols`            | Array  | `['BTCUSDT']` | List of symbols for simulation.         |
| `middlePrice`        | Number | `305.12`      | Base price for market simulation.       |
| `simulationInterval` | Number | `1000`        | Interval (ms) for simulating trades.    |
| `updateInterval`     | Number | `2500`        | Interval (ms) for broadcasting updates. |

---

## 🧪 Testing

Run tests using Jest:

```
npm test
```

---

## 📌 TODOs

- [x] Add support for multiple symbols.
- [ ] Extend candlestick intervals beyond 1 minute.
- [ ] Add more realistic trade simulations.
- [ ] Implement better test coverage for edge cases.
- [ ] Add support for WebSocket authentication.

---

## 🌟 What's New

- **Multi-symbol support**: Simulate multiple symbols like `BTCUSD` and `ETHUSD`.
- **Real-time WebSocket updates**: Get live updates for depth and stats.
- **24-hour stats tracking**: Includes price change, percentage change, and volume.

---

## 👤 Author

- **Love Pareek**
- GitHub: [monupareeklg](https://github.com/monupareeklg)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/monupareeklg/trade-data-generator/blob/master/LICENSE) file for details.

---

## 🛠️ Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add a new feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Submit a pull request.

Make sure your code is clean and well-documented before submitting. We appreciate your contributions!

---

## 🌟 Support

If you like this project, please give it a ⭐️ on [GitHub](https://github.com/monupareeklg/trade-data-generator)!

For issues, feel free to open a ticket on the [GitHub issues page](https://github.com/monupareeklg/trade-data-generator/issues).

Need help or have questions? Contact me at **monupareeklg@gmail.com**.
