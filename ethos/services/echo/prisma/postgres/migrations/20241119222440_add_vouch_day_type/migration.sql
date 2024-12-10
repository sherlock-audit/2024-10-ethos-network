-- AlterEnum
ALTER TYPE "XpPointsHistoryItemType" ADD VALUE 'VOUCH_DAY';

-- Flooring and setting to int
ALTER TABLE "xp_points_history" ALTER COLUMN "points" SET DATA TYPE INT;
