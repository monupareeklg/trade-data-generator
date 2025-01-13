const {
  equityMarketHours,
  forexMarketHours,
} = require("../models/marketHours");

function isMarketOpen(marketType, region = null, timezoneOffset = 0) {
  const nowUTC = new Date();
  const hourUTC =
    nowUTC.getUTCHours() + nowUTC.getMinutes() / 60 + timezoneOffset;

  if (marketType === "crypto") return true; // Crypto is always open

  if (marketType === "forex") {
    return forexMarketHours.some(({ open, close }) =>
      close < open
        ? hourUTC >= open || hourUTC < close
        : hourUTC >= open && hourUTC < close
    );
  }

  if (marketType === "equity") {
    if (!region || !equityMarketHours[region]) {
      throw new Error("Invalid or missing equity market region.");
    }
    const { open, close } = equityMarketHours[region];
    return close < open
      ? hourUTC >= open || hourUTC < close
      : hourUTC >= open && hourUTC < close;
  }

  return false;
}

module.exports = { isMarketOpen };
