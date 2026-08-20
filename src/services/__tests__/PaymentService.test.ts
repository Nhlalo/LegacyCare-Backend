// backend/tests/unit/payment.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "../PaymentService";
import { IPaymentRepository } from "../../interfaces/IPaymentRepository";
import { ICaseRepository } from "../../interfaces/ICaseRepository";
import { IPaymentGateway } from "../../interfaces/IPaymentGateway";
import { IWebhookHandler } from "../../interfaces/IWebhookHandler";
import { PaymentMethod, PaymentStatus } from "../../../generated/prisma";

describe("PaymentService", () => {
  let paymentService: PaymentService;
  let mockPaymentRepo: IPaymentRepository;
  let mockCaseRepo: ICaseRepository;
  let mockPaymentGateway: IPaymentGateway;
  let mockWebhookHandler: IWebhookHandler;

  beforeEach(() => {
    mockPaymentRepo = {
      create: vi.fn(),
      findByCaseId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      getTotalPaid: vi.fn(),
    };

    mockCaseRepo = {
      findById: vi.fn(),
      findByFuneralHome: vi.fn(),
      findByAccessToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockPaymentGateway = {
      createPayment: vi.fn(),
      verifyPayment: vi.fn(),
    };

    mockWebhookHandler = {
      handleWebhook: vi.fn(),
    };

    paymentService = new PaymentService(
      mockPaymentRepo,
      mockCaseRepo,
      mockPaymentGateway,
      mockWebhookHandler,
    );
  });

  describe("createOnlinePayment", () => {
    it("should create an online payment and return payment URL", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaymentResponse = {
        paymentUrl: "https://payfast.co.za/pay/123",
        transactionId: "txn-123",
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentGateway.createPayment = vi
        .fn()
        .mockResolvedValue(mockPaymentResponse);
      mockPaymentRepo.create = vi.fn().mockResolvedValue({
        id: "payment-123",
        caseId: "case-123",
        amount: 5000,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.PENDING,
        transactionId: "txn-123",
        reference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await paymentService.createOnlinePayment(
        "case-123",
        5000,
        "https://example.com/success",
        "https://example.com/cancel",
      );

      expect(mockCaseRepo.findById).toHaveBeenCalledWith("case-123");
      expect(mockPaymentGateway.createPayment).toHaveBeenCalledWith({
        amount: 5000,
        reference: "Smith",
        description: "Funeral arrangements payment for Smith",
        returnUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect(mockPaymentRepo.create).toHaveBeenCalledWith({
        caseId: "case-123",
        amount: 5000,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.PENDING,
        transactionId: "txn-123",
      });
      expect(result.paymentUrl).toBe("https://payfast.co.za/pay/123");
      expect(result.transactionId).toBe("txn-123");
    });

    it("should use caseId as reference if familyName is not available", async () => {
      const mockCase = {
        id: "case-123",
        familyName: null,
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaymentResponse = {
        paymentUrl: "https://payfast.co.za/pay/123",
        transactionId: "txn-123",
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentGateway.createPayment = vi
        .fn()
        .mockResolvedValue(mockPaymentResponse);
      mockPaymentRepo.create = vi.fn().mockResolvedValue({
        id: "payment-123",
        caseId: "case-123",
        amount: 5000,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.PENDING,
        transactionId: "txn-123",
        reference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await paymentService.createOnlinePayment(
        "case-123",
        5000,
        "https://example.com/success",
        "https://example.com/cancel",
      );

      expect(mockPaymentGateway.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "case-123",
        }),
      );
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById = vi.fn().mockResolvedValue(null);

      await expect(
        paymentService.createOnlinePayment(
          "invalid-case",
          5000,
          "https://example.com/success",
          "https://example.com/cancel",
        ),
      ).rejects.toThrow("Case not found");
    });
  });

  describe("recordManualPayment", () => {
    it("should record a manual payment and update case paid amount", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPayment = {
        id: "payment-123",
        caseId: "case-123",
        amount: 1000,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        reference: "REF-123",
        transactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentRepo.create = vi.fn().mockResolvedValue(mockPayment);
      mockPaymentRepo.getTotalPaid = vi.fn().mockResolvedValue(1000);

      const result = await paymentService.recordManualPayment(
        "case-123",
        1000,
        "CASH",
        "REF-123",
      );

      expect(mockPaymentRepo.create).toHaveBeenCalledWith({
        caseId: "case-123",
        amount: 1000,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        reference: "REF-123",
      });
      expect(mockPaymentRepo.getTotalPaid).toHaveBeenCalledWith("case-123");
      expect(mockCaseRepo.update).toHaveBeenCalledWith("case-123", {
        paidAmount: 1000,
      });
      expect(result).toEqual(mockPayment);
    });

    it("should handle EFT payment method", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPayment = {
        id: "payment-123",
        caseId: "case-123",
        amount: 2000,
        method: PaymentMethod.EFT,
        status: PaymentStatus.COMPLETED,
        reference: "EFT-456",
        transactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentRepo.create = vi.fn().mockResolvedValue(mockPayment);
      mockPaymentRepo.getTotalPaid = vi.fn().mockResolvedValue(2000);

      const result = await paymentService.recordManualPayment(
        "case-123",
        2000,
        "EFT",
        "EFT-456",
      );

      expect(mockPaymentRepo.create).toHaveBeenCalledWith({
        caseId: "case-123",
        amount: 2000,
        method: PaymentMethod.EFT,
        status: PaymentStatus.COMPLETED,
        reference: "EFT-456",
      });
      expect(result.method).toBe(PaymentMethod.EFT);
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById = vi.fn().mockResolvedValue(null);

      await expect(
        paymentService.recordManualPayment(
          "invalid-case",
          1000,
          "CASH",
          "REF-123",
        ),
      ).rejects.toThrow("Case not found");
    });
  });

  describe("getPayments", () => {
    it("should return payments for a case", async () => {
      const mockPayments = [
        {
          id: "payment-123",
          caseId: "case-123",
          amount: 1000,
          method: PaymentMethod.CASH,
          status: PaymentStatus.COMPLETED,
          reference: "REF-123",
          transactionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "payment-456",
          caseId: "case-123",
          amount: 2000,
          method: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.PENDING,
          reference: null,
          transactionId: "txn-456",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentRepo.findByCaseId = vi.fn().mockResolvedValue(mockPayments);

      const result = await paymentService.getPayments("case-123");

      expect(mockPaymentRepo.findByCaseId).toHaveBeenCalledWith("case-123");
      expect(result).toEqual(mockPayments);
      expect(result).toHaveLength(2);
    });
  });

  describe("getPaymentStatus", () => {
    it("should return payment status for a case", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentRepo.getTotalPaid = vi.fn().mockResolvedValue(3000);

      const result = await paymentService.getPaymentStatus("case-123");

      expect(result.total).toBe(5000);
      expect(result.paid).toBe(3000);
      expect(result.remaining).toBe(2000);
      expect(result.isFullyPaid).toBe(false);
    });

    it("should return isFullyPaid true when fully paid", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 5000,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentRepo.getTotalPaid = vi.fn().mockResolvedValue(5000);

      const result = await paymentService.getPaymentStatus("case-123");

      expect(result.isFullyPaid).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("should handle zero total amount", async () => {
      const mockCase = {
        id: "case-123",
        familyName: "Smith",
        funeralHomeId: "fh-123",
        type: "AT_NEED" as const,
        status: "OPEN" as const,
        deceasedName: "John Smith",
        totalAmount: 0,
        paidAmount: 0,
        serviceDate: null,
        serviceLocation: null,
        familyAccessToken: null,
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCaseRepo.findById = vi.fn().mockResolvedValue(mockCase);
      mockPaymentRepo.getTotalPaid = vi.fn().mockResolvedValue(0);

      const result = await paymentService.getPaymentStatus("case-123");

      expect(result.total).toBe(0);
      expect(result.paid).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.isFullyPaid).toBe(true);
    });

    it("should throw error if case not found", async () => {
      mockCaseRepo.findById = vi.fn().mockResolvedValue(null);

      await expect(
        paymentService.getPaymentStatus("invalid-case"),
      ).rejects.toThrow("Case not found");
    });
  });

  describe("handleWebhook", () => {
    it("should delegate webhook handling to webhookHandler", async () => {
      const mockPayload = {
        payment_status: "COMPLETE",
        amount: "5000",
        m_payment_id: "txn-123",
      };

      mockWebhookHandler.handleWebhook = vi.fn().mockResolvedValue(undefined);

      await paymentService.handleWebhook(mockPayload);

      expect(mockWebhookHandler.handleWebhook).toHaveBeenCalledWith(
        mockPayload,
      );
    });
  });
});
