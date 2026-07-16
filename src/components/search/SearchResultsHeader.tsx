'use client';

import React from 'react';
import { useSearch } from './SearchContext';

export function SearchResultsHeader() {
  const { query, isLoading, suggestions } = useSearch();

  if (!query || query.trim().length === 0) return null;

  return (
    <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center text-xs text-muted-foreground">
      <div className="flex items-center space-x-2">
        <span>Results for</span>
        <span className="font-semibold text-foreground">&quot;{query}&quot;</span>
      </div>
      
      {isLoading ? (
        <span className="animate-pulse">Searching...</span>
      ) : (
        <span>{suggestions.length} found</span>
      )}
    </div>
  );
}
