/*
  Warnings:

  - A unique constraint covering the columns `[read_order]` on the table `books` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "books" ADD COLUMN "read_order" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_read_order_key" ON "books"("read_order");
