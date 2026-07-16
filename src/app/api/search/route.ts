import { NextRequest, NextResponse } from 'next/server';
import { scraperOrchestrator } from '@/scraper';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  // 1. Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = rateLimit(`search:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 }); // 20 requests per minute
  
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    console.log('[DIAGNOSTIC] A. Route entered for query:', query);
    
    console.log('[DIAGNOSTIC] B. Before orchestrator.getSearchResults()');
    // 2. Fetch from Orchestrator (DB cache -> Live Scrape -> DB return)
    const results = await scraperOrchestrator.getSearchResults(query);
    console.log('[DIAGNOSTIC] C. After orchestrator.getSearchResults()');

    console.log('[DIAGNOSTIC] H. Before returning response');
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[DIAGNOSTIC EXCEPTION in route.ts]', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      file: 'src/app/api/search/route.ts',
      line: 'orchestrator call'
    });
    return NextResponse.json({ error: 'Internal server error during search', details: error.message }, { status: 500 });
  }
}
