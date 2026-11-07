-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_wishlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steamPrice" REAL,
    "instantGamingPrice" REAL,
    "playstationPrice" REAL,
    "steamLink" TEXT,
    "instantGamingLink" TEXT,
    "playstationLink" TEXT,
    "steamLinkBroken" BOOLEAN NOT NULL DEFAULT false,
    "instantGamingLinkBroken" BOOLEAN NOT NULL DEFAULT false,
    "playstationLinkBroken" BOOLEAN NOT NULL DEFAULT false,
    "crossplayAvailable" BOOLEAN NOT NULL DEFAULT false,
    "releaseDate" TEXT,
    "imageUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_wishlist" ("createdAt", "createdBy", "description", "id", "imageUrl", "instantGamingLink", "instantGamingLinkBroken", "instantGamingPrice", "name", "playstationLink", "playstationLinkBroken", "playstationPrice", "releaseDate", "steamLink", "steamLinkBroken", "steamPrice") SELECT "createdAt", "createdBy", "description", "id", "imageUrl", "instantGamingLink", "instantGamingLinkBroken", "instantGamingPrice", "name", "playstationLink", "playstationLinkBroken", "playstationPrice", "releaseDate", "steamLink", "steamLinkBroken", "steamPrice" FROM "wishlist";
DROP TABLE "wishlist";
ALTER TABLE "new_wishlist" RENAME TO "wishlist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
