const equityMarketHours = {
  NYSE: { open: 13.5, close: 20 }, // 13:30 to 20:00 UTC
  LSE: { open: 8, close: 16.5 }, // 08:00 to 16:30 UTC
  NSE: { open: 3.75, close: 10 }, // 03:45 to 10:00 UTC
  TSE: { open: 0, close: 6 }, // 00:00 to 06:00 UTC
  ASX: { open: 22, close: 4 }, // 22:00 to 04:00 UTC (next day)
};

const forexMarketHours = [
  { region: "Sydney", open: 22, close: 7 },
  { region: "Tokyo", open: 0, close: 9 },
  { region: "London", open: 8, close: 17 },
  { region: "New York", open: 13, close: 22 },
];

module.exports = { equityMarketHours, forexMarketHours };
