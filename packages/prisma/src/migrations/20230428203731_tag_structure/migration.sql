/*
  Warnings:

  - You are about to drop the column `type` on the `tags` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TagMap" (
    "id_tag" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    CONSTRAINT "TagMap_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "tags" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TagMap" ("date_added", "date_updated", "id_item", "id_tag", "type") SELECT "date_added", "date_updated", "id_item", "id_tag", "type" FROM "TagMap";
DROP TABLE "TagMap";
ALTER TABLE "new_TagMap" RENAME TO "TagMap";
CREATE UNIQUE INDEX "TagMap_id_tag_id_item_type_key" ON "TagMap"("id_tag", "id_item", "type");
CREATE TABLE "new_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);
INSERT INTO "new_tags" ("date_added", "date_updated", "id", "name", "slug") SELECT "date_added", "date_updated", "id", "name", "slug" FROM "tags";
DROP TABLE "tags";
ALTER TABLE "new_tags" RENAME TO "tags";
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
