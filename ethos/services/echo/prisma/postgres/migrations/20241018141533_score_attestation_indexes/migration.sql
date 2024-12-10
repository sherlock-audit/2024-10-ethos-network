-- CreateIndex
CREATE INDEX "attestations_account_idx" ON "attestations"("account");

-- CreateIndex
CREATE INDEX "score_history_target_createdAt_idx" ON "score_history"("target", "createdAt" DESC);
