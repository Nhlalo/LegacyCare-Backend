import { Request } from "express";
import { Staff, User } from "../../generated/prisma/client";

export type Role = "OWNER" | "MANAGER" | "STAFF" | "LIMITED";

export type StaffWithUser = Staff & {
  user: Pick<User, "id" | "email" | "firstName" | "lastName"> | null;
};

export interface AuthRequest extends Request {
  userId: string;
  funeralHomeId: string;
  staffRole: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
}
