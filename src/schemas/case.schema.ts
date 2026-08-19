import { z } from "zod";

export const createAtNeedCaseSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  deceasedName: z.string().min(1, "Deceased name is required"),
  // ✅ Transform ISO string to Date
  serviceDate: z.iso
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  serviceLocation: z.string().optional(),
  totalAmount: z.number().min(0).default(0),
});

export const createPreNeedCaseSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  monthlyPayment: z.number().min(1, "Monthly payment is required"),
  totalAmount: z.number().min(1, "Total amount is required"),
});

export const updateCaseSchema = z.object({
  familyName: z.string().optional(),
  deceasedName: z.string().optional(),
  serviceDate: z.iso
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  serviceLocation: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "READY", "CLOSED"]).optional(),
  totalAmount: z.number().min(0).optional(),
});

export const generateFamilyLinkSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
});

export type CreateAtNeedCaseInput = z.infer<typeof createAtNeedCaseSchema>;
export type CreatePreNeedCaseInput = z.infer<typeof createPreNeedCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type GenerateFamilyLinkInput = z.infer<typeof generateFamilyLinkSchema>;
