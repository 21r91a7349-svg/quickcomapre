'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SearchContextType, SearchSuggestion } from './types';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Live API Integration
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Suggestions API returned ${res.status}`);
        const data = await res.json();

        const mapped: SearchSuggestion[] = [];
        if (data.products) {
          for (const p of data.products.slice(0, 5)) {
            mapped.push({ id: `prod-${p}`, title: p, type: 'result' });
          }
        }
        if (data.brands) {
          for (const b of data.brands.slice(0, 3)) {
            mapped.push({ id: `brand-${b}`, title: b, type: 'ai' });
          }
        }

        setSuggestions(mapped);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Suggestions fetch error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => controller.abort();
  }, [debouncedQuery]);

  const clearHistory = useCallback(() => {
    // Implement history clearing later
  }, []);

  const executeSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsOpen(false);
    // Support future API integration
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  }, [router]);

  // Reset focus when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query]);

  return (
    <SearchContext.Provider
      value={{
        query,
        debouncedQuery,
        isOpen,
        isLoading,
        suggestions,
        focusedIndex,
        setQuery,
        setIsOpen,
        setFocusedIndex,
        clearHistory,
        executeSearch
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
