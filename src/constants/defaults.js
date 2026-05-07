/**
 * defaults.js
 *
 * Default configuration values for MarketFeed.
 * Every value here can be overridden by developer config.
 */

"use strict";

const DEFAULTS = {
  // ── Feed settings ──────────────────────── //

  // How often to emit a tick (ms)
  interval: 1000,

  // Candle intervals to track by default
  candleIntervals: ["1m"],

  // Max candles to keep in history per interval
  maxCandles: 1000,

  // How many order book levels each side
  depth: 10,

  // ── Per-pair defaults ──────────────────── //
  pair: {
    volatility: 0.002, // 0.2% max move per tick
    trend: 0, // no drift by default
    precision: 2, // 2 decimal places
    tickSize: 0.01, // minimum price increment
    spreadPct: 0.001, // 0.1% spread between bid/ask
    volume: {
      min: 100,
      max: 10000,
    },
  },

  // ── Market hours defaults ──────────────── //
  // Only used for equity and forex
  // Crypto ignores this entirely
  marketHours: {
    equity: {
      open: "09:30",
      close: "16:00",
      timezone: "America/New_York",
      days: [1, 2, 3, 4, 5], // Mon-Fri
    },
    forex: {
      open: "00:00",
      close: "23:59",
      timezone: "UTC",
      days: [0, 1, 2, 3, 4, 5, 6], // always open
    },
  },
};

module.exports = { DEFAULTS };
