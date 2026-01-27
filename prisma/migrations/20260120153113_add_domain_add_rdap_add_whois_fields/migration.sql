-- CreateEnum
CREATE TYPE "DomainSource" AS ENUM ('RDAP', 'WHOIS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('OK', 'MISSING', 'REDACTED', 'ERROR', 'UNSUPPORTED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "domain_id" TEXT;

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registered_at" TIMESTAMP(3),
    "checked_at" TIMESTAMP(3),
    "source" "DomainSource" NOT NULL DEFAULT 'UNKNOWN',
    "status" "DomainStatus" NOT NULL DEFAULT 'UNKNOWN',
    "rdap_raw" JSONB,
    "rdap_fetched_at" TIMESTAMP(3),
    "whois_raw" TEXT,
    "whois_fetched_at" TIMESTAMP(3),
    "rdap_fetch_locked_until" TIMESTAMP(3),
    "whois_fetch_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
