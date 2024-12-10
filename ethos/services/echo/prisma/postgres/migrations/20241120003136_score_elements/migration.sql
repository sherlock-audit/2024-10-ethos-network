-- CreateTable
CREATE TABLE "score_algorithms" (
    "version" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "definition" JSONB NOT NULL,

    CONSTRAINT "score_algorithms_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "score_element_definitions" (
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "ranges" JSONB,
    "outOfRangeScore" INTEGER,
    "scoreAlgorithmVersion" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "score_algorithms_version_idx" ON "score_algorithms"("version");

-- CreateIndex
CREATE INDEX "score_algorithms_createdAt_idx" ON "score_algorithms"("createdAt");

-- CreateIndex
CREATE INDEX "score_element_definitions_scoreAlgorithmVersion_idx" ON "score_element_definitions"("scoreAlgorithmVersion");

-- CreateIndex
CREATE UNIQUE INDEX "score_element_definitions_name_scoreAlgorithmVersion_key" ON "score_element_definitions"("name", "scoreAlgorithmVersion");

-- AddForeignKey
ALTER TABLE "score_element_definitions" ADD CONSTRAINT "score_element_definitions_scoreAlgorithmVersion_fkey" FOREIGN KEY ("scoreAlgorithmVersion") REFERENCES "score_algorithms"("version") ON DELETE RESTRICT ON UPDATE CASCADE;
