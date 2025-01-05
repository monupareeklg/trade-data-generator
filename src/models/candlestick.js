class Candlestick {
  constructor() {
    this.open = null;
    this.high = -Infinity;
    this.low = Infinity;
    this.close = null;
    this.volume = 0;
    this.timestamp = Date.now();
  }
}

module.exports = Candlestick;
