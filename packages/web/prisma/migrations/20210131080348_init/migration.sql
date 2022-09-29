-- CreateTable
CREATE TABLE "books" (
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
    "year_published" INTEGER,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TagMap" (
    "id_tag" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "books.id_ol_book_unique" ON "books"("id_ol_book");

-- CreateIndex
CREATE UNIQUE INDEX "books.isbn_unique" ON "books"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "tags.type_slug_unique" ON "tags"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "TagMap.id_tag_id_item_type_unique" ON "TagMap"("id_tag", "id_item", "type");
