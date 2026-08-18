import crypto from "crypto";
import bcrypt from "bcrypt";
import { IUserRepository } from "../interfaces/IUserRepository";
import { IFuneralHomeRepository } from "../interfaces/IFuneralHomeRepository";
import { IStaffRepository } from "../interfaces/IStaffRepository";
import { IEmailService } from "../interfaces/IEmailService";
import logger from "../lib/logger";

export class FuneralHomeService {
  constructor(
    private userRepo: IUserRepository,
    private funeralHomeRepo: IFuneralHomeRepository,
    private staffRepo: IStaffRepository,
    private emailService: IEmailService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    logger.info({ name, email }, "Funeral home registration");

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists. Please login.");
    }

    const subdomain = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const existing = await this.funeralHomeRepo.findBySubdomain(subdomain);
    if (existing) {
      throw new Error(
        "Business name already taken. Please choose a different name.",
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

    const funeralHome = await this.funeralHomeRepo.create({ name, subdomain });

    await this.staffRepo.create({
      funeralHomeId: funeralHome.id,
      userId: user.id,
      role: "OWNER",
    });

    await this.emailService.sendVerificationEmail(email, verificationToken);

    logger.info(
      { userId: user.id, funeralHomeId: funeralHome.id },
      "Funeral home registered",
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
      funeralHome: {
        id: funeralHome.id,
        name: funeralHome.name,
        subdomain: funeralHome.subdomain,
      },
    };
  }

  async updateBranding(
    funeralHomeId: string,
    data: { primaryColor?: string; secondaryColor?: string; logoUrl?: string },
  ) {
    const funeralHome = await this.funeralHomeRepo.update(funeralHomeId, data);
    logger.info({ funeralHomeId }, "Branding updated");
    return funeralHome;
  }

  async getFuneralHome(funeralHomeId: string) {
    return this.funeralHomeRepo.findById(funeralHomeId);
  }

  async getStaff(funeralHomeId: string) {
    return this.staffRepo.findByFuneralHome(funeralHomeId);
  }

  async inviteStaff(funeralHomeId: string, email: string, role: string) {
    logger.info({ funeralHomeId, email, role }, "Staff invitation");

    // Check if user exists
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Create a pending invitation
      // We'll handle this differently - for now, let's assume user exists
      throw new Error("User not found. They need to register first.");
    }

    const existingStaff = await this.staffRepo.findByUserId(user.id);
    if (existingStaff) {
      throw new Error("User is already a staff member.");
    }

    const staff = await this.staffRepo.create({
      funeralHomeId,
      userId: user.id,
      role,
    });

    // Send invitation email
    // In a real app, you'd send an email with a link to accept the invitation
    // For now, we'll just log it

    logger.info({ staffId: staff.id, userId: user.id }, "Staff invited");
    return staff;
  }
}
