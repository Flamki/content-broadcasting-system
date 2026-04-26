const { getRedis } = require("../config/redis");
const env = require("../config/env");

/**
 * Cache key builder for live content endpoint.
 * Keys are scoped by teacher and optional subject filter.
 */
function buildLiveCacheKey(teacherKey, subject) {
  const subjectPart = subject ? `:${subject.toLowerCase()}` : ":all";
  return `live:${teacherKey}${subjectPart}`;
}

/**
 * Retrieves a cached value by key.
 * Returns null if Redis is unavailable or key doesn't exist.
 */
async function getCached(key) {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (_err) {
    return null;
  }
}

/**
 * Stores a value in cache with configurable TTL.
 * Silently fails if Redis is unavailable.
 */
async function setCache(key, value, ttlSeconds) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    const ttl = ttlSeconds || env.liveCacheTtlSeconds;
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch (_err) {
    // silently fail
  }
}

/**
 * Invalidates cache entries matching a pattern.
 * Used when content is approved/rejected to bust stale live data.
 */
async function invalidatePattern(pattern) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (_err) {
    // silently fail
  }
}

/**
 * Invalidates all live cache entries for a specific teacher.
 */
async function invalidateLiveCacheForTeacher(teacherId) {
  await invalidatePattern(`live:teacher-${teacherId}:*`);
  await invalidatePattern(`live:${teacherId}:*`);
}

/**
 * Invalidates all live cache entries.
 */
async function invalidateAllLiveCache() {
  await invalidatePattern("live:*");
}

module.exports = {
  buildLiveCacheKey,
  getCached,
  setCache,
  invalidatePattern,
  invalidateLiveCacheForTeacher,
  invalidateAllLiveCache
};
