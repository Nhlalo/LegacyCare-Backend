import { ICaseRepository } from "../interfaces/ICaseRepository";
import { Case } from "../../generated/prisma";
import { PrismaClient } from "../../generated/prisma/client";

export class CaseRepository implements ICaseRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.case.findUnique({
      where: { id },
      include: {
        payments: true,
        funeralHome: true,
      },
    });
  }

  async findByFuneralHome(funeralHomeId: string) {
    return this.prisma.case.findMany({
      where: { funeralHomeId },
      orderBy: { createdAt: "desc" },
      include: {
        payments: true,
      },
    });
  }

  async findByAccessToken(token: string) {
    return this.prisma.case.findFirst({
      where: {
        familyAccessToken: token,
        linkExpiresAt: { gte: new Date() },
      },
      include: {
        payments: true,
        funeralHome: {
          include: {
            staff: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: any) {
    return this.prisma.case.create({ data });
  }

  async update(id: string, data: Partial<Case>) {
    return this.prisma.case.update({
      where: { id },
      data,
      include: {
        payments: true,
        funeralHome: true,
      },
    });
  }
}
