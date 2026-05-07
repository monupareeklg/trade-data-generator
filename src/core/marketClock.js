/**
 * marketClock.js
 *
 * Manages market hours for equity, forex and crypto.
 * Fires events when market opens and closes.
 * Developer passes their own schedule — library enforces it.
 *
 * Features:
 * - Timezone aware (uses Intl API — no external deps)
 * - Supports always-open markets (crypto)
 * - Fires onOpen / onClose callbacks
 * - Checks market status on every tick
 * - No broken UTC offset math from old code
 */

"use strict";

const MARKET_TYPES = {
  CRYPTO: "crypto",
  FOREX: "forex",
  EQUITY: "equity",
};

class MarketClock {
  /**
   * @param {Object} config
   * @param {string} config.type         - 'crypto' | 'forex' | 'equity'
   * @param {Object} config.marketHours  - Required for equity/forex
   *   @param {string} config.marketHours.open      - e.g. '09:30'
   *   @param {string} config.marketHours.close     - e.g. '16:00'
   *   @param {string} config.marketHours.timezone  - e.g. 'America/New_York'
   *   @param {number[]} config.marketHours.days    - Days open (0=Sun, 6=Sat)
   *                                                  default: [1,2,3,4,5] weekdays
   * @param {Function} config.onOpen     - Callback when market opens
   * @param {Function} config.onClose    - Callback when market closes
   */
  constructor(config = {}) {
    this.type = config.type ?? MARKET_TYPES.CRYPTO;
    this.marketHours = config.marketHours ?? null;
    this.onOpen = config.onOpen ?? null;
    this.onClose = config.onClose ?? null;

    // Internal state
    this._isOpen = false;
    this._checkTimer = null;

    // Validate
    if (this.type !== MARKET_TYPES.CRYPTO && !this.marketHours) {
      throw new Error(
        `[MarketClock] marketHours is required for type "${this.type}". ` +
          `Only crypto markets are always open.`,
      );
    }

    if (this.marketHours) {
      this._validateMarketHours(this.marketHours);

      // Default to weekdays if days not specified
      if (!this.marketHours.days) {
        this.marketHours.days = [1, 2, 3, 4, 5];
      }
    }
  }

  /**
   * Start the market clock
   * Begins checking market status every minute
   */
  start() {
    // Crypto is always open
    if (this.type === MARKET_TYPES.CRYPTO) {
      this._isOpen = true;
      return;
    }

    // Check immediately
    this._checkStatus();

    // Then check every minute
    this._checkTimer = setInterval(() => {
      this._checkStatus();
    }, 60 * 1000);
  }

  /**
   * Stop the market clock
   */
  stop() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    this._isOpen = false;
  }

  /**
   * Is the market currently open?
   * @returns {boolean}
   */
  isOpen() {
    // Crypto never closes
    if (this.type === MARKET_TYPES.CRYPTO) return true;
    return this._isOpen;
  }

  /**
   * Get current market status info
   * @returns {Object}
   */
  getStatus() {
    if (this.type === MARKET_TYPES.CRYPTO) {
      return {
        isOpen: true,
        type: this.type,
        reason: "Crypto markets never close",
        openTime: null,
        closeTime: null,
      };
    }

    const now = this._getCurrentTime();
    const { open, close, timezone } = this.marketHours;

    return {
      isOpen: this._isOpen,
      type: this.type,
      timezone,
      openTime: open,
      closeTime: close,
      localTime: now.timeStr,
      localDay: now.day,
      reason: this._getStatusReason(now),
    };
  }

  /**
   * Get time until next open (ms)
   * Returns 0 if already open
   */
  msUntilOpen() {
    if (this.isOpen()) return 0;
    // Simplified — returns ms until next open time today or tomorrow
    const now = new Date();
    const { open, timezone } = this.marketHours;
    const [h, m] = open.split(":").map(Number);

    // Get today's open time in market timezone
    const openDate = new Date(
      now.toLocaleString("en-US", { timeZone: timezone }),
    );
    openDate.setHours(h, m, 0, 0);

    let diff = openDate.getTime() - now.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // next day
    return diff;
  }

  // ── Private helpers ──────────────────────── //

  /**
   * Check if market should be open right now
   * Uses Intl API for correct timezone handling — no manual offset math
   */
  _checkStatus() {
    const now = this._getCurrentTime();
    const wasOpen = this._isOpen;
    const shouldBeOpen = this._shouldBeOpen(now);

    this._isOpen = shouldBeOpen;

    // Fire callbacks on state change only
    if (!wasOpen && shouldBeOpen) {
      if (this.onOpen) {
        this.onOpen({
          type: this.type,
          time: now.timeStr,
          timezone: this.marketHours.timezone,
          timestamp: Date.now(),
        });
      }
    } else if (wasOpen && !shouldBeOpen) {
      if (this.onClose) {
        this.onClose({
          type: this.type,
          time: now.timeStr,
          timezone: this.marketHours.timezone,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Determine if market should be open based on current time
   * @param {Object} now - from _getCurrentTime()
   */
  _shouldBeOpen(now) {
    const { days } = this.marketHours;

    // Check if today is a trading day
    if (!days.includes(now.day)) return false;

    // Check time window
    const { open, close } = this.marketHours;
    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);

    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    const nowMins = now.hours * 60 + now.minutes;

    return nowMins >= openMins && nowMins < closeMins;
  }

  /**
   * Get current time in the market's timezone
   * Uses Intl API — correct for ALL timezones, no offset math
   * @returns {{ hours, minutes, day, timeStr }}
   */
  _getCurrentTime() {
    const timezone = this.marketHours?.timezone ?? "UTC";
    const now = new Date();

    // Format in target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value;

    const hours = parseInt(get("hour"), 10);
    const minutes = parseInt(get("minute"), 10);
    const weekday = get("weekday");

    // Convert weekday string to number (0=Sun, 6=Sat)
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[weekday] ?? 0;

    return {
      hours,
      minutes,
      day,
      timeStr: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    };
  }

  /**
   * Human readable reason for market status
   */
  _getStatusReason(now) {
    const { days, open, close } = this.marketHours;

    if (!days.includes(now.day)) {
      return `Market closed — weekend or non-trading day`;
    }

    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    const nowMins = now.hours * 60 + now.minutes;

    if (nowMins < openMins) return `Market opens at ${open}`;
    if (nowMins >= closeMins) return `Market closed at ${close}`;
    return `Market is open`;
  }

  /**
   * Validate marketHours config
   */
  _validateMarketHours(hours) {
    if (!hours.open || !hours.close || !hours.timezone) {
      throw new Error(
        "[MarketClock] marketHours must have: open, close, timezone. " +
          'Example: { open: "09:30", close: "16:00", timezone: "America/New_York" }',
      );
    }

    // Validate time format HH:MM
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(hours.open) || !timeRegex.test(hours.close)) {
      throw new Error(
        "[MarketClock] open and close must be in HH:MM format. " +
          'Example: "09:30", "16:00"',
      );
    }

    // Validate timezone using Intl
    try {
      Intl.DateTimeFormat("en-US", { timeZone: hours.timezone });
    } catch {
      throw new Error(
        `[MarketClock] Invalid timezone "${hours.timezone}". ` +
          `Use IANA timezone names like "America/New_York", "Europe/London", "Asia/Kolkata"`,
      );
    }
  }
}

module.exports = { MarketClock, MARKET_TYPES };
