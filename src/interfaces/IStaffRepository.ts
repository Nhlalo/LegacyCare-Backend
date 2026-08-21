import { Staff } from "../../generated/prisma";

export interface IStaffRepository {
  findByUserId(userId: string): Promise<Staff | null>;
  findByFuneralHome(funeralHomeId: string): Promise<Staff[]>;
  getRole(userId: string): Promise<string | null>;
  create(data: {
    funeralHomeId: string;
    userId: string;
    role: string;
  }): Promise<Staff>;
  update(id: string, data: Partial<Staff>): Promise<Staff>;
}
