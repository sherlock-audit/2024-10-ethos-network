-- AlterTable
ALTER TABLE "score_history" ADD COLUMN     "txHash" VARCHAR(66);

-- CreateIndex
CREATE INDEX "score_history_target_txHash_idx" ON "score_history"("target", "txHash");
