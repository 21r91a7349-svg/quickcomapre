'use client';

import React from 'react';
import { useSearch } from './SearchContext';
import { Search, Clock, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

export function SearchSuggestions() {
  const { suggestions, focusedIndex, setFocusedIndex, executeSearch, query } = useSearch();

  if (suggestions.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'recent': return <Clock className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'ai': return <Sparkles className="w-4 h-4 text-primary" />;
      case 'result':
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div 
      className="py-2"
      role="listbox"
      id="search-suggestions"
    >
      {suggestions.map((suggestion, index) => {
        const isFocused = index === focusedIndex;
        
        return (
          <button
            key={suggestion.id}
            id={`suggestion-${index}`}
            role="option"
            aria-selected={isFocused}
            onClick={() => executeSearch(suggestion.title)}
            onMouseEnter={() => setFocusedIndex(index)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-200 ${
              isFocused ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-1.5 rounded-md ${isFocused ? 'bg-background/50' : 'bg-transparent'}`}>
                {getIcon(suggestion.type)}
              </div>
              <div>
                <div className="font-medium">
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="text-xs text-muted-foreground/80 mt-0.5">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
            </div>
            
            {isFocused && (
              <div className="text-xs flex items-center space-x-1 text-primary animate-in fade-in slide-in-from-right-2">
                <span>Jump to</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
