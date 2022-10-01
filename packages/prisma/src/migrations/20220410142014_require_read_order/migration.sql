/*
  Warnings:

  - Made the column `read_order` on table `books` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_ol_book" TEXT,
    "id_ol_work" TEXT,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT NOT NULL,
    "coauthors" TEXT,
    "description" TEXT,
    "pages" INTEGER,
    "year_read" INTEGER,
    "month_read" INTEGER,
    "year_first_published" INTEGER,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    "keywords" TEXT,
    "cover_width" INTEGER,
    "cover_height" INTEGER,
    "cover_path" TEXT,
    "slug" TEXT NOT NULL,
    "note" TEXT,
    "read_order" TEXT NOT NULL
);
INSERT INTO "new_books" ("author", "coauthors", "cover_height", "cover_path", "cover_width", "date_added", "date_updated", "description", "id", "id_ol_book", "id_ol_work", "isbn", "keywords", "month_read", "note", "pages", "read_order", "slug", "subtitle", "title", "year_first_published", "year_read") SELECT "author", "coauthors", "cover_height", "cover_path", "cover_width", "date_added", "date_updated", "description", "id", "id_ol_book", "id_ol_work", "isbn", "keywords", "month_read", "note", "pages", "read_order", "slug", "subtitle", "title", "year_first_published", "year_read" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
CREATE UNIQUE INDEX "books_id_ol_book_key" ON "books"("id_ol_book");
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");
CREATE UNIQUE INDEX "books_read_order_key" ON "books"("read_order");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
