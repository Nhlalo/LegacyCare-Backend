import { IStaffRepository } from "../interfaces/IStaffRepository";
import { PrismaClient } from "../../generated/prisma/client";
import { Role } from "../types/index";

export class StaffRepository implements IStaffRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string) {
    return this.prisma.staff.findUnique({
      where: { userId },
      include: { funeralHome: true },
    });
  }

  async findByFuneralHome(funeralHomeId: string) {
    return this.prisma.staff.findMany({
      where: { funeralHomeId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async create(data: { funeralHomeId: string; userId: string; role: Role }) {
    return this.prisma.staff.create({ data });
  }

  async update(id: string, data: Partial<any>) {
    return this.prisma.staff.update({ where: { id }, data });
  }
}
