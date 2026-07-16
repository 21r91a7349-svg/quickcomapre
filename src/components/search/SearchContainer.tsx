'use client';

import React, { useRef, useEffect } from 'react';
import { SearchProvider, useSearch } from './SearchContext';
import { SearchInput } from './SearchInput';
import { SearchHistory } from './SearchHistory';
import { SearchResultsHeader } from './SearchResultsHeader';

function SearchDropdown() {
  const { isOpen, setIsOpen } = useSearch();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      <SearchInput />
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <SearchResultsHeader />
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            <SearchHistory />
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchContainer() {
  return (
    <SearchProvider>
      <SearchDropdown />
    </SearchProvider>
  );
}
