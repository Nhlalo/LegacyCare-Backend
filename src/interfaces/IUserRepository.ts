import { User } from "../../generated/prisma";

export interface IUserRepository {
  findById(id: string): Promise<Omit<User, "passwordHash"> | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByResetToken(token: string): Promise<User | null>;
  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    verificationToken: string;
    verificationSentAt: Date;
  }): Promise<Omit<User, "passwordHash">>;
  update(id: string, data: Partial<User>): Promise<User>;
  incrementFailedAttempts(id: string): Promise<User>;
  resetFailedAttempts(id: string): Promise<User>;
}
