// backend/tests/unit/case.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CaseService } from "../CaseService";

describe("CaseService", () => {
  let caseService: CaseService;
  let mockCaseRepo: any;
  let mockFuneralHomeRepo: any;
  let mockEmailService: any;
  let mockLinkGenerator: any;
  let mockEmailTemplate: any;

  beforeEach(() => {
    mockCaseRepo = {
      findById: vi.fn(),
      findByFuneralHome: vi.fn(),
      findByAccessToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockFuneralHomeRepo = {
      findById: vi.fn(),
      findBySubdomain: vi.fn(),
      findByDomain: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockEmailService = {
      sendEmail: vi.fn(),
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };

    mockLinkGenerator = {
      generate: vi.fn(),
    };

    mockEmailTemplate = {
      subject: "Funeral Arrangements",
      html: vi.fn(),
      getSubject: vi.fn(),
      render: vi.fn(),
    };

    caseService = new CaseService(
      mockCaseRepo,
      mockFuneralHomeRepo,
      mockEmailService,
      mockLinkGenerator,
      mockEmailTemplate,
    );
  });

  describe("createAtNeedCase", () => {
    it("should create an at-need case with OPEN status", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        type: "AT_NEED",
        status: "OPEN",
        familyName: "Smith",
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.create.mockResolvedValue(mockCase);

      const result = await caseService.createAtNeedCase("fh-123", {
        familyName: "Smith",
        deceasedName: "John Smith",
        totalAmount: 5000,
      });

      expect(mockCaseRepo.create).toHaveBeenCalledWith({
        familyName: "Smith",
        deceasedName: "John Smith",
        totalAmount: 5000,
        funeralHomeId: "fh-123",
        type: "AT_NEED",
        status: "OPEN",
        paidAmount: 0,
      });
      expect(result.status).toBe("OPEN");
      expect(result.type).toBe("AT_NEED");
    });

    it("should create an at-need case with default totalAmount 0", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        type: "AT_NEED",
        status: "OPEN",
        familyName: "Smith",
        deceasedName: "John Smith",
        totalAmount: 0,
        paidAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.create.mockResolvedValue(mockCase);

      const result = await caseService.createAtNeedCase("fh-123", {
        familyName: "Smith",
        deceasedName: "John Smith",
      });

      expect(result.totalAmount).toBe(0);
    });
  });

  describe("createPreNeedCase", () => {
    it("should create a pre-need case with monthly payment", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        type: "PRE_NEED",
        status: "OPEN",
        familyName: "Smith",
        monthlyPayment: 50,
        totalAmount: 6000,
        paidAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.create.mockResolvedValue(mockCase);

      const result = await caseService.createPreNeedCase("fh-123", {
        familyName: "Smith",
        monthlyPayment: 50,
        totalAmount: 6000,
      });

      expect(mockCaseRepo.create).toHaveBeenCalledWith({
        familyName: "Smith",
        monthlyPayment: 50,
        totalAmount: 6000,
        funeralHomeId: "fh-123",
        type: "PRE_NEED",
        status: "OPEN",
        paidAmount: 0,
      });
      expect(result.type).toBe("PRE_NEED");
    });
  });

  describe("getCases", () => {
    it("should return all cases for a funeral home", async () => {
      const mockCases = [
        { id: "case-1", familyName: "Smith" },
        { id: "case-2", familyName: "Johnson" },
      ];

      mockCaseRepo.findByFuneralHome.mockResolvedValue(mockCases);

      const result = await caseService.getCases("fh-123");

      expect(mockCaseRepo.findByFuneralHome).toHaveBeenCalledWith("fh-123");
      expect(result).toEqual(mockCases);
    });
  });

  describe("getCase", () => {
    it("should return a single case by ID", async () => {
      const mockCase = { id: "case-123", familyName: "Smith" };

      mockCaseRepo.findById.mockResolvedValue(mockCase);

      const result = await caseService.getCase("case-123");

      expect(mockCaseRepo.findById).toHaveBeenCalledWith("case-123");
      expect(result).toEqual(mockCase);
    });
  });

  describe("updateCase", () => {
    it("should update a case", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        status: "IN_PROGRESS",
      };

      mockCaseRepo.update.mockResolvedValue(mockCase);

      const result = await caseService.updateCase("case-123", {
        status: "IN_PROGRESS",
      });

      expect(mockCaseRepo.update).toHaveBeenCalledWith("case-123", {
        status: "IN_PROGRESS",
      });
      expect(result).toEqual(mockCase);
    });
  });

  describe("generateFamilyLink", () => {
    it("should generate a secure access token and link", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        familyName: "Smith",
        deceasedName: "John Smith",
      };

      const mockFuneralHome = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test",
      };

      const mockLinkResult = {
        token: "mock-token-1234567890abcdef",
        link: "https://test.yourplatform.com/case/mock-token-1234567890abcdef",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockFuneralHomeRepo.findById.mockResolvedValue(mockFuneralHome);
      mockLinkGenerator.generate.mockReturnValue(mockLinkResult);
      mockCaseRepo.update.mockResolvedValue({ ...mockCase, ...mockLinkResult });

      const result = await caseService.generateFamilyLink("case-123");

      expect(mockCaseRepo.findById).toHaveBeenCalledWith("case-123");
      expect(mockFuneralHomeRepo.findById).toHaveBeenCalledWith("fh-123");
      expect(mockLinkGenerator.generate).toHaveBeenCalledWith("test");
      expect(mockCaseRepo.update).toHaveBeenCalledWith("case-123", {
        familyAccessToken: mockLinkResult.token,
        linkExpiresAt: mockLinkResult.expiresAt,
      });
      expect(result.token).toBe(mockLinkResult.token);
      expect(result.link).toContain("test");
      expect(result.link).toContain("/case/");
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById.mockResolvedValue(null);

      await expect(
        caseService.generateFamilyLink("invalid-case"),
      ).rejects.toThrow("Case not found");
    });

    it("should throw error if funeral home not found", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        familyName: "Smith",
        deceasedName: "John Smith",
      };

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockFuneralHomeRepo.findById.mockResolvedValue(null);

      await expect(caseService.generateFamilyLink("case-123")).rejects.toThrow(
        "Funeral home not found",
      );
    });
  });

  describe("sendFamilyLink", () => {
    it("should send email with family link when token exists", async () => {
      const mockFuneralHome = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test",
      };

      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        familyName: "Smith",
        deceasedName: "John Smith",
        familyAccessToken: "existing-token-123",
        linkExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const mockSubject = "Funeral Arrangements for John Smith";
      const mockHtml = "<html>Test email</html>";

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockFuneralHomeRepo.findById.mockResolvedValue(mockFuneralHome);
      mockEmailTemplate.getSubject.mockReturnValue(mockSubject);
      mockEmailTemplate.render.mockReturnValue(mockHtml);

      await caseService.sendFamilyLink("case-123", "family@test.com");

      expect(mockCaseRepo.findById).toHaveBeenCalledWith("case-123");
      expect(mockFuneralHomeRepo.findById).toHaveBeenCalledWith("fh-123");
      expect(mockEmailTemplate.getSubject).toHaveBeenCalledWith({
        deceasedName: "John Smith",
      });
      expect(mockEmailTemplate.render).toHaveBeenCalledWith({
        familyName: "Smith",
        deceasedName: "John Smith",
        link: "https://test.yourplatform.com/case/existing-token-123",
        expiresAt: expect.any(Date),
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: "family@test.com",
        subject: mockSubject,
        html: mockHtml,
      });
    });

    it("should generate a new token if none exists", async () => {
      const mockFuneralHome = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test",
      };

      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        familyName: "Smith",
        deceasedName: "John Smith",
        familyAccessToken: null,
        linkExpiresAt: null,
      };

      const mockLinkResult = {
        token: "new-token-123",
        link: "https://test.yourplatform.com/case/new-token-123",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const mockSubject = "Funeral Arrangements for John Smith";
      const mockHtml = "<html>Test email</html>";

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockFuneralHomeRepo.findById.mockResolvedValue(mockFuneralHome);
      mockLinkGenerator.generate.mockReturnValue(mockLinkResult);
      mockCaseRepo.update.mockResolvedValue({
        ...mockCase,
        familyAccessToken: mockLinkResult.token,
        linkExpiresAt: mockLinkResult.expiresAt,
      });
      mockEmailTemplate.getSubject.mockReturnValue(mockSubject);
      mockEmailTemplate.render.mockReturnValue(mockHtml);

      await caseService.sendFamilyLink("case-123", "family@test.com");

      expect(mockLinkGenerator.generate).toHaveBeenCalledWith("test");
      expect(mockCaseRepo.update).toHaveBeenCalledWith("case-123", {
        familyAccessToken: mockLinkResult.token,
        linkExpiresAt: mockLinkResult.expiresAt,
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById.mockResolvedValue(null);

      await expect(
        caseService.sendFamilyLink("invalid-case", "family@test.com"),
      ).rejects.toThrow("Case not found");
    });

    it("should throw error if funeral home not found when generating new token", async () => {
      const mockCase = {
        id: "case-123",
        funeralHomeId: "fh-123",
        familyName: "Smith",
        deceasedName: "John Smith",
        familyAccessToken: null,
        linkExpiresAt: null,
      };

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockFuneralHomeRepo.findById.mockResolvedValue(null);

      await expect(
        caseService.sendFamilyLink("case-123", "family@test.com"),
      ).rejects.toThrow("Funeral home not found");
    });
  });

  describe("getCaseByAccessToken", () => {
    it("should return case for valid token", async () => {
      const mockCase = {
        id: "case-123",
        familyAccessToken: "valid-token",
        familyName: "Smith",
        deceasedName: "John Smith",
      };

      mockCaseRepo.findByAccessToken.mockResolvedValue(mockCase);

      const result = await caseService.getCaseByAccessToken("valid-token");

      expect(mockCaseRepo.findByAccessToken).toHaveBeenCalledWith(
        "valid-token",
      );
      expect(result).toEqual(mockCase);
    });

    it("should return null for expired token", async () => {
      mockCaseRepo.findByAccessToken.mockResolvedValue(null);

      const result = await caseService.getCaseByAccessToken("expired-token");

      expect(result).toBeNull();
    });
  });

  describe("closeCase", () => {
    it("should close an open case", async () => {
      const mockCase = {
        id: "case-123",
        status: "OPEN",
        familyName: "Smith",
      };

      mockCaseRepo.findById.mockResolvedValue(mockCase);
      mockCaseRepo.update.mockResolvedValue({ ...mockCase, status: "CLOSED" });

      await caseService.closeCase("case-123");

      expect(mockCaseRepo.findById).toHaveBeenCalledWith("case-123");
      expect(mockCaseRepo.update).toHaveBeenCalledWith("case-123", {
        status: "CLOSED",
      });
    });

    it("should throw error if case already closed", async () => {
      const mockCase = {
        id: "case-123",
        status: "CLOSED",
        familyName: "Smith",
      };

      mockCaseRepo.findById.mockResolvedValue(mockCase);

      await expect(caseService.closeCase("case-123")).rejects.toThrow(
        "Case is already closed",
      );
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById.mockResolvedValue(null);

      await expect(caseService.closeCase("invalid-case")).rejects.toThrow(
        "Case not found",
      );
    });
  });
});
