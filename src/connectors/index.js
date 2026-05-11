/**
 * connectors/index.js
 *
 * Connector registry.
 * Maps source names to connector classes.
 * MarketFeed uses this to pick the right connector.
 *
 * Adding a new connector:
 *   1. Create src/connectors/yourconnector.js
 *   2. Extend BaseConnector
 *   3. Register it here
 */

'use strict'

const { SimulationConnector } = require('./simulation')
const { BinanceConnector }    = require('./binance')

// ── Registry ──────────────────────────────── //
const CONNECTORS = {
  simulation: SimulationConnector,
  binance:    BinanceConnector,
}

/**
 * Get a connector class by source name
 * @param {string} source - e.g. 'simulation' | 'binance'
 * @returns {Function} connector class
 * @throws {Error} if source is not registered
 */
function getConnector(source = 'simulation') {
  const ConnectorClass = CONNECTORS[source.toLowerCase()]

  if (!ConnectorClass) {
    const available = Object.keys(CONNECTORS).join(', ')
    throw new Error(
      `[MarketFeed] Unknown source "${source}".\n` +
      `Available sources: ${available}\n` +
      `Example: { source: 'binance' }`
    )
  }

  return ConnectorClass
}

/**
 * Get list of all available source names
 * @returns {string[]}
 */
function getAvailableSources() {
  return Object.keys(CONNECTORS)
}

/**
 * Register a custom connector
 * Allows developers to add their own data sources
 *
 * @param {string}   name            - source name e.g. 'myexchange'
 * @param {Function} ConnectorClass  - class extending BaseConnector
 *
 * @example
 * const { registerConnector } = require('trade-data-generator')
 * const { BaseConnector }     = require('trade-data-generator')
 *
 * class MyExchangeConnector extends BaseConnector {
 *   // ... implement required methods
 * }
 *
 * registerConnector('myexchange', MyExchangeConnector)
 *
 * const feed = new MarketFeed({
 *   source: 'myexchange',
 *   pairs:  [{ symbol: 'BTC/USDT' }]
 * })
 */
function registerConnector(name, ConnectorClass) {
  if (!name || typeof name !== 'string') {
    throw new Error('[registerConnector] name must be a non-empty string')
  }

  if (!ConnectorClass || typeof ConnectorClass !== 'function') {
    throw new Error('[registerConnector] ConnectorClass must be a class')
  }

  const { BaseConnector } = require('./base')
  if (!(ConnectorClass.prototype instanceof BaseConnector)) {
    throw new Error(
      `[registerConnector] "${name}" must extend BaseConnector.\n` +
      `Import: const { BaseConnector } = require('trade-data-generator')`
    )
  }

  CONNECTORS[name.toLowerCase()] = ConnectorClass
  console.log(`[MarketFeed] Registered connector: "${name}"`)
}

module.exports = {
  getConnector,
  getAvailableSources,
  registerConnector,
  CONNECTORS,
}