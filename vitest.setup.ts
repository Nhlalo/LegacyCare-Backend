import { vi, beforeAll } from "vitest";
import pino from "pino";

const testLogger = pino({
  level: process.env.LOG_LEVEL || "silent",
  transport: undefined,
});

vi.mock("../src/lib/logger", () => ({
  default: testLogger,
  logger: testLogger,
}));

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ACCESS_TOKEN_EXPIRY = "15m";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.LOG_LEVEL = "silent";

export { testLogger };
