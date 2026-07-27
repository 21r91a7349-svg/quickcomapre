import { NextRequest, NextResponse } from 'next/server';
import { scraperOrchestrator } from '@/scraper';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';

  try {
    const registry = scraperOrchestrator.getRegistry();
    const report = await registry.getHealthReport(force);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      forced: force,
      adapters: report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate adapter health report', details: error.message },
      { status: 500 }
    );
  }
}
