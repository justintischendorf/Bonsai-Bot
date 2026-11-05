-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_music_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "url" TEXT,
    "duration" INTEGER NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_music_queue" ("createdAt", "duration", "id", "requestedBy", "title", "url") SELECT "createdAt", "duration", "id", "requestedBy", "title", "url" FROM "music_queue";
DROP TABLE "music_queue";
ALTER TABLE "new_music_queue" RENAME TO "music_queue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
