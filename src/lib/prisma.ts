import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { Pool } from "pg";
import logger from "./logger.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? [
          { emit: "event", level: "query" },
          { emit: "event", level: "info" },
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ]
      : [{ emit: "event", level: "error" }],
});

if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug(
      {
        query: e.query,
        params: e.params,
        duration: e.duration,
        timestamp: e.timestamp,
      },
      "Prisma Query",
    );
  });

  prisma.$on("info", (e) => {
    logger.info({ message: e.message }, "Prisma Info");
  });

  prisma.$on("warn", (e) => {
    logger.warn({ message: e.message }, "Prisma Warning");
  });

  prisma.$on("error", (e) => {
    logger.error({ message: e.message }, "Prisma Error");
  });
}

prisma
  .$connect()
  .then(() => {
    logger.info("Database connected successfully");
  })
  .catch((error) => {
    logger.error({ error: error.message }, "Database connection failed");
    process.exit(1);
  });

process.on("beforeExit", async () => {
  await prisma.$disconnect();
  logger.info("Database disconnected");
});

export { prisma };
