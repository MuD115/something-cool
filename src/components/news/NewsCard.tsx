import { motion } from 'framer-motion';
import { ExternalLink, Clock, Share2 } from 'lucide-react';
import type { Article } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { CATEGORY_COLORS, CATEGORY_LABELS, SENTIMENT_COLORS } from '../../lib/constants';
import { relativeTime, truncate } from '../../lib/utils';

interface NewsCardProps {
  article: Article;
  index: number;
}

export function NewsCard({ article, index }: NewsCardProps) {
  const handleShare = () => {
    navigator.clipboard.writeText(article.url !== '#' ? article.url : article.title);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="group bg-surface/70 backdrop-blur-sm border border-surface-border rounded-2xl p-5
                 hover:border-surface-hover hover:shadow-xl hover:shadow-black/20 transition-all duration-300"
    >
      {/* Header: source + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-xs font-bold">
            {article.source.charAt(0)}
          </div>
          <span className="text-sm font-medium text-text-secondary">{article.source}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock size={12} />
          <span className="font-mono">{relativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-text-primary leading-snug mb-2 line-clamp-2 group-hover:text-accent-gold transition-colors">
        {article.title}
      </h3>

      {/* Description */}
      {article.description && (
        <p className="text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">
          {truncate(article.description, 180)}
        </p>
      )}

      {/* Tags row */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        <Badge
          label={CATEGORY_LABELS[article.category] || article.category}
          color={CATEGORY_COLORS[article.category]}
        />
        <Badge
          label={article.sentiment?.label || 'neutral'}
          color={SENTIMENT_COLORS[article.sentiment?.label || 'neutral']}
          variant="outline"
        />
        {article.cities?.slice(0, 2).map(c => (
          <span key={c.name} className="text-xs text-text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
            📍 {c.name}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-gold hover:text-accent-gold/80 transition-colors"
        >
          Read more <ExternalLink size={12} />
        </a>
        <button
          onClick={handleShare}
          className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
          title="Copy link"
        >
          <Share2 size={14} />
        </button>
      </div>
    </motion.article>
  );
}
