import { IPaymentRepository } from "../interfaces/IPaymentRepository";
import { ICaseRepository } from "../interfaces/ICaseRepository";
import { IPaymentGateway } from "../interfaces/IPaymentGateway";
import { IWebhookHandler } from "../interfaces/IWebhookHandler";
import logger from "../lib/logger";

export class PaymentService {
  constructor(
    private paymentRepo: IPaymentRepository,
    private caseRepo: ICaseRepository,
    private paymentGateway: IPaymentGateway,
    private webhookHandler: IWebhookHandler,
  ) {}

  async createOnlinePayment(
    caseId: string,
    amount: number,
    returnUrl: string,
    cancelUrl: string,
  ) {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    const { paymentUrl, transactionId } =
      await this.paymentGateway.createPayment({
        amount,
        reference: caseData.familyName || caseId,
        description: `Funeral arrangements payment for ${caseData.familyName || "Family"}`,
        returnUrl,
        cancelUrl,
      });

    await this.paymentRepo.create({
      caseId,
      amount,
      method: "CREDIT_CARD",
      status: "PENDING",
      transactionId,
    });

    logger.info({ caseId, amount, transactionId }, "Online payment created");

    return { paymentUrl, transactionId };
  }

  async recordManualPayment(
    caseId: string,
    amount: number,
    method: "CASH" | "EFT",
    reference: string,
  ) {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    const payment = await this.paymentRepo.create({
      caseId,
      amount,
      method,
      status: "COMPLETED",
      reference,
    });

    // Update case paid amount
    const totalPaid = await this.paymentRepo.getTotalPaid(caseId);
    await this.caseRepo.update(caseId, {
      paidAmount: totalPaid,
    });

    logger.info(
      { caseId, amount, method, reference },
      "Manual payment recorded",
    );

    return payment;
  }

  async getPayments(caseId: string) {
    return this.paymentRepo.findByCaseId(caseId);
  }

  async getPaymentStatus(caseId: string) {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    const totalPaid = await this.paymentRepo.getTotalPaid(caseId);
    const remaining = (caseData.totalAmount || 0) - totalPaid;

    return {
      total: caseData.totalAmount || 0,
      paid: totalPaid,
      remaining,
      isFullyPaid: remaining <= 0,
    };
  }

  async getCaseById(caseId: string) {
    return this.caseRepo.findById(caseId);
  }

  async handleWebhook(payload: any): Promise<void> {
    return this.webhookHandler.handleWebhook(payload);
  }
}
