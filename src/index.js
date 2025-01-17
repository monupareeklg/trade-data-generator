const { simulateTrade, generateMarketDepth } = require("./core/trade");
const { updateCandlestick } = require("./core/candlestick");
const { formatDecimal } = require("./utils/decimalFormatter");
const config = require("./config");
const { isMarketOpen } = require("./core/marketStatus");

class MarketDepthGenerator {
  constructor(userConfig = {}) {
    this.config = {
      ...config,
      ...userConfig,
      highPriceLimit: userConfig.highPriceLimit || config.middlePrice * 1.02,
      lowPriceLimit: userConfig.lowPriceLimit || config.middlePrice * 0.98,
    };
    this.marketRegion = userConfig.marketRegion || null;
    this.timezoneOffset =
      userConfig.timezoneOffset || config.defaultTimezoneOffset;
    this.symbols = {}; // Store data for multiple symbols
    this.initSymbols(userConfig.symbols || ["BTC/USD"]); // Initialize with default symbol
    this.middlePrice = this.config.middlePrice;
    this.marketType = userConfig.marketType || "crypto"; // Default to crypto
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
        precision: this.config.precision?.[symbol] || 2, // Default to 2 decimal places
        stepSize: this.config.stepSize?.[symbol] || 0.01, // Default step size
        maxTradeVolume: this.config.maxTradeVolume?.[symbol] || 100, // Default max volume
        minTradeVolume: this.config.minTradeVolume?.[symbol] || 0.01, // Default min volume
        currentCandlestick: this.createEmptyCandlestick(),
        executedTrades: [],
        highPrice: this.config.middlePrice,
        lowPrice: this.config.middlePrice,
        volume: 0,
        ohlcData: [], // Initialize ohlcData as an empty array
      };
    });
  }

  checkMarketStatus() {
    return isMarketOpen(
      this.marketType,
      this.marketRegion,
      this.timezoneOffset
    );
  }

  // Simulate trade for a specific symbol
  simulateTrade(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }

    // Check if the market is open
    const isOpen = this.checkMarketStatus();
    if (!isOpen) {
      throw new Error(`Market is currently closed for ${this.marketType}.`);
    }

    const symbolData = this.symbols[symbol];
    const {
      stepSize,
      maxTradeVolume,
      minTradeVolume,
      precision,
      highPriceLimit,
      lowPriceLimit,
    } = symbolData;
    // Calculate the new trade price
    let tradePrice = symbolData.middlePrice + stepSize * (Math.random() - 0.5);
    tradePrice = Math.max(Math.min(tradePrice, highPriceLimit), lowPriceLimit); // Bound by limits
    tradePrice = parseFloat(tradePrice.toFixed(precision)); // Apply precision

    // Update the middle price
    symbolData.middlePrice = tradePrice;

    let tradeVolume = Math.random() * maxTradeVolume;
    tradeVolume = Math.max(tradeVolume, minTradeVolume);
    tradeVolume = parseFloat(tradeVolume.toFixed(precision));
    simulateTrade(symbolData);

    // Update candlestick and OHLC data
    this.generateCandlestick(symbol, tradePrice, tradeVolume);
  }

  // Simulate trades for all symbols
  simulateAllTrades() {
    // Check if the market is open
    const isOpen = this.checkMarketStatus();
    if (!isOpen) {
      throw new Error(`Market is currently closed for ${this.marketType}.`);
    }
    Object.keys(this.symbols).forEach((symbol) => {
      this.simulateTrade(symbol);
    });
  }

  // Generate market depth for a specific symbol
  getMarketDepth(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    const { middlePrice, stepSize, precision } = this.symbols[symbol];

    const depth = generateMarketDepth(middlePrice, stepSize, precision);
    // Apply precision to market depth
    depth.buyOrders.forEach((order) => {
      order.price = parseFloat(order.price).toFixed(
        this.symbols[symbol].precision
      );
      order.volume = parseFloat(order.volume).toFixed(
        this.symbols[symbol].precision
      );
    });

    depth.sellOrders.forEach((order) => {
      order.price = parseFloat(order.price).toFixed(
        this.symbols[symbol].precision
      );
      order.volume = parseFloat(order.volume).toFixed(
        this.symbols[symbol].precision
      );
    });

    return depth;
  }

  // Get stats for a specific symbol
  getMarketStats(symbol) {
    if (!this.symbols[symbol]) {
      throw new Error(`Symbol "${symbol}" is not initialized.`);
    }
    const data = this.symbols[symbol];
    const { precision } = data; // Use precision specific to the symbol
    return {
      lastPrice: formatDecimal(data.middlePrice, precision),
      priceChange: formatDecimal(
        data.middlePrice - this.config.oneDayBeforePrice,
        precision
      ),
      percentageChange: formatDecimal(
        ((data.middlePrice - this.config.oneDayBeforePrice) /
          this.config.oneDayBeforePrice) *
          100,
        precision
      ),
      highPrice: formatDecimal(data.highPrice, precision),
      lowPrice: formatDecimal(data.lowPrice, precision),
      volume: formatDecimal(data.volume, precision),
      executedTrades: data.executedTrades.map((trade) => ({
        ...trade,
        price: formatDecimal(trade.price, precision),
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
