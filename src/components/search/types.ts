export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'recent' | 'trending' | 'result' | 'ai';
  url?: string;
  subtitle?: string;
}

export interface SearchState {
  query: string;
  debouncedQuery: string;
  isOpen: boolean;
  isLoading: boolean;
  suggestions: SearchSuggestion[];
  focusedIndex: number;
}

export interface SearchActions {
  setQuery: (query: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  setFocusedIndex: (index: number | ((prev: number) => number)) => void;
  clearHistory: () => void;
  executeSearch: (query: string) => void;
}

export type SearchContextType = SearchState & SearchActions;
