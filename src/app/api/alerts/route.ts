import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/scraper/core/db';
import { rateLimit } from '@/lib/rateLimit';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success } = rateLimit(`alerts:post:${ip}`, { maxRequests: 5, windowMs: 60 * 1000 }); // 5 requests per minute
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await auth();
    const body = await request.json();
    let { productId, targetPrice, condition, contactMethod, contactAddress } = body;

    // Authenticated Alert Protection
    if (session?.user?.email) {
      contactAddress = session.user.email;
    }

    if (!productId || !targetPrice || !contactAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        productId,
        targetPrice: Number(targetPrice),
        condition: condition || 'BELOW',
        contactMethod: contactMethod || 'EMAIL',
        contactAddress,
        userId: session?.user?.id || null,
      }
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success } = rateLimit(`alerts:get:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 }); // 20 requests per minute
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    
    // Authenticated users only see their own alerts. Anonymous users see by contactAddress.
    let contactAddress = searchParams.get('contactAddress');
    
    if (session?.user?.email) {
      contactAddress = session.user.email;
    }

    if (!contactAddress) {
      return NextResponse.json({ error: 'contactAddress is required for anonymous users' }, { status: 400 });
    }

    const alerts = await prisma.priceAlert.findMany({
      where: { contactAddress },
      include: {
        product: {
          select: {
            display_name: true,
            canonical_image_url: true,
            listings: {
              select: {
                currentPrice: true,
                inStock: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
