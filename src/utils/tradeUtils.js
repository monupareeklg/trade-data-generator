const BigNumber = require("bignumber.js");

module.exports.tradeUtils = {
  generateControlledPrice(middlePrice, highPriceLimit, lowPriceLimit) {
    const randomJump = (Math.random() - 0.5) * 0.2; // +/- 0.1 range for jumps
    let newPrice = new BigNumber(middlePrice).plus(randomJump);

    // Clamp the price within the allowed range
    if (newPrice.isGreaterThan(highPriceLimit)) {
      newPrice = new BigNumber(highPriceLimit);
    } else if (newPrice.isLessThan(lowPriceLimit)) {
      newPrice = new BigNumber(lowPriceLimit);
    }

    return parseFloat(newPrice.toFixed(5)); // Return formatted price
  },

  generateRandomVolume: (maxVolume = 10) => {
    return Math.random() * maxVolume;
  },
};
