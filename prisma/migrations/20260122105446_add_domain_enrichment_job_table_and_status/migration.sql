-- CreateEnum
CREATE TYPE "DomainEnrichmentJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "DomainEnrichmentJob" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "status" "DomainEnrichmentJobStatus" NOT NULL DEFAULT 'PENDING',
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainEnrichmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainEnrichmentJob_domain_id_key" ON "DomainEnrichmentJob"("domain_id");

-- CreateIndex
CREATE INDEX "DomainEnrichmentJob_status_run_after_idx" ON "DomainEnrichmentJob"("status", "run_after");

-- AddForeignKey
ALTER TABLE "DomainEnrichmentJob" ADD CONSTRAINT "DomainEnrichmentJob_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
