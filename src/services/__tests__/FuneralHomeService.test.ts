import { describe, it, expect, vi, beforeEach } from "vitest";
import { FuneralHomeService } from "../FuneralHomeService";

describe("FuneralHomeService", () => {
  let funeralHomeService: any;
  let mockUserRepo: any;
  let mockFuneralHomeRepo: any;
  let mockStaffRepo: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByVerificationToken: vi.fn(),
      findByResetToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      incrementFailedAttempts: vi.fn(),
      resetFailedAttempts: vi.fn(),
    };

    mockFuneralHomeRepo = {
      findById: vi.fn(),
      findBySubdomain: vi.fn(),
      findByDomain: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockStaffRepo = {
      findByUserId: vi.fn(),
      findByFuneralHome: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockEmailService = {
      sendEmail: vi.fn(),
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };

    funeralHomeService = new FuneralHomeService(
      mockUserRepo,
      mockFuneralHomeRepo,
      mockStaffRepo,
      mockEmailService,
    );
  });

  describe("register", () => {
    it("should register a new funeral home with owner", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@test.com",
        firstName: "John",
        lastName: "Doe",
        isEmailVerified: false,
        createdAt: new Date(),
      };

      const mockFuneralHome = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test-funeral-home",
        domain: null,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStaff = {
        id: "staff-123",
        funeralHomeId: "fh-123",
        userId: "user-123",
        role: "OWNER",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockFuneralHomeRepo.findBySubdomain.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockFuneralHomeRepo.create.mockResolvedValue(mockFuneralHome);
      mockStaffRepo.create.mockResolvedValue(mockStaff);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await funeralHomeService.register(
        "Test Funeral Home",
        "test@test.com",
        "password123",
        "John",
        "Doe",
      );

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@test.com");
      expect(mockFuneralHomeRepo.findBySubdomain).toHaveBeenCalledWith(
        "test-funeral-home",
      );

      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: "test@test.com",
        passwordHash: "hashed_password",
        firstName: "John",
        lastName: "Doe",
        verificationToken: "mock-token-1234567890abcdef",
        verificationSentAt: expect.any(Date),
      });

      expect(mockFuneralHomeRepo.create).toHaveBeenCalledWith({
        name: "Test Funeral Home",
        subdomain: "test-funeral-home",
      });

      expect(mockStaffRepo.create).toHaveBeenCalledWith({
        funeralHomeId: "fh-123",
        userId: "user-123",
        role: "OWNER",
      });

      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        "test@test.com",
        "mock-token-1234567890abcdef",
      );

      expect(result.user.email).toBe("test@test.com");
      expect(result.funeralHome.name).toBe("Test Funeral Home");
      expect(result.funeralHome.subdomain).toBe("test-funeral-home");
    });

    it("should throw error if user already exists", async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        id: "existing-user",
        email: "test@test.com",
        passwordHash: "hashed",
        firstName: "Existing",
        lastName: "User",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationToken: null,
        verificationSentAt: null,
        resetPasswordToken: null,
        resetPasswordSentAt: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });

      await expect(
        funeralHomeService.register(
          "Test Funeral Home",
          "test@test.com",
          "password123",
          "John",
          "Doe",
        ),
      ).rejects.toThrow("User already exists. Please login.");

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@test.com");
      expect(mockFuneralHomeRepo.create).not.toHaveBeenCalled();
    });

    it("should throw error if business name is already taken", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockFuneralHomeRepo.findBySubdomain.mockResolvedValue({
        id: "existing-fh",
        name: "Existing Funeral Home",
        subdomain: "test-funeral-home",
        domain: null,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        funeralHomeService.register(
          "Test Funeral Home",
          "test@test.com",
          "password123",
          "John",
          "Doe",
        ),
      ).rejects.toThrow(
        "Business name already taken. Please choose a different name.",
      );

      expect(mockFuneralHomeRepo.findBySubdomain).toHaveBeenCalledWith(
        "test-funeral-home",
      );
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it("should handle special characters in business name for subdomain", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@test.com",
        firstName: "John",
        lastName: "Doe",
        isEmailVerified: false,
        createdAt: new Date(),
      };

      const mockFuneralHome = {
        id: "fh-123",
        name: "St. Mary's Funeral Home & Cremation",
        subdomain: "st--mary-s-funeral-home---cremation",
        domain: null,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStaff = {
        id: "staff-123",
        funeralHomeId: "fh-123",
        userId: "user-123",
        role: "OWNER",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockFuneralHomeRepo.findBySubdomain.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockFuneralHomeRepo.create.mockResolvedValue(mockFuneralHome);
      mockStaffRepo.create.mockResolvedValue(mockStaff);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await funeralHomeService.register(
        "St. Mary's Funeral Home & Cremation",
        "test@test.com",
        "password123",
        "John",
        "Doe",
      );

      expect(mockFuneralHomeRepo.create).toHaveBeenCalledWith({
        name: "St. Mary's Funeral Home & Cremation",
        subdomain: "st--mary-s-funeral-home---cremation",
      });
      expect(result.funeralHome.subdomain).toBe(
        "st--mary-s-funeral-home---cremation",
      );
    });
  });

  describe("updateBranding", () => {
    it("should update funeral home branding", async () => {
      const mockUpdated = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test-funeral-home",
        primaryColor: "#2d5016",
        secondaryColor: "#f5f5f5",
        logoUrl: "https://example.com/logo.png",
        domain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFuneralHomeRepo.update.mockResolvedValue(mockUpdated);

      const result = await funeralHomeService.updateBranding("fh-123", {
        primaryColor: "#2d5016",
        secondaryColor: "#f5f5f5",
        logoUrl: "https://example.com/logo.png",
      });

      expect(mockFuneralHomeRepo.update).toHaveBeenCalledWith("fh-123", {
        primaryColor: "#2d5016",
        secondaryColor: "#f5f5f5",
        logoUrl: "https://example.com/logo.png",
      });
      expect(result.primaryColor).toBe("#2d5016");
      expect(result.logoUrl).toBe("https://example.com/logo.png");
    });

    it("should update only provided fields", async () => {
      const mockUpdated = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test-funeral-home",
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
        logoUrl: "https://example.com/new-logo.png",
        domain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFuneralHomeRepo.update.mockResolvedValue(mockUpdated);

      const result = await funeralHomeService.updateBranding("fh-123", {
        logoUrl: "https://example.com/new-logo.png",
      });

      expect(mockFuneralHomeRepo.update).toHaveBeenCalledWith("fh-123", {
        logoUrl: "https://example.com/new-logo.png",
      });
      expect(result.logoUrl).toBe("https://example.com/new-logo.png");
    });
  });

  describe("getFuneralHome", () => {
    it("should return funeral home by ID", async () => {
      const mockFuneralHome = {
        id: "fh-123",
        name: "Test Funeral Home",
        subdomain: "test-funeral-home",
        domain: null,
        primaryColor: "#1a3a5c",
        secondaryColor: "#f8f9fa",
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFuneralHomeRepo.findById.mockResolvedValue(mockFuneralHome as any);

      const result = await funeralHomeService.getFuneralHome("fh-123");

      expect(mockFuneralHomeRepo.findById).toHaveBeenCalledWith("fh-123");
      expect(result).toEqual(mockFuneralHome);
    });

    it("should return null if funeral home not found", async () => {
      mockFuneralHomeRepo.findById.mockResolvedValue(null);

      const result = await funeralHomeService.getFuneralHome("non-existent");

      expect(mockFuneralHomeRepo.findById).toHaveBeenCalledWith("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("getStaff", () => {
    it("should return all staff for a funeral home", async () => {
      const mockStaff = [
        {
          id: "staff-1",
          userId: "user-1",
          role: "OWNER",
          funeralHomeId: "fh-123",
          invitedAt: new Date(),
          acceptedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "staff-2",
          userId: "user-2",
          role: "STAFF",
          funeralHomeId: "fh-123",
          invitedAt: new Date(),
          acceptedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStaffRepo.findByFuneralHome.mockResolvedValue(mockStaff as any);

      const result = await funeralHomeService.getStaff("fh-123");

      expect(mockStaffRepo.findByFuneralHome).toHaveBeenCalledWith("fh-123");
      expect(result).toEqual(mockStaff);
      expect(result.length).toBe(2);
    });
  });

  describe("inviteStaff", () => {
    it("should invite an existing user to be staff", async () => {
      const mockUser = {
        id: "user-456",
        email: "staff@test.com",
        firstName: "Jane",
        lastName: "Smith",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: "hashed",
        verificationToken: null,
        verificationSentAt: null,
        resetPasswordToken: null,
        resetPasswordSentAt: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };

      const mockStaff = {
        id: "staff-123",
        funeralHomeId: "fh-123",
        userId: "user-456",
        role: "STAFF",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockStaffRepo.findByUserId.mockResolvedValue(null);
      mockStaffRepo.create.mockResolvedValue(mockStaff as any);

      const result = await funeralHomeService.inviteStaff(
        "fh-123",
        "staff@test.com",
        "STAFF",
      );

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("staff@test.com");
      expect(mockStaffRepo.findByUserId).toHaveBeenCalledWith("user-456");
      expect(mockStaffRepo.create).toHaveBeenCalledWith({
        funeralHomeId: "fh-123",
        userId: "user-456",
        role: "STAFF",
      });
      expect(result.role).toBe("STAFF");
    });

    it("should invite a user with MANAGER role", async () => {
      const mockUser = {
        id: "user-456",
        email: "manager@test.com",
        firstName: "Jane",
        lastName: "Smith",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: "hashed",
        verificationToken: null,
        verificationSentAt: null,
        resetPasswordToken: null,
        resetPasswordSentAt: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };

      const mockStaff = {
        id: "staff-123",
        funeralHomeId: "fh-123",
        userId: "user-456",
        role: "MANAGER",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockStaffRepo.findByUserId.mockResolvedValue(null);
      mockStaffRepo.create.mockResolvedValue(mockStaff as any);

      const result = await funeralHomeService.inviteStaff(
        "fh-123",
        "manager@test.com",
        "MANAGER",
      );

      expect(mockStaffRepo.create).toHaveBeenCalledWith({
        funeralHomeId: "fh-123",
        userId: "user-456",
        role: "MANAGER",
      });
      expect(result.role).toBe("MANAGER");
    });

    it("should throw error if user not found", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        funeralHomeService.inviteStaff(
          "fh-123",
          "nonexistent@test.com",
          "STAFF",
        ),
      ).rejects.toThrow("User not found. They need to register first.");

      expect(mockStaffRepo.create).not.toHaveBeenCalled();
    });

    it("should throw error if user is already a staff member", async () => {
      const mockUser = {
        id: "user-456",
        email: "staff@test.com",
        firstName: "Jane",
        lastName: "Smith",
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: "hashed",
        verificationToken: null,
        verificationSentAt: null,
        resetPasswordToken: null,
        resetPasswordSentAt: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockStaffRepo.findByUserId.mockResolvedValue({
        id: "existing-staff",
        funeralHomeId: "fh-123",
        userId: "user-456",
        role: "STAFF",
        invitedAt: new Date(),
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        funeralHomeService.inviteStaff("fh-123", "staff@test.com", "STAFF"),
      ).rejects.toThrow("User is already a staff member.");

      expect(mockStaffRepo.create).not.toHaveBeenCalled();
    });
  });
});
