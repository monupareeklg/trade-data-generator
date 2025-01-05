const Redis = require("redis");
const { simulateTrade, generateMarketDepth } = require("./core/trade");
const { cacheOHLCData, updateCandlestick } = require("./core/candlestick");
const { redisHelper } = require("./utils/redisHelper");
const config = require("./config");

class MarketDepthGenerator {
  constructor(userConfig = {}) {
    this.config = { ...config, ...userConfig };
    this.client = Redis.createClient({
      socket: {
        host: this.config.redisHost,
        port: this.config.redisPort,
      },
    });
    this.middlePrice = this.config.middlePrice;
    this.currentCandlestick = this.createEmptyCandlestick();
    this.executedTrades = [];
    this.highPrice = this.config.middlePrice;
    this.lowPrice = this.config.middlePrice;
    this.volume = 0;
  }

  async init() {
    await redisHelper.connect(this.client);
    console.log("Redis connected!");
  }

  startServer() {
    const WebSocket = require("ws");
    const server = require("http").createServer();
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
      console.log("Client connected");
      setInterval(() => simulateTrade(this), 1000);

      setInterval(() => {
        const marketDepth = generateMarketDepth(this.config.middlePrice);
        ws.send(JSON.stringify(this.getUpdatePayload(marketDepth)));
      }, 2500);
    });

    server.listen(this.config.port, () => {
      console.log(`Server running on port ${this.config.port}`);
    });
  }

  getUpdatePayload(marketDepth) {
    return {
      marketDepth,
      lastPrice: this.middlePrice,
      priceChange: (this.middlePrice - this.config.oneDayBeforePrice).toFixed(
        5
      ),
      percentageChange: (
        ((this.middlePrice - this.config.oneDayBeforePrice) /
          this.config.oneDayBeforePrice) *
        100
      ).toFixed(2),
      highPrice: this.highPrice,
      lowPrice: this.lowPrice,
      volume: this.volume.toFixed(2),
      executedTrades: this.executedTrades,
    };
  }

  createEmptyCandlestick() {
    return {
      open: null,
      high: -Infinity,
      low: Infinity,
      close: null,
      volume: 0,
      timestamp: Date.now(),
    };
  }
}

module.exports = MarketDepthGenerator;
