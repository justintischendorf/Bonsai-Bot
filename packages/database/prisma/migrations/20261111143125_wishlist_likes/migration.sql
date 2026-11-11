-- CreateTable
CREATE TABLE "wishlist_like" (
    "wishlistId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("wishlistId", "userId"),
    CONSTRAINT "wishlist_like_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wishlist_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "wishlist_like_userId_idx" ON "wishlist_like"("userId");
