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

  // Simulate trade and update market data
  simulateTrade() {
    simulateTrade(this);
  }

  // Generate market depth
  getMarketDepth() {
    return generateMarketDepth(this.middlePrice);
  }

  // Get current market stats
  getMarketStats() {
    return {
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

  // Generate candlesticks and update Redis cache
  generateCandlestick(tradePrice, tradeVolume) {
    updateCandlestick(this, tradePrice, tradeVolume);
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
