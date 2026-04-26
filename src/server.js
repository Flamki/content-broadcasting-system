const env = require("./config/env");
const prisma = require("./config/db");
const { initRedis, disconnectRedis } = require("./config/redis");
const app = require("./app");

let server = null;

async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    // Initialize Redis (optional — app works without it)
    initRedis();

    server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
      console.log(`API docs available at http://localhost:${env.port}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 * Closes HTTP server, disconnects Redis and Prisma, then exits.
 */
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
    });
  }

  try {
    await disconnectRedis();
    console.log("Redis disconnected");
  } catch (_err) {
    // ignore
  }

  try {
    await prisma.$disconnect();
    console.log("Database disconnected");
  } catch (_err) {
    // ignore
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
