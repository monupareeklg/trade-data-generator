// examples/forex.js
//
// Simulates a forex currency pair feed
// Forex runs 24/5 — Mon open to Fri close
// Run: node examples/forex.js

"use strict";

const { MarketFeed } = require("../src/index");

const feed = new MarketFeed({
  type: "forex",
  interval: 500, // 2 ticks per second (forex moves fast)
  candleIntervals: ["1m", "1h"],
  depth: 10,

  marketHours: {
    open: "00:00",
    close: "23:59",
    timezone: "UTC",
    days: [1, 2, 3, 4, 5], // Mon-Fri, 24 hours
  },

  pairs: [
    {
      symbol: "EUR/USD",
      startPrice: 1.0845,
      volatility: 0.0003, // forex moves in tiny increments
      trend: 0,
      precision: 5, // 5 decimal places (pips)
      tickSize: 0.00001, // 1 pip
      volume: { min: 100000, max: 5000000 }, // lot sizes
    },
    {
      symbol: "GBP/USD",
      startPrice: 1.2678,
      volatility: 0.0004, // slightly more volatile than EUR/USD
      trend: 0.00001,
      precision: 5,
      tickSize: 0.00001,
      volume: { min: 50000, max: 2000000 },
    },
    {
      symbol: "USD/JPY",
      startPrice: 149.85,
      volatility: 0.0002,
      trend: -0.00001,
      precision: 3, // JPY uses 3 decimal places
      tickSize: 0.001,
      volume: { min: 100000, max: 3000000 },
    },
  ],
});

// ── Event listeners ────────────────────────── //

feed.on("tick", (data) => {
  console.log(
    `[TICK]  ${data.symbol.padEnd(8)} ` +
      `${String(data.price).padEnd(12)} ` +
      `bid: ${data.bid}  ` +
      `ask: ${data.ask}  ` +
      `spread: ${data.spread}  ` +
      `chg: ${data.changePct > 0 ? "+" : ""}${data.changePct}%`,
  );
});

feed.on("candle", (data) => {
  console.log(
    `\n[CANDLE] ${data.symbol} ${data.interval} closed\n` +
      `  O: ${data.open}  H: ${data.high}  ` +
      `L: ${data.low}  C: ${data.close}\n`,
  );
});

feed.on("open", (info) =>
  console.log(`\n✅ Forex session opened at ${info.time} UTC\n`),
);
feed.on("closed", (info) =>
  console.log(`\n🔴 Forex session closed at ${info.time} UTC\n`),
);
feed.on("error", (err) => console.error(`[ERROR] ${err.symbol}: ${err.error}`));

// ── WebSocket integration example ──────────── //
// This shows how a developer would wire this
// into their own WebSocket server

/*
const { Server } = require('socket.io')
const io = new Server(3001)

feed.on('tick', (data) => {
  io.to(data.symbol).emit('ticker_update', data)
})

feed.on('candle', (data) => {
  io.to(data.symbol).emit('candle_update', data)
})

feed.on('depth', (data) => {
  io.to(data.symbol).emit('orderbook_update', data)
})

io.on('connection', (socket) => {
  socket.on('subscribe', ({ symbol }) => {
    socket.join(symbol)
    socket.emit('snapshot', feed.getState(symbol))
  })
})
*/

// ── Start ──────────────────────────────────── //

console.log("Starting forex feed...");
console.log("Pairs:", feed.getSymbols().join(", "));
console.log("─".repeat(60));

feed.start();

// Stop after 30 seconds
setTimeout(() => {
  feed.stop();
  process.exit(0);
}, 30000);
