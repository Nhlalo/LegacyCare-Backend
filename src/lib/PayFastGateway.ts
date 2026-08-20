import { IPaymentGateway } from "../interfaces/IPaymentGateway";
import logger from "./logger";

interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
  sandbox: boolean;
}

export class PayFastGateway implements IPaymentGateway {
  private baseUrl: string;

  constructor(private config: PayFastConfig) {
    this.baseUrl = config.sandbox
      ? "https://sandbox.payfast.co.za"
      : "https://www.payfast.co.za";
  }

  async createPayment(params: {
    amount: number;
    reference: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ paymentUrl: string; transactionId: string }> {
    const transactionId = `PF-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const payfastData = {
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notify_url: `${process.env.APP_URL}/api/webhooks/payfast`,
      name_first: "Family",
      name_last: "Member",
      email_address: "family@example.com",
      m_payment_id: transactionId,
      amount: params.amount.toFixed(2),
      item_name: params.description,
      item_description: `Payment for case ${params.reference}`,
    };

    const signature = this.generateSignature(payfastData);
    const paymentUrl = `${this.baseUrl}/eng/process?${new URLSearchParams({ ...payfastData, signature }).toString()}`;

    logger.info(
      { transactionId, amount: params.amount, reference: params.reference },
      "PayFast payment created",
    );

    return { paymentUrl, transactionId };
  }

  async verifyPayment(transactionId: string): Promise<{
    status: "COMPLETED" | "FAILED" | "PENDING";
    amount: number;
    reference: string;
  }> {
    // In production, you'd verify with PayFast API
    // For now, simulate verification
    return {
      status: "COMPLETED",
      amount: 1000,
      reference: `REF-${transactionId}`,
    };
  }

  private generateSignature(data: Record<string, any>): string {
    // Exclude signature from the signature calculation
    const { signature, ...dataWithoutSignature } = data;

    const sortedKeys = Object.keys(dataWithoutSignature).sort();
    const paramString = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(dataWithoutSignature[key])}`)
      .join("&");

    if (this.config.passphrase) {
      return md5(paramString + "&passphrase=" + this.config.passphrase);
    }
    return md5(paramString);
  }
}

// Simple md5 implementation (in production use a proper crypto library)
function md5(input: string): string {
  return require("crypto").createHash("md5").update(input).digest("hex");
}
