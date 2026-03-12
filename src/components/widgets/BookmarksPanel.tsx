import { motion, AnimatePresence } from 'framer-motion';
import { X, BookmarkCheck, ExternalLink, Clock, Trash2 } from 'lucide-react';
import type { Article } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants';
import { relativeTime } from '../../lib/utils';

interface BookmarksPanelProps {
  open: boolean;
  onClose: () => void;
  bookmarks: Article[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onArticleClick: (article: Article) => void;
}

export function BookmarksPanel({ open, onClose, bookmarks, onRemove, onClearAll, onArticleClick }: BookmarksPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex justify-end"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md h-full bg-surface border-l border-surface-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <BookmarkCheck size={18} className="text-accent-gold" />
                <h3 className="text-base font-semibold text-text-primary">
                  Bookmarks ({bookmarks.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {bookmarks.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-xs text-accent-red hover:text-accent-red/80 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {bookmarks.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                  <BookmarkCheck size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No bookmarks yet</p>
                  <p className="text-xs mt-1 opacity-70">Click the bookmark icon on any article to save it</p>
                </div>
              ) : (
                <AnimatePresence>
                  {bookmarks.map((article) => (
                    <motion.div
                      key={article.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="group bg-surface-hover/50 border border-surface-border rounded-xl p-3 hover:border-accent-gold/30 transition-all cursor-pointer"
                      onClick={() => onArticleClick(article)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent-gold transition-colors">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              label={CATEGORY_LABELS[article.category]}
                              color={CATEGORY_COLORS[article.category]}
                            />
                            <span className="text-[10px] text-text-secondary font-mono flex items-center gap-1">
                              <Clock size={9} />
                              {relativeTime(article.publishedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-accent-gold"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemove(article.id); }}
                            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-accent-red"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
