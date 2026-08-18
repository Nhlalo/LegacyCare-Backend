import { IStaffRepository } from "../interfaces/IStaffRepository";
import { prisma } from "../lib/prisma";
import { Role } from "../types/index";

export class StaffRepository implements IStaffRepository {
  async findByUserId(userId: string) {
    return prisma.staff.findUnique({
      where: { userId },
      include: { funeralHome: true },
    });
  }

  async findByFuneralHome(funeralHomeId: string) {
    return prisma.staff.findMany({
      where: { funeralHomeId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async create(data: { funeralHomeId: string; userId: string; role: Role }) {
    return prisma.staff.create({ data });
  }

  async update(id: string, data: Partial<any>) {
    return prisma.staff.update({ where: { id }, data });
  }
}
