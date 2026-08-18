import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import logger from "./lib/logger";
import authRoutes from "./routes/auth.routes";
import funeralHomeRoutes from "./routes/funeralHome.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const port = process.env.PORT || 5000;
const gracefulShutdownTimeoutMs = parseInt(
  process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || "30000",
);

logger.info("Starting Legacy Care SaaS API...");

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.debug(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
      "Request",
    );
  });
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/funeral-homes", funeralHomeRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

const shutdown = () => {
  logger.info("Graceful shutdown initiated");

  server.close(() => {
    logger.info("All connections closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error(`Forced exit after ${gracefulShutdownTimeoutMs}ms timeout`);
    process.exit(1);
  }, gracefulShutdownTimeoutMs);
};

//Process signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  process.exit(1);
});

export default app;
