import { FuneralHome } from "../../generated/prisma";

export interface IFuneralHomeRepository {
  findById(id: string): Promise<FuneralHome | null>;
  findBySubdomain(subdomain: string): Promise<FuneralHome | null>;
  findByDomain(domain: string): Promise<FuneralHome | null>;
  create(data: { name: string; subdomain: string }): Promise<FuneralHome>;
  update(id: string, data: Partial<FuneralHome>): Promise<FuneralHome>;
}
