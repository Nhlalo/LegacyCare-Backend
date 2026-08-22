import { z } from "zod";

export const inviteStaffSchema = z.object({
  email: z.email("Invalid email format"),
  role: z.enum(["OWNER", "MANAGER", "STAFF", "LIMITED"]).default("STAFF"),
});

export const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "MANAGER", "STAFF", "LIMITED"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

export const getStaffQuerySchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type GetStaffQuery = z.infer<typeof getStaffQuerySchema>;
