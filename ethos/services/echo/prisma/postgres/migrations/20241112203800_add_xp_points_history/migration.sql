-- CreateEnum
CREATE TYPE "XpPointsHistoryItemType" AS ENUM ('REVIEW');

-- CreateTable
CREATE TABLE "xp_points_history" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "type" "XpPointsHistoryItemType" NOT NULL,
    "points" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_points_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_points_history_profileId_idx" ON "xp_points_history"("profileId");

-- CreateIndex
CREATE INDEX "xp_points_history_createdAt_idx" ON "xp_points_history"("createdAt");

-- AddForeignKey
ALTER TABLE "xp_points_history" ADD CONSTRAINT "xp_points_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
