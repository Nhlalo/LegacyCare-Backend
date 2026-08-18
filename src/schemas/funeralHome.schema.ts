import { z } from "zod";

export const registerFuneralHomeSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const updateBrandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format")
    .optional(),
  logoUrl: z.string().url("Invalid URL").optional(),
});

export const inviteStaffSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["OWNER", "MANAGER", "STAFF", "LIMITED"]).default("STAFF"),
});

export type RegisterFuneralHomeInput = z.infer<
  typeof registerFuneralHomeSchema
>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
