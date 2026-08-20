import { IWebhookHandler } from "../interfaces/IWebhookHandler";
import { IPaymentRepository } from "../interfaces/IPaymentRepository";
import { ICaseRepository } from "../interfaces/ICaseRepository";
import logger from "./logger";

export class PayFastWebhookHandler implements IWebhookHandler {
  constructor(
    private paymentRepo: IPaymentRepository,
    private caseRepo: ICaseRepository,
  ) {}

  async handleWebhook(payload: any): Promise<void> {
    logger.info({ payload }, "PayFast webhook received");

    const { payment_status, amount, m_payment_id, reference } = payload;

    if (payment_status !== "COMPLETE") {
      logger.warn({ m_payment_id, payment_status }, "Payment not complete");
      return;
    }

    const payment = await this.paymentRepo.findByTransactionId(m_payment_id);

    if (!payment) {
      logger.error({ m_payment_id }, "Payment not found for webhook");
      return;
    }

    await this.paymentRepo.update(payment.id, {
      status: "COMPLETED",
      reference: reference || payment.reference,
    });

    const totalPaid = await this.paymentRepo.getTotalPaid(payment.caseId);
    await this.caseRepo.update(payment.caseId, {
      paidAmount: totalPaid,
    });

    logger.info(
      { m_payment_id, amount, totalPaid },
      "Payment completed via webhook",
    );
  }
}
