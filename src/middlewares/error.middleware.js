const multer = require("multer");
const ApiError = require("../utils/api-error");

function notFound(_req, _res, next) {
  next(new ApiError(404, "Route not found"));
}

function errorHandler(error, _req, res, _next) {
  // Handle Multer file upload errors
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds size limit"
        : error.message
    });
  }

  // Handle file type validation errors from upload middleware
  if (error.message === "Only JPG, PNG, and GIF files are allowed") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Handle known API errors
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details || null
    });
  }

  // Log unexpected errors for debugging (never expose internals to client)
  console.error("Unhandled error:", {
    message: error.message,
    stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}

module.exports = {
  notFound,
  errorHandler
};
