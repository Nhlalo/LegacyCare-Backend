import bcrypt from "bcrypt";
import crypto from "crypto";
import { IStaffRepository } from "../interfaces/IStaffRepository";
import { IUserRepository } from "../interfaces/IUserRepository";
import { IFuneralHomeRepository } from "../interfaces/IFuneralHomeRepository";
import { IEmailService } from "../interfaces/IEmailService";
import { IInvitationLinkEmailTemplate } from "../interfaces/IEmailTemplate";
import logger from "../lib/logger";
import { Role } from "../../generated/prisma";

export class StaffService {
  constructor(
    private staffRepo: IStaffRepository,
    private userRepo: IUserRepository,
    private funeralHomeRepo: IFuneralHomeRepository,
    private emailService: IEmailService,
    private emailTemplate: IInvitationLinkEmailTemplate,
  ) {}

  async findByUserId(userId: string) {
    return this.staffRepo.findByUserId(userId);
  }

  async getStaff(funeralHomeId: string, includeInactive: boolean = false) {
    if (includeInactive) {
      return this.staffRepo.findAllIncludingInactive(funeralHomeId);
    }
    return this.staffRepo.findByFuneralHome(funeralHomeId);
  }

  async getRole(userId: string): Promise<string | null> {
    const staff = await this.staffRepo.findByUserId(userId);
    return staff?.role || null;
  }

  async isActiveStaff(userId: string): Promise<boolean> {
    const staff = await this.staffRepo.findByUserId(userId);
    return staff !== null && staff.active === true;
  }

  async inviteStaff(
    funeralHomeId: string,
    email: string,
    role: string,
    invitedBy: string,
  ) {
    logger.info({ funeralHomeId, email, role, invitedBy }, "Staff invitation");

    let user = await this.userRepo.findByEmail(email);

    // If user exists, check if they're already staff
    if (user) {
      const existingStaff = await this.staffRepo.findByUserId(user.id);
      if (existingStaff) {
        throw new Error("User is already a staff member.");
      }
    }

    const funeralHome = await this.funeralHomeRepo.findById(funeralHomeId);
    if (!funeralHome) {
      throw new Error("Funeral home not found");
    }

    // Generate invitation token and temporary password
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const tempPassword = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    if (user) {
      user = await this.userRepo.update(user.id, {
        invitationToken,
        invitationTokenExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      });
    } else {
      user = await this.userRepo.create({
        email,
        passwordHash,
        firstName: "Pending",
        lastName: "User",
        invitationToken,
        invitationTokenExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
        isEmailVerified: false,
        verificationToken: crypto.randomBytes(32).toString("hex"),
        verificationSentAt: new Date(),
      });
    }

    const staff = await this.staffRepo.create({
      funeralHomeId,
      userId: user.id,
      role,
      invitationToken,
    });

    const acceptLink = `${process.env.FRONTEND_URL}/accept-invite?token=${invitationToken}`;

    const funeralHomeName = funeralHome.name;

    const subject = this.emailTemplate.getSubject(funeralHomeName);

    const html = this.emailTemplate.html({
      email,
      token: invitationToken,
      role,
      tempPassword,
      funeralHomeName,
    });

    await this.emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    logger.info({ staffId: staff.id, userId: user.id, email }, "Staff invited");
    return { staff, tempPassword, acceptLink };
  }

  async acceptInvitation(token: string, password?: string) {
    // Find staff by invitation token
    const staff = await this.staffRepo.findByInvitationToken(token);
    if (!staff) {
      throw new Error("Invalid or expired invitation token.");
    }

    if (
      staff.invitationTokenExpiresAt &&
      staff.invitationTokenExpiresAt < new Date()
    ) {
      throw new Error("Invitation has expired. Please request a new one.");
    }

    // Get user
    const user = await this.userRepo.findById(staff.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await this.userRepo.update(user.id, {
        passwordHash,
        isEmailVerified: true,
        invitationToken: null,
        invitationTokenExpiresAt: null,
      });
    }

    const updatedStaff = await this.staffRepo.update(staff.id, {
      acceptedAt: new Date(),
      invitationToken: null,
      invitationTokenExpiresAt: null,
    });

    logger.info(
      { staffId: staff.id, userId: user.id },
      "Staff accepted invitation",
    );
    return updatedStaff;
  }

  async updateRole(staffId: string, role: Role) {
    const staff = await this.staffRepo.findById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    // Prevent changing OWNER role if no other owner exists
    if (role === "OWNER") {
      const owners = await this.staffRepo.findByFuneralHome(
        staff.funeralHomeId,
      );
      const activeOwners = owners.filter(
        (s) => s.role === "OWNER" && s.id !== staffId,
      );

      if (activeOwners.length === 0) {
        throw new Error(
          "Cannot change role of the last owner. Please assign another owner first.",
        );
      }
    }

    const updatedStaff = await this.staffRepo.update(staffId, { role });
    logger.info({ staffId, role }, "Staff role updated");
    return updatedStaff;
  }

  async removeStaff(staffId: string, removedBy: string) {
    const staff = await this.staffRepo.findById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    // Prevent removing the last owner
    if (staff.role === "OWNER") {
      const owners = await this.staffRepo.findByFuneralHome(
        staff.funeralHomeId,
      );
      const activeOwners = owners.filter(
        (s) => s.role === "OWNER" && s.id !== staffId,
      );
      if (activeOwners.length === 0) {
        throw new Error(
          "Cannot remove the last owner. Please assign another owner first.",
        );
      }
    }

    if (staff.userId === removedBy) {
      throw new Error(
        "You cannot remove yourself. Please ask another owner to remove you.",
      );
    }

    const result = await this.staffRepo.softDelete(staffId);

    logger.info(
      {
        staffId,
        removedBy,
        email: result.user?.email || "unknown",
        role: result.role,
      },
      "Staff removed (soft delete)",
    );

    return result;
  }

  async reactivateStaff(staffId: string) {
    const staff = await this.staffRepo.reactivate(staffId);
    logger.info(
      { staffId, email: staff.user?.email || "unknown" },
      "Staff reactivated",
    );
    return staff;
  }

  async getAllStaff(funeralHomeId: string, includeInactive: boolean = false) {
    if (includeInactive) {
      return this.staffRepo.findAllIncludingInactive(funeralHomeId);
    }
    return this.staffRepo.findByFuneralHome(funeralHomeId);
  }

  async isActive(staffId: string): Promise<boolean> {
    const staff = await this.staffRepo.findById(staffId);
    return staff?.active ?? false;
  }

  async getStaffById(staffId: string) {
    return this.staffRepo.findById(staffId);
  }

  async resendInvitation(staffId: string) {
    const staff = await this.staffRepo.findById(staffId);
    if (!staff) {
      throw new Error("Staff not found");
    }

    if (staff.acceptedAt) {
      throw new Error("Staff member has already accepted the invitation.");
    }

    // Generate new invitation token
    const newToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.staffRepo.update(staffId, {
      invitationToken: newToken,
      invitationTokenExpiresAt: expiresAt,
    });

    const funeralHome = await this.funeralHomeRepo.findById(
      staff.funeralHomeId,
    );
    if (!funeralHome) {
      throw new Error("Funeral home not found");
    }

    const user = await this.userRepo.findById(staff.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;

    const funeralHomeName = funeralHome.name;

    const subject = this.emailTemplate.getSubject(funeralHomeName);

    const html = this.emailTemplate.html({
      email,
      token: newToken,
      role: staff.role,
      funeralHomeName,
    });

    await this.emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    logger.info({ staffId, email }, "Invitation resent");
    return { success: true, message: "Invitation resent successfully" };
  }
}
