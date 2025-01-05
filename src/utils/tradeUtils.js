module.exports.tradeUtils = {
  generateRandomPrice: (basePrice, variation = 0.2) => {
    return basePrice + (Math.random() - 0.5) * variation;
  },

  generateRandomVolume: (maxVolume = 10) => {
    return Math.random() * maxVolume;
  },
};
