import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { IUserRepository } from "../interfaces/IUserRepository";
import { IRefreshTokenRepository } from "../interfaces/IRefreshTokenRepository";
import { IEmailService } from "../interfaces/IEmailService";
import { IStaffRepository } from "../interfaces/IStaffRepository";
import { Staff, User } from "../../generated/prisma/client";
import logger from "../lib/logger";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private staffRepo: IStaffRepository,
    private emailService: IEmailService,
    private jwtAccessSecret: string,
    private jwtRefreshSecret: string,
    private accessTokenExpiry: string,
    private refreshTokenExpiry: string,
  ) {}

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    logger.info({ email }, "Registration attempt");

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      logger.warn({ email }, "Registration failed - user exists");
      throw new Error(
        "This email is already registered. Please login instead.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationSentAt = new Date();

    const user = await this.userRepo.create({
      email,
      passwordHash,
      firstName,
      lastName,
      verificationToken,
      verificationSentAt,
    });

    await this.emailService.sendVerificationEmail(email, verificationToken);

    logger.info({ userId: user.id }, "User registered");
    return { user };
  }

  async login(email: string, password: string) {
    logger.info({ email }, "Login attempt");

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / 60000,
      );
      throw new Error(
        `Account locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
      await this.userRepo.resetFailedAttempts(user.id);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await this.userRepo.incrementFailedAttempts(user.id);
      const updatedUser = await this.userRepo.findByEmail(email);
      const attempts = updatedUser?.failedLoginAttempts || 0;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.userRepo.update(user.id, { lockoutUntil });
        throw new Error("Account locked. Try again later.");
      }

      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      throw new Error(`Invalid credentials. ${remaining} attempts remaining.`);
    }

    if (!user.isEmailVerified) {
      throw new Error("Please verify your email before logging in.");
    }

    await this.userRepo.resetFailedAttempts(user.id);

    const tokens = this.generateTokens(user.id);
    await this.refreshTokenRepo.create(user.id, tokens.refreshToken);

    const { passwordHash, ...userWithoutPassword } = user;
    logger.info({ userId: user.id }, "Login successful");
    return { user: userWithoutPassword, ...tokens };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findByVerificationToken(token);
    if (!user) throw new Error("Invalid verification token.");

    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      verificationToken: null,
    });

    logger.info({ userId: user.id }, "Email verified");
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await this.userRepo.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordSentAt: new Date(),
    });

    await this.emailService.sendPasswordResetEmail(email, resetToken);
    logger.info({ userId: user.id }, "Password reset email sent");
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findByResetToken(token);
    if (!user) throw new Error("Invalid reset token.");

    const sentAt = user.resetPasswordSentAt;
    if (sentAt && Date.now() - sentAt.getTime() > 3600000) {
      throw new Error("Reset token expired.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordSentAt: null,
    });

    await this.refreshTokenRepo.revokeAllForUser(user.id);

    logger.info({ userId: user.id }, "Password reset");
    return { success: true };
  }

  async refreshToken(oldRefreshToken: string) {
    const decoded = jwt.verify(oldRefreshToken, this.jwtRefreshSecret) as {
      userId: string;
    };
    const tokenDoc = await this.refreshTokenRepo.findByToken(oldRefreshToken);

    if (!tokenDoc || tokenDoc.revokedAt || tokenDoc.expiresAt < new Date()) {
      throw new Error("Invalid refresh token");
    }

    await this.refreshTokenRepo.revoke(tokenDoc.id);
    const tokens = this.generateTokens(decoded.userId);
    await this.refreshTokenRepo.create(decoded.userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.refreshTokenRepo.revokeAllForUser(userId);
    logger.info({ userId }, "User logged out");
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign({ userId }, this.jwtAccessSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign({ userId }, this.jwtRefreshSecret!, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  async getAuthenticatedUser(userId: string): Promise<{
    user: User;
    staff: Staff | null;
    funeralHomeId: string | null;
  }> {
    const user = await this.userRepo.findFullUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const staff = await this.staffRepo.findByUserId(user.id);

    return {
      user,
      staff,
      funeralHomeId: staff?.funeralHomeId || null,
    };
  }
}
