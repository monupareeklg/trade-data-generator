// examples/equity.js
//
// Simulates a US stock market equity feed
// Market hours: 09:30 - 16:00 New York time, weekdays only
// Run: node examples/equity.js

"use strict";

const { MarketFeed } = require("../src/index");

const feed = new MarketFeed({
  type: "equity",
  interval: 1000, // 1 tick per second
  candleIntervals: ["1m", "5m"], // track 1m and 5m candles
  depth: 10, // 10 levels each side

  marketHours: {
    open: "09:30",
    close: "16:00",
    timezone: "America/New_York",
    days: [1, 2, 3, 4, 5], // Mon-Fri only
  },

  pairs: [
    {
      symbol: "AAPL",
      startPrice: 175.5,
      volatility: 0.002, // 0.2% max move per tick
      trend: 0.0001, // slight upward drift
      precision: 2,
      tickSize: 0.01,
      volume: { min: 100, max: 10000 },
    },
    {
      symbol: "GOOGL",
      startPrice: 142.3,
      volatility: 0.003,
      trend: -0.0001, // slight downward drift
      precision: 2,
      tickSize: 0.01,
      volume: { min: 50, max: 5000 },
    },
    {
      symbol: "TSLA",
      startPrice: 245.8,
      volatility: 0.005, // more volatile
      trend: 0, // no drift
      precision: 2,
      tickSize: 0.01,
      volume: { min: 200, max: 20000 },
    },
  ],
});

// ── Event listeners ────────────────────────── //

feed.on("tick", (data) => {
  console.log(
    `[TICK]  ${data.symbol.padEnd(6)} ` +
      `$${String(data.price).padEnd(10)} ` +
      `bid: $${data.bid}  ` +
      `ask: $${data.ask}  ` +
      `vol: ${data.volume}  ` +
      `chg: ${data.changePct > 0 ? "+" : ""}${data.changePct}%`,
  );
});

feed.on("candle", (data) => {
  console.log(
    `\n[CANDLE] ${data.symbol} ${data.interval} closed\n` +
      `  O: $${data.open}  H: $${data.high}  ` +
      `L: $${data.low}  C: $${data.close}  ` +
      `Vol: ${data.volume}\n`,
  );
});

feed.on("depth", (data) => {
  // Only log depth for AAPL to avoid noise
  if (data.symbol !== "AAPL") return;
  const bestBid = data.bids[0];
  const bestAsk = data.asks[0];
  console.log(
    `[DEPTH] ${data.symbol}  ` +
      `best bid: $${bestBid.price} (${bestBid.volume})  ` +
      `best ask: $${bestAsk.price} (${bestAsk.volume})`,
  );
});

feed.on("open", (info) => {
  console.log(
    `\n✅ Market opened — ${info.type} at ${info.time} ${info.timezone}\n`,
  );
});

feed.on("closed", (info) => {
  console.log(
    `\n🔴 Market closed — ${info.type} at ${info.time} ${info.timezone}\n`,
  );
});

feed.on("error", (err) => {
  console.error(`[ERROR] ${err.symbol}: ${err.error}`);
});

// ── Start ──────────────────────────────────── //

console.log("Starting equity feed...");
console.log("Symbols:", feed.getSymbols().join(", "));
console.log("Market status:", feed.getMarketStatus());
console.log("─".repeat(60));

feed.start();

// Show how to get state snapshot at any time
setTimeout(() => {
  console.log("\n[SNAPSHOT] AAPL current state:");
  console.log(feed.getState("AAPL"));
}, 5000);

// Show how to get candle history
setTimeout(() => {
  console.log("\n[HISTORY] AAPL 1m candles:");
  const candles = feed.getCandles("AAPL", "1m", 5);
  console.log(candles);
}, 10000);

// Stop after 30 seconds
setTimeout(() => {
  console.log("\nStopping feed...");
  feed.stop();
  process.exit(0);
}, 30000);
