import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/scraper/core/db';
import { format, startOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Fetch product with listings and price history
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        listings: {
          include: {
            platform: true,
            priceHistory: {
              ...(days > 0 ? {
                where: {
                  recordedAt: {
                    gte: subDays(new Date(), days)
                  }
                }
              } : {}),
              orderBy: {
                recordedAt: 'asc'
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Process data for charts
    // We want a unified timeline: [{ date: '2023-10-01', zepto: 45, blinkit: 46 }]
    const timelineMap = new Map<string, any>();
    let globalLowest = Infinity;
    let globalHighest = -Infinity;
    let sumPrice = 0;
    let countPrice = 0;
    
    // Track platforms that actually have history
    const platforms = new Set<string>();

    product.listings.forEach(listing => {
      const platformName = listing.platform.name;
      platforms.add(platformName);
      
      listing.priceHistory.forEach(ph => {
        const dateStr = format(ph.recordedAt, 'MMM dd');
        const price = Number(ph.price);
        
        // Stats
        if (price < globalLowest) globalLowest = price;
        if (price > globalHighest) globalHighest = price;
        sumPrice += price;
        countPrice++;

        if (!timelineMap.has(dateStr)) {
          timelineMap.set(dateStr, { date: dateStr });
        }
        
        const entry = timelineMap.get(dateStr);
        // Only set the last price of the day if there are multiple (or average them)
        entry[platformName] = price;
      });
    });

    const chartData = Array.from(timelineMap.values());
    const average = countPrice > 0 ? (sumPrice / countPrice) : 0;
    
    // Calculate current savings
    let currentBestPrice = Infinity;
    product.listings.forEach(listing => {
      if (listing.inStock && Number(listing.currentPrice) < currentBestPrice) {
         currentBestPrice = Number(listing.currentPrice);
      }
    });
    
    const currentSavings = (globalHighest !== -Infinity && currentBestPrice !== Infinity) 
      ? Math.max(0, globalHighest - currentBestPrice) 
      : 0;

    return NextResponse.json({
      chartData,
      platforms: Array.from(platforms),
      stats: {
        lowest: globalLowest !== Infinity ? globalLowest : null,
        highest: globalHighest !== -Infinity ? globalHighest : null,
        average: countPrice > 0 ? Number(average.toFixed(2)) : null,
        currentBestPrice: currentBestPrice !== Infinity ? currentBestPrice : null,
        currentSavings: currentSavings > 0 ? Number(currentSavings.toFixed(2)) : null
      }
    });
  } catch (error: any) {
    console.error('Price history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
