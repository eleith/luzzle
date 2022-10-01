/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `books` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "books" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- RedefineIndex
DROP INDEX "TagMap.id_tag_id_item_type_unique";
CREATE UNIQUE INDEX "TagMap_id_tag_id_item_type_key" ON "TagMap"("id_tag", "id_item", "type");

-- RedefineIndex
DROP INDEX "books.isbn_unique";
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- RedefineIndex
DROP INDEX "books.id_ol_book_unique";
CREATE UNIQUE INDEX "books_id_ol_book_key" ON "books"("id_ol_book");

-- RedefineIndex
DROP INDEX "tags.type_slug_unique";
CREATE UNIQUE INDEX "tags_type_slug_key" ON "tags"("type", "slug");
