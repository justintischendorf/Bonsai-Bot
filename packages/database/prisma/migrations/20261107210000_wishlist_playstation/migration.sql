-- AlterTable
ALTER TABLE "wishlist" ADD COLUMN "playstationPrice" REAL;
ALTER TABLE "wishlist" ADD COLUMN "playstationLink" TEXT;
ALTER TABLE "wishlist" ADD COLUMN "playstationLinkBroken" BOOLEAN NOT NULL DEFAULT false;
