const Redis = require("ioredis");
const env = require("./env");

let redis = null;
let isRedisAvailable = false;

/**
 * Initializes the Redis client.
 * Gracefully degrades if Redis is not available — the app
 * continues to work without caching.
 */
function initRedis() {
  if (!env.redisUrl) {
    console.log("REDIS_URL not set — caching disabled");
    return null;
  }

  redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true
  });

  redis.on("connect", () => {
    isRedisAvailable = true;
    console.log("Redis connected — caching enabled");
  });

  redis.on("error", (err) => {
    isRedisAvailable = false;
    if (err.code !== "ECONNREFUSED") {
      console.error("Redis error:", err.message);
    }
  });

  redis.on("close", () => {
    isRedisAvailable = false;
  });

  redis.connect().catch(() => {
    console.log("Redis not available — caching disabled (app continues without it)");
  });

  return redis;
}

function getRedis() {
  return isRedisAvailable ? redis : null;
}

async function disconnectRedis() {
  if (redis) {
    try {
      await redis.quit();
    } catch (_err) {
      // ignore
    }
  }
}

module.exports = {
  initRedis,
  getRedis,
  disconnectRedis
};
