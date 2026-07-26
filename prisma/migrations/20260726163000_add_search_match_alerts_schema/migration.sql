-- CreateEnum (Safe & Idempotent)
DO $$ BEGIN
    CREATE TYPE "MatchStrategy" AS ENUM ('DETERMINISTIC', 'FUZZY', 'AI', 'EVIDENCE_SCORE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertCondition" AS ENUM ('BELOW', 'ABOVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PUSH', 'WHATSAPP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
DO $$ BEGIN
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "embedding" vector;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "matchedAt" TIMESTAMP(3);
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "matchingConfidence" DOUBLE PRECISION;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "matchingMethod" "MatchStrategy" NOT NULL DEFAULT 'DETERMINISTIC';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductAlias" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "platformTitle" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductMatchReview" (
    "id" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "matchingReason" TEXT NOT NULL,
    "matchingStrategy" "MatchStrategy" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMatchReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PriceAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "targetPrice" DECIMAL(65,30) NOT NULL,
    "condition" "AlertCondition" NOT NULL DEFAULT 'BELOW',
    "contactMethod" "ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "contactAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductAlias_productId_idx" ON "ProductAlias"("productId");
CREATE INDEX IF NOT EXISTS "ProductAlias_normalizedTitle_idx" ON "ProductAlias"("normalizedTitle");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductAlias_platformId_platformProductId_key" ON "ProductAlias"("platformId", "platformProductId");
CREATE INDEX IF NOT EXISTS "PriceAlert_productId_idx" ON "PriceAlert"("productId");
CREATE INDEX IF NOT EXISTS "PriceAlert_userId_idx" ON "PriceAlert"("userId");
CREATE INDEX IF NOT EXISTS "PriceAlert_contactAddress_idx" ON "PriceAlert"("contactAddress");
CREATE INDEX IF NOT EXISTS "PriceAlert_isActive_idx" ON "PriceAlert"("isActive");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ProductAlias" ADD CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ProductMatchReview" ADD CONSTRAINT "ProductMatchReview_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ProductMatchReview" ADD CONSTRAINT "ProductMatchReview_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
