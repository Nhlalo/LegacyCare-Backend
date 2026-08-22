import { User } from "../../generated/prisma";

type UserWithoutSensitiveData = Pick<
  User,
  | "id"
  | "email"
  | "firstName"
  | "lastName"
  | "isEmailVerified"
  | "failedLoginAttempts"
  | "lockoutUntil"
  | "createdAt"
>;

export interface IUserRepository {
  findById(id: string): Promise<UserWithoutSensitiveData | null>;
  findFullUserById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByResetToken(token: string): Promise<User | null>;
  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    invitationToken?: string;
    invitationTokenExpiresAt?: Date;
    verificationToken: string;
    verificationSentAt: Date;
    isEmailVerified: boolean;
  }): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  incrementFailedAttempts(id: string): Promise<User>;
  resetFailedAttempts(id: string): Promise<User>;
}
