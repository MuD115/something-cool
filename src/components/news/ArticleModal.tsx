import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Clock, MapPin, Tag, User, BarChart3, Bookmark, BookmarkCheck } from 'lucide-react';
import type { Article } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { CATEGORY_COLORS, CATEGORY_LABELS, SENTIMENT_COLORS } from '../../lib/constants';
import { relativeTime, formatDate, readingTime } from '../../lib/utils';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (article: Article) => void;
}

export function ArticleModal({ article, onClose, isBookmarked, onToggleBookmark }: ArticleModalProps) {
  if (!article) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border border-surface-border rounded-2xl shadow-2xl"
        >
          {/* Header bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface/95 backdrop-blur-sm border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-sm font-bold">
                {article.source.charAt(0)}
              </div>
              <div>
                <span className="text-sm font-medium text-text-primary">{article.source}</span>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock size={10} />
                  <span className="font-mono">{formatDate(article.publishedAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onToggleBookmark && (
                <button
                  onClick={() => onToggleBookmark(article)}
                  className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  {isBookmarked ? (
                    <BookmarkCheck size={18} className="text-accent-gold" />
                  ) : (
                    <Bookmark size={18} className="text-text-secondary" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Title */}
            <h2 className="text-xl font-bold text-text-primary leading-snug">
              {article.title}
            </h2>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              <Badge
                label={CATEGORY_LABELS[article.category] || article.category}
                color={CATEGORY_COLORS[article.category]}
              />
              <Badge
                label={article.sentiment?.label || 'neutral'}
                color={SENTIMENT_COLORS[article.sentiment?.label || 'neutral']}
                variant="outline"
              />
              <span className="text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock size={10} />
                {readingTime(article.description || article.title)} min read
              </span>
              {article.sentiment?.score !== undefined && (
                <span className="text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-full flex items-center gap-1">
                  <BarChart3 size={10} />
                  Score: {(article.sentiment.score * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Description */}
            {article.description && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {article.description}
              </p>
            )}

            {/* Keywords */}
            {article.keywords?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <Tag size={12} />
                  Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {article.keywords.map(kw => (
                    <span
                      key={kw}
                      className="text-xs bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* People mentioned */}
            {article.people?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <User size={12} />
                  People Mentioned
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {article.people.map(p => (
                    <span
                      key={p}
                      className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cities */}
            {article.cities?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <MapPin size={12} />
                  Locations
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {article.cities.map(c => (
                    <span
                      key={c.name}
                      className="text-xs bg-accent-green/10 text-accent-green px-2 py-0.5 rounded-full"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp detail */}
            <div className="text-xs text-text-secondary/70 font-mono">
              Published {relativeTime(article.publishedAt)} &middot; {formatDate(article.publishedAt)}
            </div>
          </div>

          {/* Footer action */}
          <div className="sticky bottom-0 p-4 bg-surface/95 backdrop-blur-sm border-t border-surface-border">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold font-medium text-sm rounded-xl transition-colors"
            >
              Read full article <ExternalLink size={14} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
