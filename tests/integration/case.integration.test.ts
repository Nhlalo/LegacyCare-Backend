import { describe, it, expect, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { testLogger } from "../../vitest.setup";
import jwt from "jsonwebtoken";

describe("Case Integration Tests", () => {
  let authToken: string;
  let funeralHomeId: string;
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
    testLogger.debug("Database cleaned after test");
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

    const funeralHome = await prisma.funeralHome.create({
      data: {
        name: `Test Funeral Home ${timestamp}`,
        subdomain: `test-${timestamp}`,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
      },
    });

    await prisma.staff.create({
      data: {
        funeralHomeId: funeralHome.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    userId = user.id;
    funeralHomeId = funeralHome.id;

    const jwtSecret =
      process.env.JWT_ACCESS_SECRET || "your-super-secret-access-key-here";
    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "15m",
    });
    authToken = token;

    testLogger.debug(`✅ Created test user: ${user.id} with token`);
  });

  const debugResponse = (response: any, testName: string) => {
    if (response.status >= 400) {
      console.log(`${testName} failed:`);
      console.log("Status:", response.status);
      console.log("Body:", JSON.stringify(response.body, null, 2));
    }
  };

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

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET || "your-super-secret-access-key-here",
      { expiresIn: "15m" },
    );

    return { user, funeralHome, token };
  };

  describe("POST /api/cases/at-need", () => {
    it("should create an at-need case when authenticated with STAFF role", async () => {
      const response = await request(app)
        .post("/api/cases/at-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Smith",
          deceasedName: "John Smith",
          serviceDate: "2026-08-20T10:00:00Z",
          serviceLocation: "123 Main St, Cape Town",
          totalAmount: 5000,
        });

      debugResponse(response, "create at-need case");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe("AT_NEED");
      expect(response.body.data.status).toBe("OPEN");
      expect(response.body.data.familyName).toBe("Smith");
      expect(response.body.data.deceasedName).toBe("John Smith");
      expect(response.body.data.totalAmount).toBe(5000);
      expect(response.body.data.funeralHomeId).toBe(funeralHomeId);

      const caseInDb = await prisma.case.findUnique({
        where: { id: response.body.data.id },
      });
      expect(caseInDb).toBeTruthy();
      expect(caseInDb?.funeralHomeId).toBe(funeralHomeId);
      expect(caseInDb?.familyName).toBe("Smith");
    });

    it("should create an at-need case with default totalAmount 0", async () => {
      const response = await request(app)
        .post("/api/cases/at-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Johnson",
          deceasedName: "Mary Johnson",
        });

      debugResponse(response, "create at-need with default total");

      expect(response.status).toBe(201);
      expect(response.body.data.totalAmount).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/cases/at-need").send({
        familyName: "Williams",
        deceasedName: "Robert Williams",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it("should return 400 if familyName is missing", async () => {
      const response = await request(app)
        .post("/api/cases/at-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          deceasedName: "Jane Doe",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");

      const response = await request(app)
        .post("/api/cases/at-need")
        .set("Authorization", `Bearer ${token}`)
        .send({
          familyName: "Smith",
          deceasedName: "John Smith",
          totalAmount: 5000,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/cases/pre-need", () => {
    it("should create a pre-need case when authenticated with STAFF role", async () => {
      const response = await request(app)
        .post("/api/cases/pre-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Williams",
          monthlyPayment: 50,
          totalAmount: 6000,
        });

      debugResponse(response, "create pre-need case");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe("PRE_NEED");
      expect(response.body.data.status).toBe("OPEN");
      expect(response.body.data.familyName).toBe("Williams");
      expect(response.body.data.monthlyPayment).toBe(50);
      expect(response.body.data.totalAmount).toBe(6000);

      const caseInDb = await prisma.case.findUnique({
        where: { id: response.body.data.id },
      });
      expect(caseInDb).toBeTruthy();
      expect(caseInDb?.funeralHomeId).toBe(funeralHomeId);
      expect(caseInDb?.monthlyPayment).toBe(50);
    });

    it("should return 400 if monthlyPayment is missing", async () => {
      const response = await request(app)
        .post("/api/cases/pre-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Brown",
          totalAmount: 6000,
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });

    it("should return 400 if totalAmount is missing", async () => {
      const response = await request(app)
        .post("/api/cases/pre-need")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Davis",
          monthlyPayment: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");

      const response = await request(app)
        .post("/api/cases/pre-need")
        .set("Authorization", `Bearer ${token}`)
        .send({
          familyName: "Williams",
          monthlyPayment: 50,
          totalAmount: 6000,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("GET /api/cases", () => {
    it("should return list of cases for the funeral home with LIMITED role", async () => {
      await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Smith",
          deceasedName: "John Smith",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });
      await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "PRE_NEED",
          status: "OPEN",
          familyName: "Williams",
          monthlyPayment: 50,
          totalAmount: 6000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .get("/api/cases")
        .set("Authorization", `Bearer ${authToken}`);

      debugResponse(response, "get cases list");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].familyName).toBeDefined();
    });

    it("should return empty array if no cases exist", async () => {
      const response = await request(app)
        .get("/api/cases")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/cases");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/cases/:id", () => {
    it("should return a specific case with LIMITED role", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Wilson",
          deceasedName: "Mary Wilson",
          totalAmount: 7000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .get(`/api/cases/${testCase.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testCase.id);
      expect(response.body.data.familyName).toBe("Wilson");
      expect(response.body.data.deceasedName).toBe("Mary Wilson");
    });

    it("should return 404 if case not found", async () => {
      const response = await request(app)
        .get("/api/cases/nonexistent-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Case not found");
    });

    it("should return 403 if case belongs to different funeral home", async () => {
      const otherFuneralHome = await prisma.funeralHome.create({
        data: {
          name: "Other Funeral Home",
          subdomain: `other-${Date.now()}`,
        },
      });

      const otherCase = await prisma.case.create({
        data: {
          funeralHomeId: otherFuneralHome.id,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Martinez",
          deceasedName: "Carlos Martinez",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .get(`/api/cases/${otherCase.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/cases/:id", () => {
    it("should update a case with STAFF role", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Taylor",
          deceasedName: "James Taylor",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Taylor Updated",
          deceasedName: "James Taylor Jr",
          status: "IN_PROGRESS",
          totalAmount: 6000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.familyName).toBe("Taylor Updated");
      expect(response.body.data.deceasedName).toBe("James Taylor Jr");
      expect(response.body.data.status).toBe("IN_PROGRESS");
      expect(response.body.data.totalAmount).toBe(6000);
    });

    it("should return 403 if case belongs to different funeral home", async () => {
      const otherFuneralHome = await prisma.funeralHome.create({
        data: {
          name: "Other Funeral Home",
          subdomain: `other2-${Date.now()}`,
        },
      });

      const otherCase = await prisma.case.create({
        data: {
          funeralHomeId: otherFuneralHome.id,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Anderson",
          deceasedName: "Lisa Anderson",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .put(`/api/cases/${otherCase.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          familyName: "Anderson Updated",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Taylor",
          deceasedName: "James Taylor",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          familyName: "Taylor Updated",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/cases/generate-link", () => {
    it("should generate a family link for a case with STAFF role", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Brown",
          deceasedName: "Robert Brown",
          totalAmount: 3000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/generate-link")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCase.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.link).toContain("/case/");
      expect(response.body.data.expiresAt).toBeDefined();

      const updatedCase = await prisma.case.findUnique({
        where: { id: testCase.id },
      });
      expect(updatedCase?.familyAccessToken).toBeDefined();
      expect(updatedCase?.linkExpiresAt).toBeDefined();
    });

    it("should return 404 if case not found", async () => {
      const response = await request(app)
        .post("/api/cases/generate-link")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: "nonexistent-id",
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Case not found");
    });

    it("should return 403 if case belongs to different funeral home", async () => {
      const otherFuneralHome = await prisma.funeralHome.create({
        data: {
          name: "Other Funeral Home",
          subdomain: `other3-${Date.now()}`,
        },
      });

      const otherCase = await prisma.case.create({
        data: {
          funeralHomeId: otherFuneralHome.id,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Garcia",
          deceasedName: "Maria Garcia",
          totalAmount: 4000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/generate-link")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: otherCase.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Brown",
          deceasedName: "Robert Brown",
          totalAmount: 3000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/generate-link")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/cases/send-link", () => {
    it("should send a family link email with STAFF role", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Davis",
          deceasedName: "Michael Davis",
          totalAmount: 3000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/send-link")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCase.id,
          email: "family@test.com",
        });

      console.log("Status:", response.status);
      console.log("Body:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Link sent to family@test.com successfully.",
      );
    });

    it("should return 400 if email is missing", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Miller",
          deceasedName: "Sarah Miller",
          totalAmount: 3000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/send-link")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          caseId: testCase.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email is required");
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Davis",
          deceasedName: "Michael Davis",
          totalAmount: 3000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post("/api/cases/send-link")
        .set("Authorization", `Bearer ${token}`)
        .send({
          caseId: testCase.id,
          email: "family@test.com",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/cases/:id/close", () => {
    it("should close a case with STAFF role", async () => {
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Wilson",
          deceasedName: "Charles Wilson",
          totalAmount: 4000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post(`/api/cases/${testCase.id}/close`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Case closed successfully.");

      const updatedCase = await prisma.case.findUnique({
        where: { id: testCase.id },
      });
      expect(updatedCase?.status).toBe("CLOSED");
    });

    it("should return 404 if case not found", async () => {
      const response = await request(app)
        .post("/api/cases/nonexistent-id/close")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Case not found");
    });

    it("should return 403 if case belongs to different funeral home", async () => {
      const otherFuneralHome = await prisma.funeralHome.create({
        data: {
          name: "Other Funeral Home",
          subdomain: `other4-${Date.now()}`,
        },
      });

      const otherCase = await prisma.case.create({
        data: {
          funeralHomeId: otherFuneralHome.id,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Rodriguez",
          deceasedName: "David Rodriguez",
          totalAmount: 5000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post(`/api/cases/${otherCase.id}/close`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should return 403 if user has LIMITED role (requireStaff)", async () => {
      const { token } = await createUserWithRole("LIMITED");
      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Wilson",
          deceasedName: "Charles Wilson",
          totalAmount: 4000,
          paidAmount: 0,
        },
      });

      const response = await request(app)
        .post(`/api/cases/${testCase.id}/close`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("GET /api/cases/public/:token", () => {
    it("should return case data for valid token (public - no auth required)", async () => {
      const accessToken = `test-token-${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const testCase = await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Martinez",
          deceasedName: "Maria Martinez",
          totalAmount: 5000,
          paidAmount: 0,
          familyAccessToken: accessToken,
          linkExpiresAt: expiresAt,
        },
      });

      const response = await request(app).get(
        `/api/cases/public/${accessToken}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.familyName).toBe("Martinez");
      expect(response.body.data.deceasedName).toBe("Maria Martinez");
      expect(response.body.data.id).toBe(testCase.id);
    });

    it("should return 404 for expired token", async () => {
      const expiredToken = `expired-token-${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      await prisma.case.create({
        data: {
          funeralHomeId: funeralHomeId,
          type: "AT_NEED",
          status: "OPEN",
          familyName: "Garcia",
          deceasedName: "Juan Garcia",
          totalAmount: 3000,
          paidAmount: 0,
          familyAccessToken: expiredToken,
          linkExpiresAt: expiresAt,
        },
      });

      const response = await request(app).get(
        `/api/cases/public/${expiredToken}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Case not found or link expired");
    });

    it("should return 404 for invalid token", async () => {
      const response = await request(app).get(
        "/api/cases/public/invalid-token-12345",
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Case not found or link expired");
    });
  });
});
