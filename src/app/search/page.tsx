'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/types';
import { ProductComparisonCard } from '@/components/product/ProductComparisonCard';
import { Search, Frown } from 'lucide-react';
import { SearchContainer } from '@/components/search';
import { Suspense } from 'react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch results');
        
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error(err);
        setError('Something went wrong while searching. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  return (
    <div className="container mx-auto px-4 max-w-5xl py-8 md:py-12">
      {/* Search Header */}
      <div className="mb-10">
        <div className="max-w-2xl">
          <SearchContainer />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-8">
          Search Results for &quot;{query}&quot;
        </h1>
        {!isLoading && !error && (
          <p className="text-muted-foreground mt-2">
            Found {results.length} product{results.length !== 1 ? 's' : ''} across multiple platforms.
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-background rounded-2xl border border-border p-6 shadow-sm animate-pulse flex flex-col md:flex-row gap-6">
              <div className="flex md:w-1/3 gap-4">
                <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0" />
                <div className="space-y-3 flex-1">
                  <div className="h-3 w-1/3 bg-muted rounded" />
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/4 bg-muted rounded mt-4" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-4 w-1/4 bg-muted rounded mb-6" />
                <div className="h-16 w-full bg-muted rounded-xl" />
                <div className="h-16 w-full bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && query.trim() !== '' && (
        <div className="bg-muted/30 border border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Frown className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">No exact matches found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn&apos;t find any products matching &quot;{query}&quot;. Try using more general keywords or checking your spelling.
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-8">
          {results.map((product) => (
            <ProductComparisonCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 max-w-5xl py-8 md:py-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <SearchResults />
    </Suspense>
  );
}
