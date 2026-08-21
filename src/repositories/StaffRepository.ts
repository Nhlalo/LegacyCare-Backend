import { IStaffRepository } from "../interfaces/IStaffRepository";
import { PrismaClient } from "../../generated/prisma/client";
import { Role } from "../types/index";

export class StaffRepository implements IStaffRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string) {
    return this.prisma.staff.findFirst({
      where: {
        userId,
        active: true,
      },
      include: {
        funeralHome: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByFuneralHome(funeralHomeId: string) {
    return this.prisma.staff.findMany({
      where: {
        funeralHomeId,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return this.prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        funeralHome: true,
      },
    });
  }

  async findByInvitationToken(token: string) {
    return this.prisma.staff.findFirst({
      where: {
        invitationToken: token,
        invitationTokenExpiresAt: {
          gt: new Date(),
        },
        active: true,
      },
      include: {
        user: true,
        funeralHome: true,
      },
    });
  }

  async create(data: {
    funeralHomeId: string;
    userId: string;
    role: Role;
    invitationToken: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.staff.create({
      data: {
        funeralHomeId: data.funeralHomeId,
        userId: data.userId,
        role: data.role,
        invitationToken: data.invitationToken,
        invitationTokenExpiresAt: expiresAt,
      },
    });
  }

  async update(id: string, data: Partial<any>) {
    return this.prisma.staff.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.staff.update({
      where: { id },
      data: {
        active: false,
        removedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async reactivate(id: string) {
    return this.prisma.staff.update({
      where: { id },
      data: {
        active: true,
        removedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAllIncludingInactive(funeralHomeId: string) {
    return this.prisma.staff.findMany({
      where: { funeralHomeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
