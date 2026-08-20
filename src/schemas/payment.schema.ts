import { z } from "zod";

export const createPaymentSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CREDIT_CARD", "DEBIT_CARD", "EFT", "CASH", "DEBIT_ORDER"]),
  reference: z.string().optional(),
});

export const manualPaymentSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CASH", "EFT"]),
  reference: z.string().min(1, "Reference is required"),
});

export const webhookSchema = z.object({
  payment_status: z.string(),
  amount: z.string(),
  m_payment_id: z.string(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
