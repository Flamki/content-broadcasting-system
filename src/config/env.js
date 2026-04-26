const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/content_broadcasting_system?schema=public",
  jwtSecret: process.env.JWT_SECRET || "development_jwt_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10),
  defaultRotationMinutes: Number(process.env.DEFAULT_ROTATION_MINUTES || 5),
  storageDriver: (process.env.STORAGE_DRIVER || "local").toLowerCase(),
  s3Region: process.env.S3_REGION || "",
  s3Bucket: process.env.S3_BUCKET || "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  s3Endpoint: process.env.S3_ENDPOINT || "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
  s3ForcePathStyle:
    (process.env.S3_FORCE_PATH_STYLE || "false").toLowerCase() === "true",
  redisUrl: process.env.REDIS_URL || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  liveCacheTtlSeconds: Number(process.env.LIVE_CACHE_TTL_SECONDS || 30)
};

module.exports = env;
