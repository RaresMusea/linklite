/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `targetUrl` on the `Link` table. All the data in the column will be lost.
  - Added the required column `target_url` to the `Link` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Link"
    DROP COLUMN "createdAt",
    DROP COLUMN "ownerId",
    DROP COLUMN "targetUrl",
    ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "owner_id"   TEXT,
    ADD COLUMN "target_url" TEXT         NOT NULL;
