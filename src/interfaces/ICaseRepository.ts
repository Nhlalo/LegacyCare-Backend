import { Case } from "../../generated/prisma";

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>;
  findByFuneralHome(funeralHomeId: string): Promise<Case[]>;
  findByAccessToken(token: string): Promise<Case | null>;
  create(data: any): Promise<Case>;
  update(id: string, data: Partial<Case>): Promise<Case>;
}
