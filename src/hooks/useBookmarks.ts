import { useState, useCallback, useEffect } from 'react';
import type { Article } from '../lib/types';

const STORAGE_KEY = 'syria-dashboard-bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Article[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {}
  }, [bookmarks]);

  const toggleBookmark = useCallback((article: Article) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.id === article.id);
      if (exists) {
        return prev.filter(b => b.id !== article.id);
      }
      return [article, ...prev];
    });
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return bookmarks.some(b => b.id === id);
  }, [bookmarks]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setBookmarks([]);
  }, []);

  return { bookmarks, toggleBookmark, isBookmarked, removeBookmark, clearAll };
}
