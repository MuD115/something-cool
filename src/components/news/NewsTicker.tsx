import { motion } from 'framer-motion';
import type { Article } from '../../lib/types';
import { SENTIMENT_COLORS } from '../../lib/constants';

interface NewsTickerProps {
  articles: Article[];
}

export function NewsTicker({ articles }: NewsTickerProps) {
  if (!articles.length) return null;

  const doubled = [...articles, ...articles];

  return (
    <div className="w-full bg-surface/50 backdrop-blur-sm border-b border-surface-border overflow-hidden">
      <div className="flex items-center">
        {/* Breaking label */}
        <div className="flex-shrink-0 bg-accent-red px-4 py-2.5 flex items-center gap-2 z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="text-white text-sm font-bold tracking-wide">BREAKING</span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1 relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-surface/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface/50 to-transparent z-10" />

          <motion.div
            className="flex items-center gap-8 whitespace-nowrap py-2.5 px-4"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            {doubled.map((article, i) => (
              <a
                key={`${article.id}-${i}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-text-primary hover:text-accent-gold transition-colors"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SENTIMENT_COLORS[article.sentiment?.label || 'neutral'] }}
                />
                <span className="font-medium">{article.title}</span>
                <span className="text-text-secondary text-xs">— {article.source}</span>
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
