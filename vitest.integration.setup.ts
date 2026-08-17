// vitest.integration.setup.ts - INTEGRATION TESTS ONLY
import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { testLogger } from "./vitest.setup";

let prisma: PrismaClient;

// Setup real database connection
beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
  testLogger.info("Integration test DB connected");
});

afterEach(async () => {
  if (prisma) {
    // Clean in correct order (respect foreign keys)
    await prisma.refreshToken.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    testLogger.info(" Integration test DB disconnected");
  }
});

export { prisma };
