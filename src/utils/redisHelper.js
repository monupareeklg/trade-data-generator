const Redis = require("redis");

async function createRedisClient(redisConfig) {
    const client = Redis.createClient(redisConfig);
    client.on("error", (err) => console.error("Redis Error:", err));
    client.on("connect", () => console.log("Redis connected!"));
    client.on("end", () => console.warn("Redis disconnected."));

    await client.connect();
    return client;
}

module.exports = { createRedisClient };