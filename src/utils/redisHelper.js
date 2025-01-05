module.exports.redisHelper = {
  connect: async (client) => {
    try {
      await client.connect();
      console.log("Connected to Redis!");
    } catch (err) {
      console.error("Error connecting to Redis:", err);
    }
  },
};
