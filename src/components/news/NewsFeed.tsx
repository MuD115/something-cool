import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Article, NewsResponse } from '../../lib/types';
import { NewsCard } from './NewsCard';
import { NewsFilters } from './NewsFilters';
import { ArticleModal } from './ArticleModal';
import { NewsCardSkeleton } from '../ui/Skeleton';
import { exportToCSV } from '../../lib/utils';

interface NewsFeedProps {
  data: NewsResponse | null;
  loading: boolean;
  onFilterChange: (filters: Record<string, string | number>) => void;
  activeCategory?: string;
  activeSentiment?: string;
  activeSort?: string;
  isBookmarked?: (id: string) => boolean;
  onToggleBookmark?: (article: Article) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function NewsFeed({ data, loading, onFilterChange, activeCategory, activeSentiment, activeSort, isBookmarked, onToggleBookmark, searchInputRef }: NewsFeedProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const handleExport = () => {
    if (data?.articles?.length) {
      exportToCSV(data.articles);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Latest Updates</h2>
        <div className="flex items-center gap-3">
          {data && data.articles.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-gold transition-colors"
              title="Export to CSV"
            >
              <Download size={13} />
              Export
            </button>
          )}
          {data && (
            <span className="text-xs text-text-secondary font-mono">
              {data.total} articles
            </span>
          )}
        </div>
      </div>

      <NewsFilters
        onFilterChange={onFilterChange}
        activeCategory={activeCategory}
        activeSentiment={activeSentiment}
        activeSort={activeSort}
        searchInputRef={searchInputRef}
      />

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <NewsCardSkeleton key={i} />)
        ) : data?.articles?.length ? (
          data.articles.map((article, i) => (
            <NewsCard
              key={article.id}
              article={article}
              index={i}
              onClick={setSelectedArticle}
              isBookmarked={isBookmarked?.(article.id)}
              onToggleBookmark={onToggleBookmark}
            />
          ))
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-lg">No articles found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: Math.min(data.totalPages, 5) }).map((_, i) => (
            <button
              key={i}
              onClick={() => onFilterChange({ page: i + 1 })}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                data.page === i + 1
                  ? 'bg-accent-gold text-bg'
                  : 'bg-surface border border-surface-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Article detail modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          isBookmarked={isBookmarked?.(selectedArticle.id)}
          onToggleBookmark={onToggleBookmark}
        />
      )}
    </div>
  );
}
