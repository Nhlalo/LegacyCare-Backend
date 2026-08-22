/*
  Warnings:

  - A unique constraint covering the columns `[invitationToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitationToken" TEXT,
ADD COLUMN     "invitationTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationToken_key" ON "User"("invitationToken");
