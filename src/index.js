const Redis = require("redis");
const { simulateTrade, generateMarketDepth } = require("./core/trade");
const { updateCandlestick } = require("./core/candlestick");
const { formatDecimal } = require("./utils/decimalFormatter");
const config = require("./config");

class MarketDepthGenerator {
  constructor(userConfig = {}) {
    this.config = {
      ...config,
      ...userConfig,
      highPriceLimit: userConfig.highPriceLimit || config.middlePrice * 1.02,
      lowPriceLimit: userConfig.lowPriceLimit || config.middlePrice * 0.98,
    };
    this.client = Redis.createClient({
      socket: {
        host: this.config.redisHost,
        port: this.config.redisPort,
      },
    });
    this.symbols = {}; // Store data for multiple symbols
    this.initSymbols(userConfig.symbols || ["BTC/USD"]); // Initialize with default symbol
    this.middlePrice = this.config.middlePrice;
    this.currentCandlestick = this.createEmptyCandlestick();
    this.executedTrades = [];
    this.highPrice = this.config.middlePrice;
    this.lowPrice = this.config.middlePrice;
    this.volume = 0;
  }

  // Initialize multiple symbols
  initSymbols(symbols) {
    symbols.forEach((symbol) => {
      this.symbols[symbol] = {
        middlePrice: this.config.middlePrice,
        highPriceLimit:
          this.config.highPriceLimit || this.config.middlePrice * 1.02, // Default to 2% above middlePrice
        lowPriceLimit:
          this.config.lowPriceLimit || this.config.middlePrice * 0.98, // Default to 2% below middlePrice
        currentCandlestick: this.createEmptyCandlestick(),
        executedTrades: [],
        highPrice: this.config.middlePrice,
        lowPrice: this.config.middlePrice,
        volume: 0,
        ohlcData: [], // Initialize ohlcData as an empty array
      };
    });
  }

  // Simulate trade for a specific symbol
  simulateTrade(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    simulateTrade(this.symbols[symbol]);

    // Generate and cache the candlestick data
    this.generateCandlestick(
      symbol,
      this.symbols[symbol].middlePrice,
      Math.random() * 100
    );
  }

  // Simulate trades for all symbols
  simulateAllTrades() {
    Object.keys(this.symbols).forEach((symbol) => {
      this.simulateTrade(symbol);
    });
  }

  // Generate market depth for a specific symbol
  getMarketDepth(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    return generateMarketDepth(this.symbols[symbol].middlePrice);
  }

  // Get stats for a specific symbol
  getMarketStats(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    const data = this.symbols[symbol];
    return {
      lastPrice: formatDecimal(data.middlePrice),
      priceChange: formatDecimal(
        data.middlePrice - this.config.oneDayBeforePrice
      ),
      percentageChange: formatDecimal(
        ((data.middlePrice - this.config.oneDayBeforePrice) /
          this.config.oneDayBeforePrice) *
          100
      ),
      highPrice: formatDecimal(data.highPrice),
      lowPrice: formatDecimal(data.lowPrice),
      volume: formatDecimal(data.volume),
      executedTrades: data.executedTrades.map((trade) => ({
        ...trade,
        price: formatDecimal(trade.price),
        volume: formatDecimal(trade.volume, 2),
      })),
    };
  }

  // Retrieve candlestick data for a specific symbol
  getCandlestickData(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }

    const data = this.symbols[symbol];
    return {
      ohlcData: data.ohlcData || [], // Return cached candlestick data
    };
  }

  // Generate candlesticks for a specific symbol
  generateCandlestick(symbol, tradePrice, tradeVolume) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    updateCandlestick(
      this.symbols[symbol],
      formatDecimal(tradePrice),
      formatDecimal(tradeVolume),
      this.createEmptyCandlestick.bind(this) // Pass the method explicitly
    );
    // Store the updated candlestick data
    const data = this.symbols[symbol];
    const newCandle = {
      ...data.currentCandlestick,
      close: formatDecimal(tradePrice),
      volume: formatDecimal(tradeVolume),
    };
    data.ohlcData.push(newCandle);

    // Limit the candlestick array to 1000 entries
    if (data.ohlcData.length > 1000) {
      data.ohlcData.shift();
    }
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
