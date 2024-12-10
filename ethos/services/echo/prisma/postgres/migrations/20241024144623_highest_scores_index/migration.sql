-- DropIndex
DROP INDEX "score_history_target_createdAt_idx";

-- CreateIndex
CREATE INDEX "score_history_target_createdAt_score_idx" ON "score_history"("target", "createdAt" DESC, "score" DESC);
