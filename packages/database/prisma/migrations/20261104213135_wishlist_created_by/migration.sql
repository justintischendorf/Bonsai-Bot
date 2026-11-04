/*
  Warnings:

  - Added the required column `createdBy` to the `wishlist` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_wishlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steamPrice" REAL,
    "instantGamingPrice" REAL,
    "steamLink" TEXT,
    "instantGamingLink" TEXT,
    "releaseDate" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_wishlist" ("createdAt", "createdBy", "description", "id", "instantGamingLink", "instantGamingPrice", "name", "releaseDate", "steamLink", "steamPrice") SELECT "createdAt", 'Heizung', "description", "id", "instantGamingLink", "instantGamingPrice", "name", "releaseDate", "steamLink", "steamPrice" FROM "wishlist";
DROP TABLE "wishlist";
ALTER TABLE "new_wishlist" RENAME TO "wishlist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
