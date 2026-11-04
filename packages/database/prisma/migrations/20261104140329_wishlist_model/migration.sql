-- CreateTable
CREATE TABLE "wishlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steamPrice" REAL,
    "instantGamingPrice" REAL,
    "steamLink" TEXT,
    "instantGamingLink" TEXT,
    "releaseDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
