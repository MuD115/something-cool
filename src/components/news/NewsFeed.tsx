import type { Article, NewsResponse } from '../../lib/types';
import { NewsCard } from './NewsCard';
import { NewsFilters } from './NewsFilters';
import { NewsCardSkeleton } from '../ui/Skeleton';

interface NewsFeedProps {
  data: NewsResponse | null;
  loading: boolean;
  onFilterChange: (filters: Record<string, string | number>) => void;
  activeCategory?: string;
}

export function NewsFeed({ data, loading, onFilterChange, activeCategory }: NewsFeedProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Latest Updates</h2>
        {data && (
          <span className="text-xs text-text-secondary font-mono">
            {data.total} articles
          </span>
        )}
      </div>

      <NewsFilters onFilterChange={onFilterChange} activeCategory={activeCategory} />

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <NewsCardSkeleton key={i} />)
        ) : data?.articles?.length ? (
          data.articles.map((article, i) => (
            <NewsCard key={article.id} article={article} index={i} />
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
    </div>
  );
}
