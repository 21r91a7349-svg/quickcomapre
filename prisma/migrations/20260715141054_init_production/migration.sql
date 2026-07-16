-- CreateEnum
CREATE TYPE "USER_ROLE" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('QUICK_COMMERCE', 'ECOMMERCE', 'HYPERLOCAL');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('GROCERY', 'ELECTRONICS', 'HOUSEHOLD', 'PERSONAL_CARE', 'BEVERAGES', 'SNACKS', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "USER_ROLE" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "brand" TEXT,
    "category" "ProductCategory",
    "subcategory" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "canonical_image_url" TEXT,
    "search_keywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PlatformType" NOT NULL DEFAULT 'QUICK_COMMERCE',
    "website" TEXT,
    "logo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "productUrl" TEXT,
    "currentPrice" DECIMAL(65,30) NOT NULL,
    "originalPrice" DECIMAL(65,30),
    "discount" DECIMAL(65,30),
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION,
    "deliveryTime" TEXT,
    "imageUrl" TEXT,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Product_normalized_name_idx" ON "Product"("normalized_name");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_normalized_name_quantity_unit_brand_key" ON "Product"("normalized_name", "quantity", "unit", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_slug_key" ON "Platform"("slug");

-- CreateIndex
CREATE INDEX "Listing_productId_idx" ON "Listing"("productId");

-- CreateIndex
CREATE INDEX "Listing_platformId_idx" ON "Listing"("platformId");

-- CreateIndex
CREATE INDEX "Listing_currentPrice_idx" ON "Listing"("currentPrice");

-- CreateIndex
CREATE INDEX "Listing_lastScrapedAt_idx" ON "Listing"("lastScrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_platformId_platformProductId_key" ON "Listing"("platformId", "platformProductId");

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_idx" ON "PriceHistory"("listingId");

-- CreateIndex
CREATE INDEX "PriceHistory_recordedAt_idx" ON "PriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_recordedAt_idx" ON "PriceHistory"("listingId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
