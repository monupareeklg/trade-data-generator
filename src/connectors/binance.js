/**
 * binance.js
 *
 * Binance WebSocket connector.
 * Connects to Binance public WebSocket streams.
 * No API key required for market data.
 *
 * Streams used:
 *   <symbol>@ticker    → 24hr ticker (price, change, volume)
 *   <symbol>@depth10   → order book top 10 levels
 *   <symbol>@kline_1m  → 1 minute candles
 *
 * source: 'binance'
 */

"use strict";

const { BaseConnector } = require("./base");

// Binance WebSocket base URL
const WS_BASE = "wss://stream.binance.com:9443/stream?streams=";

// Candle interval map — our format to Binance format
const INTERVAL_MAP = {
  "1s": "1s",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

class BinanceConnector extends BaseConnector {
  /**
   * @param {Object}   config
   * @param {Array}    config.pairs           - pair configs
   * @param {string[]} config.candleIntervals - e.g. ['1m', '5m']
   * @param {number}   config.depth           - order book levels (max 20)
   * @param {Function} config.onTick
   * @param {Function} config.onCandle
   * @param {Function} config.onDepth
   * @param {Function} config.onError
   */
  constructor(config = {}) {
    super(config);

    this._name = "binance";
    this._type = config.type ?? "crypto";
    this._candleIntervals = config.candleIntervals ?? ["1m"];
    this._depth = Math.min(config.depth ?? 10, 20);
    this._ws = null;
    this._reconnectTimer = null;
    this._reconnectDelay = 3000; // 3 seconds
    this._maxReconnects = 5;
    this._reconnectCount = 0;

    // Track last price per symbol for change calculation
    this._lastPrice = new Map();
    this._open24h = new Map();
  }

  // ── Lifecycle ─────────────────────────── //

  async connect() {
    if (this._running) return;

    this._running = true;

    // Build stream URL from pairs and intervals
    const streams = this._buildStreams();

    if (streams.length === 0) {
      this._emitError("*", new Error("No pairs configured"));
      return;
    }

    this._openWebSocket(streams);
  }

  async disconnect() {
    this._running = false;
    this._reconnectCount = 0;

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  async subscribe(symbols) {
    // Dynamic subscription via WebSocket SUBSCRIBE message
    if (!this._ws || this._ws.readyState !== 1) return;

    const streams = this._symbolsToStreams(symbols);
    const msg = {
      method: "SUBSCRIBE",
      params: streams,
      id: Date.now(),
    };
    this._ws.send(JSON.stringify(msg));
  }

  async unsubscribe(symbols) {
    if (!this._ws || this._ws.readyState !== 1) return;

    const streams = this._symbolsToStreams(symbols);
    const msg = {
      method: "UNSUBSCRIBE",
      params: streams,
      id: Date.now(),
    };
    this._ws.send(JSON.stringify(msg));
  }

  // ── Normalization ─────────────────────── //

  normalizeTick(raw) {
    // raw = Binance 24hr ticker stream data
    // https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-mini-ticker-stream
    const symbol = this._binanceToStandard(raw.s);
    const price = parseFloat(raw.c);
    const open24h = parseFloat(raw.o);
    const prev = this._lastPrice.get(symbol) ?? price;

    this._lastPrice.set(symbol, price);
    this._open24h.set(symbol, open24h);

    const change = parseFloat((price - open24h).toFixed(8));
    const changePct = parseFloat(
      (((price - open24h) / open24h) * 100).toFixed(4),
    );

    // Bid/ask from ticker (approximate spread)
    const bid = parseFloat(raw.b) || parseFloat((price * 0.9995).toFixed(8));
    const ask = parseFloat(raw.a) || parseFloat((price * 1.0005).toFixed(8));

    return {
      symbol,
      type: this._type,
      timestamp: raw.E ?? Date.now(),
      price,
      bid,
      ask,
      spread: parseFloat((ask - bid).toFixed(8)),
      volume: parseFloat(raw.v),
      change,
      changePct,
      high24h: parseFloat(raw.h),
      low24h: parseFloat(raw.l),
      open24h,
      previous: prev,
      source: "binance",
    };
  }

  normalizeCandle(raw) {
    // raw = Binance kline stream data
    const k = raw.k;
    const symbol = this._binanceToStandard(k.s);

    return {
      symbol,
      type: this._type,
      interval: this._binanceToInterval(k.i),
      openTime: k.t,
      closeTime: k.T,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      closed: k.x, // true when candle is closed
      source: "binance",
    };
  }

  normalizeDepth(raw) {
    // raw = Binance partial book depth stream
    const symbol = this._binanceToStandard(raw.s ?? "");

    const bids = (raw.bids ?? []).slice(0, this._depth).map((b) => ({
      price: parseFloat(b[0]),
      volume: parseFloat(b[1]),
      side: "bid",
    }));

    const asks = (raw.asks ?? []).slice(0, this._depth).map((a) => ({
      price: parseFloat(a[0]),
      volume: parseFloat(a[1]),
      side: "ask",
    }));

    return {
      symbol,
      type: this._type,
      timestamp: Date.now(),
      bids,
      asks,
      source: "binance",
    };
  }

  // ── State ─────────────────────────────── //

  getState(symbol) {
    // Live connector — return last known price
    const price = this._lastPrice.get(symbol);
    if (!price) return null;

    return {
      symbol,
      type: this._type,
      source: "binance",
      price,
      open24h: this._open24h.get(symbol) ?? price,
    };
  }

  // ── Private ───────────────────────────── //

  /**
   * Open WebSocket connection to Binance
   */
  _openWebSocket(streams) {
    const url = WS_BASE + streams.join("/");

    try {
      // Use native WebSocket (Node.js 18+) or ws package
      const WS = typeof WebSocket !== "undefined" ? WebSocket : require("ws");

      this._ws = new WS(url);

      this._ws.onopen = () => {
        console.log(`[BinanceConnector] Connected — ${streams.length} streams`);
        this._reconnectCount = 0;
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (err) {
          this._emitError("*", err);
        }
      };

      this._ws.onerror = (err) => {
        this._emitError("*", new Error(`WebSocket error: ${err.message}`));
      };

      this._ws.onclose = () => {
        if (!this._running) return;
        console.warn(
          "[BinanceConnector] Disconnected — attempting reconnect...",
        );
        this._reconnect(streams);
      };
    } catch (err) {
      this._emitError("*", err);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  _handleMessage(msg) {
    if (!msg.data || !msg.stream) return;

    const stream = msg.stream;
    const data = msg.data;

    // 24hr ticker stream
    if (stream.endsWith("@ticker")) {
      const tick = this.normalizeTick(data);
      this._emitTick(tick);
      return;
    }

    // Kline/candle stream
    if (stream.includes("@kline_")) {
      const candle = this.normalizeCandle(data);
      // Only emit on closed candles
      if (candle.closed) {
        this._emitCandle(candle);
      }
      return;
    }

    // Depth stream
    if (stream.endsWith("@depth10") || stream.includes("@depth")) {
      // Depth stream doesn't include symbol — extract from stream name
      const symbol = this._binanceToStandard(
        stream.split("@")[0].toUpperCase(),
      );
      const depth = this.normalizeDepth({ ...data, s: symbol });
      this._emitDepth(depth);
      return;
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  _reconnect(streams) {
    if (this._reconnectCount >= this._maxReconnects) {
      this._emitError(
        "*",
        new Error(
          `[BinanceConnector] Max reconnect attempts (${this._maxReconnects}) reached.`,
        ),
      );
      return;
    }

    this._reconnectCount++;
    const delay = this._reconnectDelay * this._reconnectCount;

    console.log(
      `[BinanceConnector] Reconnecting in ${delay}ms... (attempt ${this._reconnectCount})`,
    );

    this._reconnectTimer = setTimeout(() => {
      this._openWebSocket(streams);
    }, delay);
  }

  /**
   * Build Binance stream names from pairs and intervals
   * e.g. ['btcusdt@ticker', 'btcusdt@depth10', 'btcusdt@kline_1m']
   */
  _buildStreams() {
    const streams = [];

    this.pairs.forEach((pair) => {
      const binanceSymbol = this._standardToBinance(pair.symbol);

      // Ticker stream — price, volume, 24h stats
      streams.push(`${binanceSymbol}@ticker`);

      // Depth stream — order book
      streams.push(`${binanceSymbol}@depth${this._depth}`);

      // Kline streams — one per interval
      this._candleIntervals.forEach((interval) => {
        const binanceInterval = INTERVAL_MAP[interval];
        if (binanceInterval) {
          streams.push(`${binanceSymbol}@kline_${binanceInterval}`);
        }
      });
    });

    return streams;
  }

  /**
   * Build streams for specific symbols (for dynamic subscribe/unsubscribe)
   */
  _symbolsToStreams(symbols) {
    const streams = [];
    symbols.forEach((symbol) => {
      const binanceSymbol = this._standardToBinance(symbol);
      streams.push(`${binanceSymbol}@ticker`);
      streams.push(`${binanceSymbol}@depth${this._depth}`);
      this._candleIntervals.forEach((interval) => {
        streams.push(
          `${binanceSymbol}@kline_${INTERVAL_MAP[interval] ?? "1m"}`,
        );
      });
    });
    return streams;
  }

  /**
   * Convert standard symbol to Binance format
   * 'BTC/USDT' → 'btcusdt'
   */
  _standardToBinance(symbol) {
    return symbol.replace("/", "").toLowerCase();
  }

  /**
   * Convert Binance symbol to standard format
   * 'BTCUSDT' → 'BTC/USDT'
   *
   * Handles common quote currencies:
   * USDT, USDC, BTC, ETH, BNB, BUSD
   */
  _binanceToStandard(symbol) {
    const quotes = ["USDT", "USDC", "BUSD", "BTC", "ETH", "BNB", "TRX", "XRP"];
    for (const quote of quotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    return symbol;
  }

  /**
   * Convert Binance interval to standard format
   * '1m' → '1m' (same in this case)
   */
  _binanceToInterval(interval) {
    const map = {
      "1s": "1s",
      "1m": "1m",
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "4h": "4h",
      "1d": "1d",
    };
    return map[interval] ?? interval;
  }
}

module.exports = { BinanceConnector };
