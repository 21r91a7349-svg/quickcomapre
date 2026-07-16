'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Clock, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

type Listing = {
  id: string;
  platform: { name: string; slug: string };
  currentPrice: number;
  originalPrice: number | null;
  discount: number | null;
  inStock: boolean;
  deliveryTime: string | null;
  productUrl: string;
  lastScrapedAt: Date;
};

type CompareMatrixProps = {
  listings: Listing[];
  mrp: number | null;
};

export function CompareMatrix({ listings, mrp }: CompareMatrixProps) {
  // Sort listings: In Stock first, then cheapest first
  const sortedListings = [...listings].sort((a, b) => {
    if (a.inStock && !b.inStock) return -1;
    if (!a.inStock && b.inStock) return 1;
    return a.currentPrice - b.currentPrice;
  });

  const bestPrice = sortedListings.find(l => l.inStock)?.currentPrice;

  const renderStockBadge = (inStock: boolean) => {
    if (inStock) return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> In Stock</Badge>;
    return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200"><AlertCircle className="w-3 h-3 mr-1"/> Out of Stock</Badge>;
  };

  const renderDelivery = (deliveryTime: string | null) => {
    if (!deliveryTime) return <span className="text-muted-foreground">-</span>;
    const isFast = deliveryTime.toLowerCase().includes('min');
    return (
      <div className="flex items-center text-sm">
        {isFast ? <Zap className="w-4 h-4 mr-1 text-yellow-500" /> : <Clock className="w-4 h-4 mr-1 text-blue-500" />}
        {deliveryTime}
      </div>
    );
  };

  const calculateSavings = (price: number) => {
    if (!mrp || price >= mrp) return null;
    const saveAmt = Number((mrp - price).toFixed(2));
    const savePct = Math.round((saveAmt / mrp) * 100);
    return { amt: saveAmt, pct: savePct };
  };

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/10 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <p>No pricing data available for this product yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Platform</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Delivery</th>
              <th className="px-6 py-4 font-medium">Stock</th>
              <th className="px-6 py-4 font-medium">Updated</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedListings.map((listing, idx) => {
              const isBest = listing.inStock && listing.currentPrice === bestPrice;
              const savings = calculateSavings(listing.currentPrice);

              return (
                <motion.tr 
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className={`group relative ${isBest ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center font-semibold text-base">
                      {listing.platform.name}
                      {isBest && <Badge className="ml-2 bg-primary text-primary-foreground hover:bg-primary">✓ Cheapest</Badge>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">₹{listing.currentPrice}</span>
                      {savings && (
                        <span className="text-xs font-medium text-green-600">
                          Save ₹{savings.amt} ({savings.pct}%)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{renderDelivery(listing.deliveryTime)}</td>
                  <td className="px-6 py-4">{renderStockBadge(listing.inStock)}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(listing.lastScrapedAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild size="sm" variant={isBest ? 'default' : 'outline'} className="shadow-sm">
                      <a href={listing.productUrl} target="_blank" rel="noopener noreferrer">
                        Buy Now <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (No Horizontal Scroll) */}
      <div className="md:hidden space-y-3">
        {sortedListings.map((listing, idx) => {
          const isBest = listing.inStock && listing.currentPrice === bestPrice;
          const savings = calculateSavings(listing.currentPrice);

          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`p-4 flex flex-col space-y-3 ${isBest ? 'border-primary/50 bg-primary/5' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center font-semibold text-lg">
                    {listing.platform.name}
                    {isBest && <Badge className="ml-2 bg-primary text-primary-foreground">✓ Cheapest</Badge>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xl block">₹{listing.currentPrice}</span>
                    {savings && (
                      <span className="text-xs font-medium text-green-600">
                        Save ₹{savings.amt} ({savings.pct}%)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm">
                  {renderStockBadge(listing.inStock)}
                  {renderDelivery(listing.deliveryTime)}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(listing.lastScrapedAt), { addSuffix: true })}
                  </span>
                  <Button asChild size="sm" variant={isBest ? 'default' : 'outline'} className="shadow-sm">
                    <a href={listing.productUrl} target="_blank" rel="noopener noreferrer">
                      Buy Now
                    </a>
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
