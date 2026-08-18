import { IFuneralHomeRepository } from "../interfaces/IFuneralHomeRepository";
import { PrismaClient } from "../../generated/prisma/client";

export class FuneralHomeRepository implements IFuneralHomeRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.funeralHome.findUnique({
      where: { id },
      include: {
        staff: {
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
        },
        cases: true,
      },
    });
  }

  async findBySubdomain(subdomain: string) {
    return this.prisma.funeralHome.findUnique({ where: { subdomain } });
  }

  async findByDomain(domain: string) {
    return this.prisma.funeralHome.findUnique({ where: { domain } });
  }

  async create(data: { name: string; subdomain: string }) {
    return this.prisma.funeralHome.create({ data });
  }

  async update(id: string, data: Partial<any>) {
    return this.prisma.funeralHome.update({ where: { id }, data });
  }
}
