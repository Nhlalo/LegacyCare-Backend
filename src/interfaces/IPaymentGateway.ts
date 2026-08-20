export interface IPaymentGateway {
  createPayment(params: {
    amount: number;
    reference: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ paymentUrl: string; transactionId: string }>;

  verifyPayment(transactionId: string): Promise<{
    status: "COMPLETED" | "FAILED" | "PENDING";
    amount: number;
    reference: string;
  }>;
}
