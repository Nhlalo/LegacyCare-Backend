import { Staff } from "../../generated/prisma";

export interface IStaffRepository {
  findByUserId(userId: string): Promise<Staff | null>;
  findByFuneralHome(funeralHomeId: string): Promise<Staff[]>;
  findById(id: string): Promise<Staff | null>;
  findByInvitationToken(token: string): Promise<Staff | null>;
  create(data: {
    funeralHomeId: string;
    userId: string;
    role: string;
    invitationToken: string;
  }): Promise<Staff>;
  update(id: string, data: Partial<Staff>): Promise<Staff>;
  softDelete(id: string): Promise<Staff>;
  reactivate(id: string): Promise<Staff>;
  findAllIncludingInactive(funeralHomeId: string): Promise<Staff[]>;
}
