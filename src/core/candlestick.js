function cacheOHLCData(context, newCandle) {
    context.client.lPush(context.config.ohlcCacheKey, JSON.stringify(newCandle));
    context.client.lTrim(context.config.ohlcCacheKey, 0, 999);
  
    context.ohlcData.push(newCandle);
    if (context.ohlcData.length > 1000) context.ohlcData.shift();
  }
  
  function updateCandlestick(context, tradePrice, tradeVolume) {
    const candlestick = context.currentCandlestick;
  
    if (!candlestick.open) candlestick.open = tradePrice;
    candlestick.close = tradePrice;
    candlestick.high = Math.max(candlestick.high, tradePrice);
    candlestick.low = Math.min(candlestick.low, tradePrice);
    candlestick.volume += tradeVolume;
  
    if (Date.now() - candlestick.timestamp >= 30000) {
      const newCandle = { ...candlestick };
      cacheOHLCData(context, newCandle);
      context.currentCandlestick = context.createEmptyCandlestick();
    }
  }
  
  module.exports = { cacheOHLCData, updateCandlestick };
  