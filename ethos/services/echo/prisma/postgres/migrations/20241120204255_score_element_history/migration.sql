/*
  Warnings:

  - You are about to drop the column `elements` on the `score_history` table. All the data in the column will be lost.
  - You are about to drop the column `errors` on the `score_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "score_history" DROP COLUMN "elements",
DROP COLUMN "errors";

-- CreateTable
CREATE TABLE "score_history_elements" (
    "scoreHistoryId" INTEGER NOT NULL,
    "scoreElementId" INTEGER NOT NULL,

    CONSTRAINT "score_history_elements_pkey" PRIMARY KEY ("scoreHistoryId","scoreElementId")
);

-- CreateTable
CREATE TABLE "score_element_records" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "raw" INTEGER NOT NULL,
    "weighted" INTEGER NOT NULL,
    "error" BOOLEAN NOT NULL,

    CONSTRAINT "score_element_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_element_records_version_name_idx" ON "score_element_records"("version", "name");

-- AddForeignKey
ALTER TABLE "score_history_elements" ADD CONSTRAINT "score_history_elements_scoreHistoryId_fkey" FOREIGN KEY ("scoreHistoryId") REFERENCES "score_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history_elements" ADD CONSTRAINT "score_history_elements_scoreElementId_fkey" FOREIGN KEY ("scoreElementId") REFERENCES "score_element_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_element_records" ADD CONSTRAINT "score_element_records_name_version_fkey" FOREIGN KEY ("name", "version") REFERENCES "score_element_definitions"("name", "scoreAlgorithmVersion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- mark all existing scores out of date
UPDATE "score_history" SET dirty = true WHERE dirty = false;
