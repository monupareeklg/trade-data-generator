const { tradeUtils } = require("../utils/tradeUtils");

function simulateTrade(context) {
  const { precision, highPriceLimit, lowPriceLimit } = context;

  // Generate a new price within the allowed range
  let tradePrice = tradeUtils.generateControlledPrice(
    context.middlePrice,
    highPriceLimit,
    lowPriceLimit
  );
  tradePrice = parseFloat(tradePrice.toFixed(precision)); 

  let tradeVolume = tradeUtils.generateRandomVolume();
  tradeVolume = parseFloat(tradeVolume.toFixed(precision)); // Apply precision to trade volume

  context.highPrice = Math.max(context.highPrice, tradePrice);
  context.lowPrice = Math.min(context.lowPrice, tradePrice);
  context.volume += tradeVolume;

  context.executedTrades.unshift({
    price: tradePrice,
    volume: tradeVolume,
    time: new Date().toISOString(),
  });

  if (context.executedTrades.length > 20) {
    context.executedTrades.pop();
  }
  // Update the middle price for the next trade
  context.middlePrice = tradePrice;
}

function generateMarketDepth(basePrice, stepSize, precision) {
  const generateOrders = (side) => {
    const orders = [];
    const increment = side === "buy" ? -stepSize : stepSize;

    for (let i = 0; i < 10; i++) {
      const price = basePrice + i * increment;
      const volume = Math.random() * 100;

      orders.push({
        price: parseFloat(price.toFixed(precision)), // Apply precision
        volume: parseFloat(volume.toFixed(precision)), // Apply precision
      });
    }
    return orders;
  };

  return {
    buyOrders: generateOrders("buy"),
    sellOrders: generateOrders("sell"),
  };
}

module.exports = { simulateTrade, generateMarketDepth };
