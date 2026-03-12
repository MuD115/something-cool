import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, SENTIMENT_COLORS } from '../../lib/constants';
import type { Category, SentimentLabel } from '../../lib/types';

interface NewsFiltersProps {
  onFilterChange: (filters: Record<string, string | number>) => void;
  activeCategory?: string;
  activeSentiment?: string;
  activeSort?: string;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const SORT_OPTIONS = [
  { value: '', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'sentiment_high', label: 'Most Positive' },
  { value: 'sentiment_low', label: 'Most Negative' },
  { value: 'source', label: 'By Source' },
];

const SENTIMENT_LABELS: { value: SentimentLabel; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

export function NewsFilters({ onFilterChange, activeCategory, activeSentiment, activeSort, searchInputRef }: NewsFiltersProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search, page: 1 });
  };

  const handleCategory = (cat: Category | '') => {
    onFilterChange({ category: cat, page: 1 });
  };

  const handleSentiment = (s: SentimentLabel | '') => {
    onFilterChange({ sentiment: s, page: 1 });
  };

  const handleSort = (sort: string) => {
    onFilterChange({ sort, page: 1 });
  };

  return (
    <div className="space-y-3">
      {/* Search bar + sort */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-surface-border rounded-xl text-sm text-text-primary
                       placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/20 transition-all"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={activeSort || ''}
            onChange={e => handleSort(e.target.value)}
            className="appearance-none h-full pl-9 pr-4 bg-surface border border-surface-border rounded-xl text-sm text-text-secondary
                       focus:outline-none focus:border-accent-gold/50 cursor-pointer hover:border-surface-hover transition-all"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="p-2.5 bg-surface border border-surface-border rounded-xl text-text-secondary hover:text-text-primary hover:border-accent-gold/30 transition-all"
        >
          <SlidersHorizontal size={16} />
        </motion.button>
      </form>

      {/* Category + Sentiment chips */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <Badge
              label="All"
              color={!activeCategory ? '#f0a500' : '#6b7280'}
              size="md"
              onClick={() => handleCategory('')}
              active={!activeCategory}
            />
            {ALL_CATEGORIES.map(cat => (
              <Badge
                key={cat}
                label={CATEGORY_LABELS[cat]}
                color={CATEGORY_COLORS[cat]}
                size="md"
                onClick={() => handleCategory(cat)}
                active={activeCategory === cat}
              />
            ))}
          </div>

          {/* Sentiment chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-text-secondary self-center mr-1">Sentiment:</span>
            <Badge
              label="All"
              color={!activeSentiment ? '#f0a500' : '#6b7280'}
              size="sm"
              onClick={() => handleSentiment('')}
              active={!activeSentiment}
            />
            {SENTIMENT_LABELS.map(s => (
              <Badge
                key={s.value}
                label={s.label}
                color={SENTIMENT_COLORS[s.value]}
                size="sm"
                onClick={() => handleSentiment(s.value)}
                active={activeSentiment === s.value}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
