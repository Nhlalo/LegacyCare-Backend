import { IRefreshTokenRepository } from "../interfaces/IRefreshTokenRepository";
import { prisma } from "../lib/prisma";

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async create(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revoke(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
