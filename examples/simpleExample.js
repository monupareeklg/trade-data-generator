const MarketDepthGenerator = require("../src/index");

const generator = new MarketDepthGenerator({
  redisHost: "127.0.0.1",
  redisPort: 6379,
  port: 8080,
  middlePrice: 306.34,
});

(async () => {
  await generator.init();
  generator.startServer();
})();
