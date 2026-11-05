-- AlterTable
ALTER TABLE "music_queue" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Bisher ergab sich die Reihenfolge aus der ID, vorhandene Songs behalten ihren Platz.
UPDATE "music_queue" SET "position" = "id";
