import { RefreshToken } from "../../generated/prisma";

export interface IRefreshTokenRepository {
  create(userId: string, token: string): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<RefreshToken>;
  revokeAllForUser(userId: string): Promise<{ count: number }>;
}
