import { NextRequest, NextResponse } from 'next/server';
import { SearchEngine } from '@/scraper/core/search/SearchEngine';

const searchEngine = new SearchEngine();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ brands: [], categories: [], products: [] });
  }

  try {
    const suggestions = await searchEngine.suggest(query);
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('[Suggestions API Error]', error);
    return NextResponse.json({ brands: [], categories: [], products: [] }, { status: 500 });
  }
}
