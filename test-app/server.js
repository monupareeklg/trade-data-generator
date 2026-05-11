'use strict'

const http           = require('http')
const fs             = require('fs')
const path           = require('path')
const { Server }     = require('socket.io')
const { MarketFeed } = require('../src/index')

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res)
    return
  }
  res.writeHead(404)
  res.end('Not found')
})

const io = new Server(server, { cors: { origin: '*' } })

// ── Source from CLI arg ─────────────────── //
// node server.js            → simulation
// node server.js binance    → binance
const SOURCE = process.argv[2] ?? 'simulation'

console.log(`\n  trade-data-generator test app`)
console.log(`  ─────────────────────────────`)
console.log(`  Source:  ${SOURCE}`)
console.log(`  Switch:  node server.js binance`)
console.log(`  URL:     http://localhost:3001\n`)

const PAIRS_SIMULATION = [
  { symbol: 'BTC/USDT', startPrice: 45000, volatility: 0.004, precision: 2 },
  { symbol: 'ETH/USDT', startPrice: 2800,  volatility: 0.005, precision: 2 },
  { symbol: 'SOL/USDT', startPrice: 120,   volatility: 0.008, precision: 3 },
  { symbol: 'BNB/USDT', startPrice: 380,   volatility: 0.003, precision: 2 },
]

const PAIRS_BINANCE = [
  { symbol: 'BTC/USDT' },
  { symbol: 'ETH/USDT' },
  { symbol: 'SOL/USDT' },
  { symbol: 'BNB/USDT' },
]

const feed = new MarketFeed({
  source:          SOURCE,
  type:            'crypto',
  candleIntervals: ['1m', '5m'],
  depth:           10,
  pairs:           SOURCE === 'binance' ? PAIRS_BINANCE : PAIRS_SIMULATION,
})

// ── Feed → Socket.io ───────────────────── //
feed.on('tick',   (data) => {
  io.to(data.symbol).emit('tick', data)
  io.emit('mini_tick', {
    symbol:    data.symbol,
    price:     data.price,
    changePct: data.changePct,
    source:    data.source,
  })
})

feed.on('candle', (data) => io.to(data.symbol).emit('candle', data))
feed.on('depth',  (data) => io.to(data.symbol).emit('depth',  data))
feed.on('error',  (err)  => {
  console.error('[ERROR]', err.symbol, err.error)
  io.emit('feed_error', err)
})

// ── Socket connections ─────────────────── //
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`)

  // Send config on connect
  socket.emit('config', {
    source: SOURCE,
    pairs:  (SOURCE === 'binance' ? PAIRS_BINANCE : PAIRS_SIMULATION)
              .map(p => p.symbol),
  })

  socket.on('subscribe', ({ symbol }) => {
    // Leave previous rooms
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r) })
    socket.join(symbol)

    // Send current state immediately
    const state = feed.getState(symbol)
    if (state) socket.emit('snapshot', state)

    console.log(`[~] ${socket.id} → ${symbol}`)
  })

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`)
  })
})

feed.start()

server.listen(3001, () => {
  console.log(`  Ready at http://localhost:3001\n`)
})