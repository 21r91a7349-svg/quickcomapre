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

  // Future API Integration Point
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        // Mock API call - ready for GET /api/search?q=
        // const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        // const data = await res.json();
        
        // Mock data for now
        setTimeout(() => {
          setSuggestions([
            { id: '1', title: `${debouncedQuery} overview`, type: 'result' },
            { id: '2', title: `Explore ${debouncedQuery} trends`, type: 'ai' }
          ]);
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error('Search error:', error);
        setIsLoading(false);
      }
    };

    fetchSuggestions();
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
