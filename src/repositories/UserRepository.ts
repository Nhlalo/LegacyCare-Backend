import { User } from "../../generated/prisma";
import { IUserRepository } from "../interfaces/IUserRepository";
import { PrismaClient } from "../../generated/prisma/client";

export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByVerificationToken(token: string) {
    return this.prisma.user.findFirst({ where: { verificationToken: token } });
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({ where: { resetPasswordToken: token } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    verificationToken: string;
    verificationSentAt: Date;
  }): Promise<Omit<User, "passwordHash">> {
    const user = await this.prisma.user.create({
      data,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, data: Partial<User>) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async incrementFailedAttempts(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedAttempts(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });
  }
}
