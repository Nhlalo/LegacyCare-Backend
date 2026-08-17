import "dotenv/config";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import pino from "pino";
import { randomUUID } from "crypto";

const app = express();
const logger = pino();
const port = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : isProd
    ? []
    : "*";
const gracefulShutdownTimeoutMs = 30000;

// Security & performance
app.use(helmet());
app.use(compression());
app.use(cors({ origin: corsOrigin }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// JSON syntax error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

// Logging middleware with timing and status
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info({
      reqId: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  });

  next();
});

// Routes
app.get("/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ reqId: req.id, err });

  if (isProd) {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    // Development: full details for debugging
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      type: err.name,
    });
  }
});

const server = app.listen(port, () => {
  logger.info(`Listening on port: ${port}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info("Graceful shutdown initiated");

  server.close(() => {
    logger.info("All connections closed");
    process.exit(0);
  });

  // Hard timeout: force exit after 30 seconds
  setTimeout(() => {
    logger.error("Forced exit after timeout");
    process.exit(1);
  }, gracefulShutdownTimeoutMs);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Unhandled rejections & exceptions
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error(err, "Uncaught Exception");
  process.exit(1);
});
