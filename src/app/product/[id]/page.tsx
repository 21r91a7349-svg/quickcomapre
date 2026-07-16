import React from 'react';
import { prisma } from '@/scraper/core/db';
import { notFound } from 'next/navigation';
import { CompareMatrix } from '@/components/product/CompareMatrix';
import { PriceAlertModal } from '@/components/product/PriceAlertModal';
import { auth } from '@/auth';
import Link from 'next/link';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import { ChevronLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      listings: {
        include: {
          platform: true
        }
      }
    }
  });

  if (!product) {
    return notFound();
  }

  // Map to the UI type expected by CompareMatrix
  const uiProduct = {
    ...product,
    quantity: product.quantity ? Number(product.quantity) : null,
    listings: product.listings.map(l => ({
      ...l,
      currentPrice: Number(l.currentPrice),
      originalPrice: l.originalPrice ? Number(l.originalPrice) : null,
      discount: l.discount ? Number(l.discount) : null,
      platform: {
        name: l.platform.name,
        slug: l.platform.slug
      }
    }))
  };

  const sortedListings = [...uiProduct.listings].sort((a, b) => {
    if (a.inStock && !b.inStock) return -1;
    if (!a.inStock && b.inStock) return 1;
    return a.currentPrice - b.currentPrice;
  });

  const bestListing = sortedListings.find(l => l.inStock);
  const bestPrice = bestListing?.currentPrice;
  const mrp = uiProduct.listings.find(l => l.originalPrice)?.originalPrice || null;

  let savingsAmt = null;
  let savingsPct = null;
  if (bestPrice && mrp && bestPrice < mrp) {
    savingsAmt = Number((mrp - bestPrice).toFixed(2));
    savingsPct = Math.round((savingsAmt / mrp) * 100);
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-8 animate-in fade-in duration-500">
      <Link 
        href="/" 
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-4 text-muted-foreground' })}
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Search
      </Link>
      
      {/* 1. Compact Hero Section (Decision Engine) */}
      <section className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between border-b pb-8">
        <div className="flex gap-6 items-center flex-1">
          {product.canonical_image_url ? (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white p-2 shadow-sm border flex-shrink-0">
              <img src={product.canonical_image_url} alt={product.display_name} className="w-full h-full object-contain mix-blend-multiply" />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs flex-shrink-0 border">
              No Image
            </div>
          )}
          <div className="space-y-1">
            {product.brand && (
              <Badge variant="secondary" className="mb-1">{product.brand}</Badge>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">{product.display_name}</h1>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
              {product.quantity && product.unit && (
                <span className="font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">{product.quantity}{product.unit}</span>
              )}
              {product.category && product.category !== 'OTHER' && (
                <span>{product.category}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Price & Action Block */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm min-w-full lg:min-w-[300px] flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Best Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">₹{bestPrice ?? '--'}</span>
                {bestListing && <span className="text-sm font-medium text-muted-foreground">on {bestListing.platform.name}</span>}
              </div>
            </div>
            {savingsAmt && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                Save ₹{savingsAmt} ({savingsPct}%)
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2 mt-2">
            {bestListing ? (
              <a 
                href={bestListing.productUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={buttonVariants({ size: 'lg', className: 'flex-1 font-semibold text-md shadow-sm' })}
              >
                Buy Cheapest
              </a>
            ) : (
              <div className={buttonVariants({ size: 'lg', variant: 'secondary', className: 'flex-1 font-semibold text-md cursor-not-allowed opacity-50' })}>
                Out of Stock
              </div>
            )}
            
            <PriceAlertModal 
              productId={product.id} 
              productName={product.display_name} 
              currentBestPrice={bestPrice} 
              userEmail={session?.user?.email || undefined}
            />
          </div>
        </div>
      </section>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* Left Column: Compare Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Compare Prices</h2>
          <CompareMatrix listings={uiProduct.listings as any} mrp={mrp} />
        </div>

        {/* Right Column: Analytics & Details */}
        <div className="space-y-6">
          <Card className="p-5 border shadow-sm">
            <h3 className="font-bold text-lg mb-4">Price History</h3>
            <div className="h-[250px] w-full">
              <PriceHistoryChart productId={product.id} />
            </div>
          </Card>

          <Card className="p-5 border shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Product Info</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-medium text-right">{product.brand || 'Unbranded'}</span>
              
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-right">{product.category !== 'OTHER' ? product.category : '-'}</span>
              
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium text-right">{product.quantity ? `${product.quantity}${product.unit}` : '-'}</span>
              
              <span className="text-muted-foreground">Platforms</span>
              <span className="font-medium text-right">{product.listings.length} Available</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
