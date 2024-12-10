ALTER TABLE "blockchain_events" DROP COLUMN "attempts",
ADD COLUMN     "jobCreated" BOOLEAN NOT NULL DEFAULT false;

UPDATE "blockchain_events" SET "jobCreated" = true WHERE processed = true
