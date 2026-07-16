import React from 'react';
import { prisma } from '@/scraper/core/db';
import { notFound } from 'next/navigation';
import { ProductComparisonCard } from '@/components/product/ProductComparisonCard';
import { PriceAlertModal } from '@/components/product/PriceAlertModal';
import { auth } from '@/auth';
import Link from 'next/link';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import { ChevronLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Map to the UI type expected by ProductComparisonCard
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

  const currentBestPrice = uiProduct.listings.reduce((min, l) => l.inStock && l.currentPrice < min ? l.currentPrice : min, Infinity);

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-500">
      <Link 
        href="/" 
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-4 text-muted-foreground' })}
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Search
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Main Product Info & Comparisons */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Compare Prices</h2>
            <PriceAlertModal 
              productId={product.id} 
              productName={product.display_name} 
              currentBestPrice={currentBestPrice !== Infinity ? currentBestPrice : undefined} 
              userEmail={session?.user?.email || undefined}
            />
          </div>
          <ProductComparisonCard product={uiProduct as any} />
        </section>

        {/* Price History Section */}
        <section>
          <PriceHistoryChart productId={product.id} />
        </section>
      </div>
    </div>
  );
}
