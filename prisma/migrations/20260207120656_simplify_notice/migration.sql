/*
  Warnings:

  - You are about to drop the column `status` on the `notices` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `notices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notices" DROP COLUMN "status",
DROP COLUMN "type";

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
