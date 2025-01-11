const { tradeUtils } = require("../utils/tradeUtils");
const { formatDecimal } = require("../utils/decimalFormatter");

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
    price: formatDecimal(tradePrice),
    volume: formatDecimal(tradeVolume),
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
        price: formatDecimal(basePrice + i * increment),
        volume: formatDecimal(Math.random() * 100),
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
