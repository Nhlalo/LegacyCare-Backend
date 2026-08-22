import { describe, it, expect, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { testLogger } from "../../vitest.setup";
import jwt from "jsonwebtoken";

describe("Payment Integration Tests", () => {
  let authToken: string;
  let funeralHomeId: string;
  let testCaseId: string;
  let testUser: any;
  let userId: string;

  afterEach(async () => {
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.case.deleteMany(),
      prisma.staff.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
      prisma.funeralHome.deleteMany(),
    ]);
    testLogger.debug("🧹 Database cleaned after test");
  });

  beforeEach(async () => {
    const timestamp = Date.now();

    const user = await prisma.user.create({
      data: {
        email: `test-${timestamp}@test.com`,
        passwordHash: "$2b$12$hashedpassword1234567890",
        firstName: "Test",
        lastName: "User",
        isEmailVerified: true,
        verificationToken: `verify-${timestamp}`,
        verificationSentAt: new Date(),
      },
    });
    testUser = user;
    userId = user.id;

    const funeralHome = await prisma.funeralHome.create({
      data: {
        name: `Test Funeral Home ${timestamp}`,
        subdomain: `test-${timestamp}`,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
      },
    });
    funeralHomeId = funeralHome.id;

    await prisma.staff.create({
      data: {
        funeralHomeId: funeralHome.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const testCase = await prisma.case.create({
      data: {
        funeralHomeId: funeralHome.id,
        type: "AT_NEED",
        status: "OPEN",
        familyName: "Smith",
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
      },
    });
    testCaseId = testCase.id;

    const jwtSecret =
      process.env.JWT_ACCESS_SECRET || "your-super-secret-access-key-here";
    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "15m",
    });
    authToken = token;

    testLogger.debug(`Created test user: ${user.id} with token`);
  });

  // Helper function to create users with different roles
  const createUserWithRole = async (role: string) => {
    const timestamp = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `test-${role}-${timestamp}@test.com`,
        passwordHash: "$2b$12$hashedpassword1234567890",
        firstName: "Test",
        lastName: role,
        isEmailVerified: true,
        verificationToken: `verify-${role}-${timestamp}`,
        verificationSentAt: new Date(),
      },
    });

    const funeralHome = await prisma.funeralHome.create({
      data: {
        name: `Test Funeral Home ${role} ${timestamp}`,
        subdomain: `test-${role}-${timestamp}`,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
      },
    });

    await prisma.staff.create({
      data: {
        funeralHomeId: funeralHome.id,
        userId: user.id,
        role: role as any,
      },
    });

    const testCase = await prisma.case.create({
      data: {
        funeralHomeId: funeralHome.id,
        type: "AT_NEED",
        status: "OPEN",
        familyName: `${role} Family`,
        deceasedName: `${role} Deceased`,
        totalAmount: 5000,
        paidAmount: 0,
      },
    });

    const jwtSecret =
      process.env.JWT_ACCESS_SECRET || "your-super-secret-access-key-here";
    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "15m",
    });

    return { user, funeralHome, testCase, token };
  };

  const debugResponse = (response: any, testName: string) => {
    if (response.status >= 400) {
      console.log(`${testName} failed:`);
      console.log("Status:", response.status);
      console.log("Body:", JSON.stringify(response.body, null, 2));
    }
  };

  describe("POST /api/payments/manual", () => {
    it("should record a manual payment with STAFF role (OWNER)", async () => {
      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          amount: 1000,
          method: "CASH",
          reference: "REF-123",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(1000);
      expect(response.body.data.method).toBe("CASH");
      expect(response.body.data.status).toBe("COMPLETED");

      const caseData = await prisma.case.findUnique({
        where: { id: testCaseId },
      });
      expect(caseData?.paidAmount).toBe(1000);
    });

    it("should return 400 if amount is invalid", async () => {
      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          amount: -100,
          method: "CASH",
          reference: "REF-123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it("should return 400 if method is invalid", async () => {
      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          amount: 1000,
          method: "INVALID_METHOD",
          reference: "REF-123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it("should return 403 for unauthorized case", async () => {
      const { testCase } = await createUserWithRole("LIMITED");

      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CASH",
          reference: "REF-456",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/payments/manual").send({
        caseId: testCaseId,
        amount: 1000,
        method: "CASH",
        reference: "REF-123",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token, testCase } = await createUserWithRole("LIMITED");

      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CASH",
          reference: "REF-123",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });

    it("should allow STAFF role to record manual payment", async () => {
      const { token, testCase } = await createUserWithRole("STAFF");

      const response = await request(app)
        .post("/api/payments/manual")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CASH",
          reference: "REF-123",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/payments/case/:caseId", () => {
    it("should return all payments for a case with LIMITED role", async () => {
      await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 1000,
          method: "CASH",
          status: "COMPLETED",
          reference: "REF-001",
        },
      });

      await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 2000,
          method: "EFT",
          status: "COMPLETED",
          reference: "REF-002",
        },
      });

      const response = await request(app)
        .get(`/api/payments/case/${testCaseId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it("should return empty array if no payments", async () => {
      const response = await request(app)
        .get(`/api/payments/case/${testCaseId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it("should return 403 for unauthorized case", async () => {
      const { testCase } = await createUserWithRole("STAFF");

      const response = await request(app)
        .get(`/api/payments/case/${testCase.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(
        `/api/payments/case/${testCaseId}`,
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it("should allow LIMITED role to view payments", async () => {
      const { token, testCase } = await createUserWithRole("LIMITED");

      await prisma.payment.create({
        data: {
          caseId: testCase.id,
          amount: 500,
          method: "CASH",
          status: "COMPLETED",
          reference: "REF-001",
        },
      });

      const response = await request(app)
        .get(`/api/payments/case/${testCase.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/payments/case/:caseId/status", () => {
    it("should return payment status for a case with LIMITED role", async () => {
      const { token, testCase } = await createUserWithRole("LIMITED");

      await prisma.payment.create({
        data: {
          caseId: testCase.id,
          amount: 1000,
          method: "CASH",
          status: "COMPLETED",
          reference: "REF-001",
        },
      });

      await prisma.payment.create({
        data: {
          caseId: testCase.id,
          amount: 2000,
          method: "EFT",
          status: "COMPLETED",
          reference: "REF-002",
        },
      });

      const response = await request(app)
        .get(`/api/payments/case/${testCase.id}/status`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(5000);
      expect(response.body.data.paid).toBe(3000);
      expect(response.body.data.remaining).toBe(2000);
      expect(response.body.data.isFullyPaid).toBe(false);
    });

    it("should return isFullyPaid true when fully paid", async () => {
      await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 3000,
          method: "CASH",
          status: "COMPLETED",
          reference: "REF-001",
        },
      });

      await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 2000,
          method: "EFT",
          status: "COMPLETED",
          reference: "REF-002",
        },
      });

      const response = await request(app)
        .get(`/api/payments/case/${testCaseId}/status`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFullyPaid).toBe(true);
      expect(response.body.data.remaining).toBe(0);
    });

    it("should return 403 for unauthorized case", async () => {
      const { testCase } = await createUserWithRole("STAFF");

      const response = await request(app)
        .get(`/api/payments/case/${testCase.id}/status`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get(
        `/api/payments/case/${testCaseId}/status`,
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it("should allow LIMITED role to view payment status", async () => {
      const { token, testCase } = await createUserWithRole("LIMITED");

      await prisma.payment.create({
        data: {
          caseId: testCase.id,
          amount: 500,
          method: "CASH",
          status: "COMPLETED",
          reference: "REF-001",
        },
      });

      const response = await request(app)
        .get(`/api/payments/case/${testCase.id}/status`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(5000);
      expect(response.body.data.paid).toBe(500);
    });
  });

  describe("POST /api/payments/webhook/payfast", () => {
    it("should handle PayFast webhook (public endpoint - no auth required)", async () => {
      const transactionId = `txn-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 1000,
          method: "CREDIT_CARD",
          status: "PENDING",
          transactionId: transactionId,
        },
      });

      const webhookPayload = {
        payment_status: "COMPLETE",
        amount: "1000.00",
        m_payment_id: transactionId,
        reference: "REF-WEBHOOK",
      };

      const response = await request(app)
        .post("/api/payments/webhook/payfast")
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe("OK");

      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment?.status).toBe("COMPLETED");
      expect(updatedPayment?.reference).toBe("REF-WEBHOOK");

      const caseData = await prisma.case.findUnique({
        where: { id: testCaseId },
      });
      expect(caseData?.paidAmount).toBe(1000);
    });

    it("should handle webhook with non-complete status", async () => {
      const transactionId = `txn-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          caseId: testCaseId,
          amount: 1000,
          method: "CREDIT_CARD",
          status: "PENDING",
          transactionId: transactionId,
        },
      });

      const webhookPayload = {
        payment_status: "FAILED",
        amount: "1000.00",
        m_payment_id: transactionId,
        reference: "REF-FAILED",
      };

      const response = await request(app)
        .post("/api/payments/webhook/payfast")
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe("OK");

      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment?.status).toBe("PENDING");
    });

    it("should handle webhook with invalid payment", async () => {
      const webhookPayload = {
        payment_status: "COMPLETE",
        amount: "1000.00",
        m_payment_id: "invalid-txn",
        reference: "REF-INVALID",
      };

      const response = await request(app)
        .post("/api/payments/webhook/payfast")
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe("OK");
    });
  });

  describe("POST /api/payments/create", () => {
    it("should create an online payment with STAFF role (OWNER)", async () => {
      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          amount: 1000,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentUrl).toBeDefined();
      expect(response.body.data.transactionId).toBeDefined();

      const payments = await prisma.payment.findMany({
        where: { caseId: testCaseId },
        orderBy: { createdAt: "desc" },
      });
      expect(payments.length).toBe(1);
      expect(payments[0].status).toBe("PENDING");
      expect(payments[0].amount).toBe(1000);
    });

    it("should return 400 if amount is invalid", async () => {
      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          amount: 0,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it("should return 400 if caseId is missing", async () => {
      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 1000,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it("should return 403 for unauthorized case", async () => {
      const { testCase } = await createUserWithRole("STAFF");

      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/payments/create").send({
        caseId: testCaseId,
        amount: 1000,
        method: "CREDIT_CARD",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token, testCase } = await createUserWithRole("LIMITED");

      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });

    it("should allow STAFF role to create online payment", async () => {
      const { token, testCase } = await createUserWithRole("STAFF");

      const response = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
          amount: 500,
          method: "CREDIT_CARD",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentUrl).toBeDefined();
    });
  });
});
