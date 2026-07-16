'use client';

import React, { useRef, useEffect } from 'react';
import { useSearch } from './SearchContext';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';

export function SearchInput() {
  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    isLoading,
    focusedIndex,
    setFocusedIndex,
    executeSearch,
    suggestions
  } = useSearch();

  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Handle local keyboard interactions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        // Execute suggestion
        executeSearch(suggestions[focusedIndex].title);
      } else {
        executeSearch(query);
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
      
      <div className={`relative flex items-center bg-background/80 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 ${isOpen ? 'ring-2 ring-primary/50 bg-background/95' : 'hover:bg-background/90'}`}>
        <div className="pl-4 pr-2 text-muted-foreground">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SearchIcon className="w-5 h-5" />}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects, AI insights, or specific stocks..."
          className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/60 py-4 outline-none text-lg"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-activedescendant={focusedIndex >= 0 ? `suggestion-${focusedIndex}` : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        <div className="flex items-center pr-4 space-x-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-white/5 rounded-md border border-white/10 text-xs text-muted-foreground font-medium">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
