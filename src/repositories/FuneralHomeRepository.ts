import { IFuneralHomeRepository } from "../interfaces/IFuneralHomeRepository";
import { prisma } from "../lib/prisma";

export class FuneralHomeRepository implements IFuneralHomeRepository {
  async findById(id: string) {
    return prisma.funeralHome.findUnique({
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
    return prisma.funeralHome.findUnique({ where: { subdomain } });
  }

  async findByDomain(domain: string) {
    return prisma.funeralHome.findUnique({ where: { domain } });
  }

  async create(data: { name: string; subdomain: string }) {
    return prisma.funeralHome.create({ data });
  }

  async update(id: string, data: Partial<any>) {
    return prisma.funeralHome.update({ where: { id }, data });
  }
}
