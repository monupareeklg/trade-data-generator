const { tradeUtils } = require("../utils/tradeUtils");

function simulateTrade(context) {
  // Generate a new price within the allowed range
  const tradePrice = tradeUtils.generateControlledPrice(
    context.middlePrice,
    context.highPriceLimit,
    context.lowPriceLimit
  );
  const tradeVolume = tradeUtils.generateRandomVolume();

  context.highPrice = Math.max(context.highPrice, tradePrice);
  context.lowPrice = Math.min(context.lowPrice, tradePrice);
  context.volume += tradeVolume;

  context.executedTrades.unshift({
    price: tradePrice.toFixed(5),
    volume: tradeVolume.toFixed(4),
    time: new Date().toISOString(),
  });

  if (context.executedTrades.length > 20) {
    context.executedTrades.pop();
  }
  // Update the middle price for the next trade
  context.middlePrice = tradePrice;
}

function generateMarketDepth(basePrice) {
  const generateOrders = (side) => {
    const orders = [];
    const increment = side === "buy" ? -0.0001 : 0.0001;

    for (let i = 0; i < 10; i++) {
      orders.push({
        price: (basePrice + i * increment).toFixed(5),
        volume: (Math.random() * 100).toFixed(4),
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
