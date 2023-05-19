/*
  Warnings:

  - You are about to drop the `TagMap` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TagMap";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "tag_maps" (
    "id_tag" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    CONSTRAINT "tag_maps_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "tags" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_maps_id_tag_id_item_type_key" ON "tag_maps"("id_tag", "id_item", "type");
