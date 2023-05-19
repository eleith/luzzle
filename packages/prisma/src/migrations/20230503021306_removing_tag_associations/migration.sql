-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tag_maps" (
    "id_tag" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);
INSERT INTO "new_tag_maps" ("date_added", "date_updated", "id_item", "id_tag", "type") SELECT "date_added", "date_updated", "id_item", "id_tag", "type" FROM "tag_maps";
DROP TABLE "tag_maps";
ALTER TABLE "new_tag_maps" RENAME TO "tag_maps";
CREATE UNIQUE INDEX "tag_maps_id_tag_id_item_type_key" ON "tag_maps"("id_tag", "id_item", "type");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
