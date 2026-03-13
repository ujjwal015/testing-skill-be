const redisClients = require("../config/redis");

class RedisService {
  constructor(db = "db0") {
    this.client = redisClients[db];
    if (!this.client) throw new Error(`Redis DB "${db}" is not configured`);
    this.prefix = process.env.NODE_ENV || "development";
  }

  #buildKey(key) {
    return `${this.prefix.toUpperCase()}:${key}`;
  }

  async get(key) {
    try {
      const data = await this.client.get(this.#buildKey(key));
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (err) {
      console.error(`Redis GET error: ${err.message}`);
      return null;
    }
  }

  async getMatching(pattern) {
    try {
      const fullPattern = this.#buildKey(pattern);
      let cursor = "0";
      const results = {};

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          "MATCH",
          fullPattern,
          "COUNT",
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          const values = await this.client.mget(...keys);
          keys.forEach((key, index) => {
            const cleanedKey = key.replace(`${this.prefix.toUpperCase()}:`, "");
            try {
              results[cleanedKey] = JSON.parse(values[index]);
            } catch {
              results[cleanedKey] = values[index];
            }
          });
        }
      } while (cursor !== "0");

      return results;
    } catch (err) {
      console.error(`Redis getMatching error: ${err.message}`);
      return {};
    }
  }

  async set(key, value, expiryTime = process.env.REDIS_DEFAULT_EXPIRY) {
    try {
      const val = typeof value === "string" ? value : JSON.stringify(value);
      await this.client.set(this.#buildKey(key), val, "EX", expiryTime);
    } catch (err) {
      console.error(`Redis SET error: ${err.message}`);
    }
  }

  async destroy(key) {
    try {
      await this.client.del(this.#buildKey(key));
    } catch (err) {
      console.error(`Redis Destroy error: ${err.message}`);
    }
  }

  async destroyMatching(pattern) {
  try {
    const fullPattern = this.#buildKey(`${pattern}*`);
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(`Redis destroyMatching error: ${err.message}`);
  }
}

}

module.exports = RedisService;
