"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export type SearchResult = {
  id: number;
  conversationId: string;
  title: string;
  snippet: string;
  date: string;
  timestamp: string;
};

interface SearchInterfaceProps {
  onClose: () => void;
  onResultClick: (conversationId: string, messageId: number) => void;
}

export function SearchInterface({ onClose, onResultClick }: SearchInterfaceProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto focus on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121212] overflow-hidden">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
        {/* Header / Search Bar */}
        <div className="p-8 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-serif text-gray-900 dark:text-dark-text-primary">{t('search')}</h1>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-dark-sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-gray-50 dark:bg-dark-sidebar border border-transparent dark:border-dark-border rounded-2xl text-lg text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-[#060E9F] focus:border-transparent focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
              placeholder={t('searchPlaceholder')}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {loading ? (
             <div className="text-center py-10 text-gray-400 dark:text-dark-text-muted">{t('searching')}</div>
          ) : query && results.length === 0 ? (
             <div className="text-center py-10 text-gray-400 dark:text-dark-text-muted">{t('noResults')}</div>
          ) : (
            <div className="space-y-6">
              {results.length > 0 && (
                <p className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-4">
                  {results.length} {t('resultsFound').replace('{query}', query)}
                </p>
              )}
              
              {results.map((result) => (
                <div
                  key={`${result.conversationId}-${result.id}`}
                  onClick={() => onResultClick(result.conversationId, result.id)}
                  className="group cursor-pointer border-b border-gray-100 dark:border-dark-border pb-6 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-sidebar/50 -mx-4 px-4 rounded-xl transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-dark-text-primary group-hover:text-[#060E9F] dark:group-hover:text-blue-400 transition-colors">
                      {result.title}
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-dark-text-muted whitespace-nowrap ml-4">
                      {result.date}
                    </span>
                  </div>
                  <p 
                    className="text-sm text-gray-500 dark:text-dark-text-secondary line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      // Simple highlighting
                      __html: result.snippet.replace(
                        new RegExp(query, 'gi'), 
                        (match) => `<span class="font-bold text-gray-900 dark:text-dark-text-primary">${match}</span>`
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
