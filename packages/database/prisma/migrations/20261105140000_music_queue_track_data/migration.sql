-- Einträge ohne Lavalink-Track lassen sich nicht abspielen, deshalb startet die Warteschlange leer.
DELETE FROM "music_queue";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_music_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "encodedTrack" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TABLE "music_queue";
ALTER TABLE "new_music_queue" RENAME TO "music_queue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
