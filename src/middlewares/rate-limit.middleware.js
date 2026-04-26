const rateLimit = require("express-rate-limit");
const env = require("../config/env");

/**
 * Global rate limiter — applies to all API routes.
 * Window and max values are configurable via env.
 */
const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later"
  }
});

/**
 * Stricter limiter for auth endpoints to prevent brute-force attacks.
 * 15-minute window, max 20 requests.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login/register attempts, please try again after 15 minutes"
  }
});

/**
 * Rate limiter for the public /content/live endpoint.
 * 1-minute window, max 60 requests per IP.
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests to the live endpoint, please try again later"
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  publicLimiter
};
