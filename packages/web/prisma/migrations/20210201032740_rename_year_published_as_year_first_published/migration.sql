/*
  Warnings:

  - You are about to drop the column `year_published` on the `books` table. All the data in the column will be lost.

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
    "keywords" TEXT
);
INSERT INTO "new_books" ("id", "id_ol_book", "id_ol_work", "isbn", "title", "subtitle", "author", "coauthors", "description", "pages", "year_read", "month_read", "date_added", "date_updated", "keywords") SELECT "id", "id_ol_book", "id_ol_work", "isbn", "title", "subtitle", "author", "coauthors", "description", "pages", "year_read", "month_read", "date_added", "date_updated", "keywords" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
CREATE UNIQUE INDEX "books.id_ol_book_unique" ON "books"("id_ol_book");
CREATE UNIQUE INDEX "books.isbn_unique" ON "books"("isbn");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
