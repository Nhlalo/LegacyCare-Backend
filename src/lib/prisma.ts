import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { Pool } from "pg";
import logger from "./logger.js";
import dotenv from "dotenv";
import path from "path";

const env = process.env.NODE_ENV || "development";
const envFiles = {
  test: ".env.test",
  development: ".env",
  production: ".env.production",
};
const envFile = envFiles[env as keyof typeof envFiles] || ".env";
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });
console.log(` Environment: ${env} (loaded from ${envFile})`);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    `DATABASE_URL is required for ${env} environment. ` +
      `Please check your ${envFile} file`,
  );
}

const getPoolConfig = () => {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "test":
      return {
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 2000,
      };
    case "production":
      return {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    case "development":
    default:
      return {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
  }
};

const pool = new Pool({
  connectionString,
  ...getPoolConfig(),
});

const adapter = new PrismaPg(pool);

const getLogLevel = () => {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "test":
      return [];
    case "production":
      return [{ emit: "event", level: "error" }];
    case "development":
    default:
      return [
        { emit: "event", level: "query" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ];
  }
};

const prisma = new PrismaClient({
  adapter,
  log: getLogLevel() as any,
});

// Event listeners
if (process.env.NODE_ENV === "development") {
  prisma.$on("query" as any, (e: any) => {
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

  prisma.$on("info" as any, (e: any) => {
    logger.info({ message: e.message }, "Prisma Info");
  });

  prisma.$on("warn" as any, (e: any) => {
    logger.warn({ message: e.message }, "Prisma Warning");
  });

  prisma.$on("error" as any, (e: any) => {
    logger.error({ message: e.message }, "Prisma Error");
  });
}

if (process.env.NODE_ENV === "production") {
  prisma.$on("error" as any, (e: any) => {
    logger.error({ message: e.message }, "Prisma Error");
  });
}

// Connection management
prisma
  .$connect()
  .then(() => {
    const env = process.env.NODE_ENV || "development";
    logger.info(`Database connected successfully (${env} environment)`);
  })
  .catch((error) => {
    logger.error({ error: error.message }, "Database connection failed");
    process.exit(1);
  });

process.on("beforeExit", async () => {
  await prisma.$disconnect();
  logger.info("Database disconnected");
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  logger.info("Database disconnected (SIGTERM)");
  process.exit(0);
});

export { prisma };
