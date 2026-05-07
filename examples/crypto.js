// examples/crypto.js
//
// Simulates a crypto exchange feed
// Crypto never closes — 24/7/365
// Run: node examples/crypto.js

"use strict";

const { MarketFeed } = require("../src/index");

const feed = new MarketFeed({
  type: "crypto",
  interval: 1000,
  candleIntervals: ["1m", "5m", "1h"],
  depth: 10,

  // No marketHours needed for crypto

  pairs: [
    {
      symbol: "BTC/USDT",
      startPrice: 45000,
      volatility: 0.004, // crypto is more volatile
      trend: 0.0002,
      precision: 2,
      tickSize: 0.01,
      volume: { min: 0.001, max: 10 }, // BTC volumes in BTC
    },
    {
      symbol: "ETH/USDT",
      startPrice: 2800,
      volatility: 0.005,
      trend: 0.0001,
      precision: 2,
      tickSize: 0.01,
      volume: { min: 0.01, max: 100 },
    },
    {
      symbol: "SOL/USDT",
      startPrice: 120,
      volatility: 0.008, // altcoins more volatile
      trend: 0,
      precision: 3,
      tickSize: 0.001,
      volume: { min: 1, max: 1000 },
    },
    {
      symbol: "BNB/USDT",
      startPrice: 380,
      volatility: 0.003,
      trend: 0.0001,
      precision: 2,
      tickSize: 0.01,
      volume: { min: 0.1, max: 500 },
    },
  ],
});

// ── Event listeners ────────────────────────── //

feed.on("tick", (data) => {
  const arrow = data.price >= data.previous ? "▲" : "▼";
  console.log(
    `[TICK]  ${data.symbol.padEnd(10)} ` +
      `${arrow} $${String(data.price).padEnd(12)} ` +
      `vol: ${data.volume}  ` +
      `chg: ${data.changePct > 0 ? "+" : ""}${data.changePct}%  ` +
      `H: $${data.high24h}  L: $${data.low24h}`,
  );
});

feed.on("candle", (data) => {
  console.log(
    `\n[CANDLE] ${data.symbol} ${data.interval} ` +
      `O:${data.open} H:${data.high} L:${data.low} C:${data.close} ` +
      `V:${data.volume}\n`,
  );
});

feed.on("depth", (data) => {
  // Only log BTC depth
  if (data.symbol !== "BTC/USDT") return;
  console.log(
    `[DEPTH] ${data.symbol}  ` +
      `bids: ${data.bids
        .slice(0, 3)
        .map((b) => `$${b.price}(${b.volume})`)
        .join(" ")}  ` +
      `asks: ${data.asks
        .slice(0, 3)
        .map((a) => `$${a.price}(${a.volume})`)
        .join(" ")}`,
  );
});

feed.on("error", (err) => {
  console.error(`[ERROR] ${err.symbol}: ${err.error}`);
});

// ── Demonstrate controls ───────────────────── //

console.log("Starting crypto feed...");
console.log("Symbols:", feed.getSymbols().join(", "));
console.log("─".repeat(60));

feed.start();

// Pause after 5 seconds
setTimeout(() => {
  console.log("\n⏸  Feed paused\n");
  feed.pause();
}, 5000);

// Resume after 8 seconds
setTimeout(() => {
  console.log("\n▶️  Feed resumed\n");
  feed.resume();
}, 8000);

// Reset BTC after 15 seconds
setTimeout(() => {
  console.log("\n🔄 Resetting BTC/USDT to start price\n");
  feed.reset("BTC/USDT");
}, 15000);

// Get full state after 20 seconds
setTimeout(() => {
  console.log("\n[STATE] BTC/USDT:");
  const state = feed.getState("BTC/USDT");
  console.log(`  price:   $${state.price}`);
  console.log(`  high24h: $${state.high24h}`);
  console.log(`  low24h:  $${state.low24h}`);
  console.log(
    `  candles: ${Object.keys(state.candles)
      .map((i) => `${i}:${state.candles[i].length}`)
      .join(", ")}`,
  );
}, 20000);

// Stop after 30 seconds
setTimeout(() => {
  console.log("\nStopping feed...");
  feed.stop();
  process.exit(0);
}, 30000);
