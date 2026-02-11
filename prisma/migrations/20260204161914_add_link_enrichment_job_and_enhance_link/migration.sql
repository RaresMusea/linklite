-- CreateEnum
CREATE TYPE "LinkEnrichmentJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR');

-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "is_shortener" BOOLEAN,
ADD COLUMN     "redirect_checked_at" TIMESTAMP(3),
ADD COLUMN     "redirect_status_code" INTEGER,
ADD COLUMN     "redirect_target_url" TEXT;

-- CreateTable
CREATE TABLE "LinkEnrichmentJob" (
    "id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "status" "LinkEnrichmentJobStatus" NOT NULL DEFAULT 'PENDING',
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkEnrichmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkEnrichmentJob_link_id_key" ON "LinkEnrichmentJob"("link_id");

-- CreateIndex
CREATE INDEX "LinkEnrichmentJob_locked_until_idx" ON "LinkEnrichmentJob"("locked_until");

-- CreateIndex
CREATE INDEX "LinkEnrichmentJob_status_run_after_idx" ON "LinkEnrichmentJob"("status", "run_after");

-- AddForeignKey
ALTER TABLE "LinkEnrichmentJob" ADD CONSTRAINT "LinkEnrichmentJob_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
