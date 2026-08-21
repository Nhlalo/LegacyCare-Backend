/*
  Warnings:

  - A unique constraint covering the columns `[invitationToken]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "invitationToken" TEXT,
ADD COLUMN     "invitationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_invitationToken_key" ON "Staff"("invitationToken");
