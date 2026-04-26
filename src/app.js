const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");
const fs = require("fs");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { globalLimiter } = require("./middlewares/rate-limit.middleware");

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Global rate limiter
app.use(globalLimiter);

// Static file serving for local uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Root redirect to API docs
app.get("/", (_req, res) => {
  res.redirect("/api-docs");
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

// Swagger UI — API documentation at /api-docs
try {
  const openApiPath = path.join(process.cwd(), "docs", "openapi.yaml");
  const openApiDoc = yaml.load(fs.readFileSync(openApiPath, "utf8"));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDoc, {
      customSiteTitle: "Content Broadcasting System — API Docs",
      customCss: ".swagger-ui .topbar { display: none }"
    })
  );
} catch (_err) {
  console.log("Swagger UI setup skipped — docs/openapi.yaml not found");
}

// API routes
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
