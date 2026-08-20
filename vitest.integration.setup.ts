import { beforeAll, afterAll, afterEach } from "vitest";
import { testLogger } from "./vitest.setup";
import { prisma } from "./src/lib/prisma";

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set for integration tests");
  }

  await prisma.$connect();
  testLogger.info("Integration test DB connected");
});

afterEach(async () => {
  if (!prisma) return;

  await prisma.payment.deleteMany();
  await prisma.case.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.funeralHome.deleteMany();

  testLogger.debug("Database cleaned after test");
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    testLogger.info("Integration test DB disconnected");
  }
});
