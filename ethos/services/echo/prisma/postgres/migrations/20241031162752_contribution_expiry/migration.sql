/*
  Warnings:

  - Added the required column `expireAt` to the `contribution_bundles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contribution_bundles" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expireAt" TIMESTAMP(3) NOT NULL;
