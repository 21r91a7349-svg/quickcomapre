'use client';

import React from 'react';
import { useSearch } from './SearchContext';
import { SearchSuggestions } from './SearchSuggestions';
import { Clock, TrendingUp, Search } from 'lucide-react';

export function SearchHistory() {
  const { query, executeSearch } = useSearch();

  // If there is a query, we show suggestions instead of history
  if (query.trim().length > 0) {
    return <SearchSuggestions />;
  }

  // Mock initial state for when there's no query
  // In a real app, this would be fetched from localStorage or API
  const recentSearches = [
    { id: 'h1', title: 'Plant disease detection API', type: 'recent' },
    { id: 'h2', title: 'Financial analyst capabilities', type: 'recent' }
  ];

  const trendingSearches = [
    { id: 't1', title: 'AI architecture', type: 'trending' },
    { id: 't2', title: 'Server components vs Client components', type: 'trending' },
    { id: 't3', title: 'Performance optimization', type: 'trending' }
  ];

  return (
    <div className="py-4 space-y-6">
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Recent</span>
          </div>
          <div className="space-y-1">
            {recentSearches.map((item) => (
              <button
                key={item.id}
                onClick={() => executeSearch(item.title)}
                className="w-full flex items-center px-4 py-2 text-left text-sm text-foreground/80 hover:bg-white/5 hover:text-foreground transition-colors duration-200"
              >
                <Clock className="w-4 h-4 mr-3 text-muted-foreground" />
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
          <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
          <span>Trending</span>
        </div>
        <div className="flex flex-wrap gap-2 px-4">
          {trendingSearches.map((item) => (
            <button
              key={item.id}
              onClick={() => executeSearch(item.title)}
              className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs text-foreground/80 hover:text-foreground transition-colors duration-200"
            >
              <Search className="w-3 h-3 mr-1.5 text-muted-foreground" />
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
