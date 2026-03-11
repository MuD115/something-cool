import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants';
import type { Category } from '../../lib/types';

interface NewsFiltersProps {
  onFilterChange: (filters: Record<string, string | number>) => void;
  activeCategory?: string;
}

export function NewsFilters({ onFilterChange, activeCategory }: NewsFiltersProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search, page: 1 });
  };

  const handleCategory = (cat: Category | '') => {
    onFilterChange({ category: cat, page: 1 });
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-surface-border rounded-xl text-sm text-text-primary
                       placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/20 transition-all"
          />
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

      {/* Category chips */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2"
        >
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
        </motion.div>
      )}
    </div>
  );
}
