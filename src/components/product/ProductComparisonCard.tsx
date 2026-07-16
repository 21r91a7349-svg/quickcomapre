'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Listing } from '@/types';
import { ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';

interface ProductComparisonCardProps {
  product: Product;
}

export function ProductComparisonCard({ product }: ProductComparisonCardProps) {
  // Sort listings by lowest price first
  const sortedListings = [...product.listings].sort((a, b) => {
    // If one is out of stock, push it to the bottom
    if (!a.inStock && b.inStock) return 1;
    if (a.inStock && !b.inStock) return -1;
    return a.currentPrice - b.currentPrice;
  });

  const bestListing = sortedListings[0];

  return (
    <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row">
        
        {/* Left/Top side: Product Info */}
        <div className="flex flex-row md:flex-col md:w-1/3 p-4 md:p-6 border-b md:border-b-0 md:border-r border-border gap-4">
          <div className="relative w-24 h-24 md:w-full md:aspect-square flex-shrink-0 bg-white rounded-xl overflow-hidden border border-border/50">
            {product.canonical_image_url ? (
              <Image 
                src={product.canonical_image_url}
                alt={product.display_name}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 96px, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No Image
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-center md:justify-start">
            {product.brand && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {product.brand}
              </p>
            )}
            <Link href={`/product/${product.id}`} className="group">
              <h3 className="text-base md:text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                {product.display_name}
              </h3>
            </Link>
            
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {product.quantity} {product.unit}
            </p>
          </div>
        </div>

        {/* Right/Bottom side: Platform Listings */}
        <div className="flex-1 p-4 md:p-6 bg-muted/10">
          <h4 className="text-sm font-semibold mb-4 text-foreground/80">Available on</h4>
          
          <div className="space-y-3">
            {sortedListings.map((listing, index) => {
              const isBest = index === 0 && listing.inStock;
              
              return (
                <div 
                  key={listing.id}
                  className={`flex flex-wrap sm:flex-nowrap items-center justify-between p-3 md:p-4 rounded-xl border ${
                    isBest ? 'bg-primary/5 border-primary/20' : 'bg-background border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto mb-2 sm:mb-0">
                    {/* Platform Logo Placeholder */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${listing.platform.slug === 'zepto' ? 'bg-purple-600' : 
                        listing.platform.slug === 'blinkit' ? 'bg-yellow-500' :
                        listing.platform.slug === 'instamart' ? 'bg-orange-500' : 'bg-green-600'
                      }
                    `}>
                      {listing.platform.name.charAt(0)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{listing.platform.name}</span>
                        {isBest && (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[10px] px-1.5 py-0">
                            Best Price
                          </Badge>
                        )}
                      </div>
                      
                      {listing.inStock ? (
                        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3 mr-1" />
                          {listing.deliveryTime || 'Delivery unknown'}
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-destructive mt-0.5 font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Out of stock
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        ₹{listing.currentPrice.toFixed(2)}
                      </div>
                      {listing.originalPrice && listing.originalPrice > listing.currentPrice && (
                        <div className="flex items-center justify-end gap-1.5 text-xs">
                          <span className="text-muted-foreground line-through">₹{listing.originalPrice.toFixed(2)}</span>
                          {listing.discount && listing.discount > 0 && (
                            <span className="text-green-500 font-medium">-{listing.discount}%</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {listing.inStock && listing.productUrl ? (
                      <a 
                        href={listing.productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={buttonVariants({ variant: isBest ? 'default' : 'outline', size: 'sm' })}
                      >
                        Buy <ExternalLink className="w-3 h-3 ml-1.5" />
                      </a>
                    ) : (
                      <Button 
                        size="sm"
                        variant={isBest ? 'default' : 'outline'}
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
