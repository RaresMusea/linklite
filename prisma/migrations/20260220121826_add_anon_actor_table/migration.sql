-- CreateTable
CREATE TABLE "AnonActor" (
    "anon_id" TEXT NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "last_ip_addr_hash" TEXT,

    CONSTRAINT "AnonActor_pkey" PRIMARY KEY ("anon_id")
);

-- CreateIndex
CREATE INDEX "AnonActor_last_seen_at_idx" ON "AnonActor"("last_seen_at");
