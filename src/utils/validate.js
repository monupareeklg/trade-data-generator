/**
 * validate.js
 *
 * Input validation for MarketFeed config.
 * Throws clear, actionable errors before anything starts.
 * No silent failures like old code.
 */

"use strict";

const { MARKET_TYPES } = require("../core/marketClock");
const { INTERVALS } = require("../core/candleManager");

/**
 * Validate the full MarketFeed config
 * @param {Object} config
 * @throws {Error} with clear message if invalid
 */
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error(
      "[MarketFeed] Config is required.\n" +
        "Example:\n" +
        '  new MarketFeed({ type: "crypto", pairs: [...] })',
    );
  }

  _validateType(config.type);
  _validateMarketHours(config.type, config.marketHours);
  _validateInterval(config.interval);
  _validateCandleIntervals(config.candleIntervals);
  _validatePairs(config.pairs, config.source ?? "simulation");
}

/**
 * Validate a single pair config
 * @param {Object} pair
 * @param {number} index - position in pairs array (for error messages)
 * @throws {Error}
 */
function validatePair(pair, index = 0, source = "simulation") {
  const prefix = `[MarketFeed] pairs[${index}]`;

  if (!pair || typeof pair !== "object") {
    throw new Error(`${prefix} must be an object.`);
  }

  // symbol
  if (!pair.symbol || typeof pair.symbol !== "string") {
    throw new Error(
      `${prefix}.symbol is required and must be a string.\n` +
        `Example: { symbol: 'BTC/USDT', startPrice: 45000 }`,
    );
  }

  if (pair.symbol.trim().length === 0) {
    throw new Error(`${prefix}.symbol cannot be empty.`);
  }

  // startPrice
  if (source === "simulation" || source === undefined) {
    if (pair.startPrice === undefined || pair.startPrice === null) {
      throw new Error(
        `${prefix}.startPrice is required for simulation.\n` +
          `Example: { symbol: '${pair.symbol}', startPrice: 45000 }\n` +
          `Using a live connector? Set source: 'binance' and remove startPrice.`,
      );
    }

    if (typeof pair.startPrice !== "number" || isNaN(pair.startPrice)) {
      throw new Error(
        `${prefix}.startPrice must be a number. ` + `Got: ${pair.startPrice}`,
      );
    }

    if (pair.startPrice <= 0) {
      throw new Error(
        `${prefix}.startPrice must be greater than 0. ` +
          `Got: ${pair.startPrice}`,
      );
    }
  }

  // volatility (optional)
  if (pair.volatility !== undefined) {
    if (typeof pair.volatility !== "number" || isNaN(pair.volatility)) {
      throw new Error(
        `${prefix}.volatility must be a number. ` + `Got: ${pair.volatility}`,
      );
    }
    if (pair.volatility <= 0 || pair.volatility >= 1) {
      throw new Error(
        `${prefix}.volatility must be between 0 and 1 (exclusive).\n` +
          `Example: 0.002 = 0.2% max move per tick. Got: ${pair.volatility}`,
      );
    }
  }

  // trend (optional)
  if (pair.trend !== undefined) {
    if (typeof pair.trend !== "number" || isNaN(pair.trend)) {
      throw new Error(`${prefix}.trend must be a number. Got: ${pair.trend}`);
    }
    if (Math.abs(pair.trend) >= 1) {
      throw new Error(
        `${prefix}.trend should be a small number close to 0.\n` +
          `Example: 0.0001 (slight up), -0.0001 (slight down). Got: ${pair.trend}`,
      );
    }
  }

  // precision (optional)
  if (pair.precision !== undefined) {
    if (
      typeof pair.precision !== "number" ||
      !Number.isInteger(pair.precision) ||
      pair.precision < 0 ||
      pair.precision > 10
    ) {
      throw new Error(
        `${prefix}.precision must be an integer between 0 and 10. ` +
          `Got: ${pair.precision}`,
      );
    }
  }

  // tickSize (optional)
  if (pair.tickSize !== undefined) {
    if (typeof pair.tickSize !== "number" || pair.tickSize <= 0) {
      throw new Error(
        `${prefix}.tickSize must be a positive number. ` +
          `Got: ${pair.tickSize}`,
      );
    }
  }

  // volume (optional)
  if (pair.volume !== undefined) {
    _validateVolumeConfig(pair.volume, prefix);
  }

  // minPrice / maxPrice (optional)
  if (pair.minPrice !== undefined && pair.minPrice <= 0) {
    throw new Error(
      `${prefix}.minPrice must be greater than 0. Got: ${pair.minPrice}`,
    );
  }

  if (pair.maxPrice !== undefined && pair.minPrice !== undefined) {
    if (pair.maxPrice <= pair.minPrice) {
      throw new Error(
        `${prefix}.maxPrice must be greater than minPrice.\n` +
          `Got: minPrice=${pair.minPrice}, maxPrice=${pair.maxPrice}`,
      );
    }
  }

  if (pair.maxPrice !== undefined && pair.maxPrice <= pair.startPrice * 0.1) {
    throw new Error(
      `${prefix}.maxPrice seems too low relative to startPrice.\n` +
        `startPrice=${pair.startPrice}, maxPrice=${pair.maxPrice}`,
    );
  }
}

// ── Private validators ─────────────────────── //

function _validateType(type) {
  const valid = Object.values(MARKET_TYPES);

  if (!type) {
    throw new Error(
      `[MarketFeed] type is required.\n` +
        `Valid values: ${valid.join(", ")}\n` +
        `Example: { type: 'crypto', ... }`,
    );
  }

  if (!valid.includes(type)) {
    throw new Error(
      `[MarketFeed] Invalid type "${type}".\n` +
        `Valid values: ${valid.join(", ")}`,
    );
  }
}

function _validateMarketHours(type, marketHours) {
  // Crypto doesn't need market hours
  if (type === MARKET_TYPES.CRYPTO) {
    if (marketHours) {
      console.warn(
        "[MarketFeed] marketHours is ignored for crypto — " +
          "crypto markets are always open.",
      );
    }
    return;
  }

  // Forex and equity require market hours
  if (!marketHours) {
    throw new Error(
      `[MarketFeed] marketHours is required for type "${type}".\n` +
        `Example:\n` +
        `  marketHours: {\n` +
        `    open: '09:30',\n` +
        `    close: '16:00',\n` +
        `    timezone: 'America/New_York'\n` +
        `  }`,
    );
  }

  if (typeof marketHours !== "object") {
    throw new Error("[MarketFeed] marketHours must be an object.");
  }
}

function _validateInterval(interval) {
  if (interval === undefined) return; // optional, has default

  if (typeof interval !== "number" || isNaN(interval)) {
    throw new Error(
      `[MarketFeed] interval must be a number (milliseconds).\n` +
        `Example: 1000 = 1 tick per second. Got: ${interval}`,
    );
  }

  if (interval < 100) {
    throw new Error(
      `[MarketFeed] interval must be at least 100ms to avoid overwhelming consumers.\n` +
        `Got: ${interval}ms`,
    );
  }

  if (interval > 60 * 60 * 1000) {
    console.warn(
      `[MarketFeed] interval is ${interval}ms (${interval / 1000}s). ` +
        `This is quite slow — is this intentional?`,
    );
  }
}

function _validateCandleIntervals(candleIntervals) {
  if (candleIntervals === undefined) return; // optional

  const valid = Object.keys(INTERVALS);

  if (!Array.isArray(candleIntervals)) {
    throw new Error(
      `[MarketFeed] candleIntervals must be an array.\n` +
        `Valid values: ${valid.join(", ")}\n` +
        `Example: candleIntervals: ['1m', '5m', '1h']`,
    );
  }

  candleIntervals.forEach((interval) => {
    if (!valid.includes(interval)) {
      throw new Error(
        `[MarketFeed] Invalid candleInterval "${interval}".\n` +
          `Valid values: ${valid.join(", ")}`,
      );
    }
  });
}

function _validatePairs(pairs, source) {
  if (!pairs) {
    throw new Error(
      `[MarketFeed] pairs is required.\n` +
        `Example:\n` +
        `  pairs: [\n` +
        `    { symbol: 'BTC/USDT', startPrice: 45000 }\n` +
        `  ]`,
    );
  }

  if (!Array.isArray(pairs)) {
    throw new Error("[MarketFeed] pairs must be an array.");
  }

  if (pairs.length === 0) {
    throw new Error(
      "[MarketFeed] pairs cannot be empty. " + "Provide at least one pair.",
    );
  }

  if (pairs.length > 100) {
    console.warn(
      `[MarketFeed] You have ${pairs.length} pairs configured. ` +
        `Large numbers of pairs may impact performance.`,
    );
  }

  // Check for duplicate symbols
  const symbols = pairs.map((p) => p?.symbol);
  const unique = new Set(symbols);
  if (unique.size !== symbols.length) {
    const dupes = symbols.filter((s, i) => symbols.indexOf(s) !== i);
    throw new Error(
      `[MarketFeed] Duplicate symbols found: ${dupes.join(", ")}. ` +
        `Each symbol must be unique.`,
    );
  }

  // Validate each pair
  pairs.forEach((pair, i) => validatePair(pair, i, source));
}

function _validateVolumeConfig(volume, prefix) {
  if (typeof volume !== "object") {
    throw new Error(
      `${prefix}.volume must be an object.\n` +
        `Example: { min: 100, max: 10000 }`,
    );
  }

  if (volume.min === undefined || volume.max === undefined) {
    throw new Error(
      `${prefix}.volume must have min and max.\n` +
        `Example: { min: 100, max: 10000 }`,
    );
  }

  if (typeof volume.min !== "number" || volume.min < 0) {
    throw new Error(
      `${prefix}.volume.min must be a non-negative number. ` +
        `Got: ${volume.min}`,
    );
  }

  if (typeof volume.max !== "number" || volume.max <= 0) {
    throw new Error(
      `${prefix}.volume.max must be a positive number. ` + `Got: ${volume.max}`,
    );
  }

  if (volume.max <= volume.min) {
    throw new Error(
      `${prefix}.volume.max must be greater than volume.min.\n` +
        `Got: min=${volume.min}, max=${volume.max}`,
    );
  }
}

module.exports = { validateConfig, validatePair };
