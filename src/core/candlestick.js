function cacheOHLCData(context, newCandle) {
  // Add the new candlestick to the in-memory array
  context.ohlcData.push(newCandle);

  // Limit the array size to 1000 entries
  if (context.ohlcData.length > 1000) {
    context.ohlcData.shift();
  }
}

function updateCandlestick(context, tradePrice, tradeVolume,createEmptyCandlestick) {
  const candlestick = context.currentCandlestick;

  // Update the current candlestick with trade data
  if (!candlestick.open) candlestick.open = tradePrice;
  candlestick.close = tradePrice;
  candlestick.high = Math.max(candlestick.high, tradePrice);
  candlestick.low = Math.min(candlestick.low, tradePrice);
  candlestick.volume += tradeVolume;

  // Check if the current candlestick duration has elapsed (e.g., 30 seconds)
  if (Date.now() - candlestick.timestamp >= 30000) {
    const newCandle = { ...candlestick };

    // Cache the completed candlestick in the ohlcData array
    cacheOHLCData(context, newCandle);

    // Reset the current candlestick for the next interval
    // Reset the current candlestick for the next interval
    context.currentCandlestick = createEmptyCandlestick();
  }
}

module.exports = { cacheOHLCData, updateCandlestick };
