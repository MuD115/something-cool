import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Article } from '../../lib/types';

interface SourcesPanelProps {
  articles: Article[];
}

export function SourcesPanel({ articles }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const sources = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    for (const a of articles) {
      if (!map[a.source]) map[a.source] = { name: a.source, count: 0 };
      map[a.source].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [articles]);

  if (!sources.length) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="font-semibold">Sources ({sources.length})</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pb-4"
        >
          {sources.map((src, i) => (
            <motion.div
              key={src.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-surface/50 border border-surface-border rounded-xl p-3 text-center hover:border-accent-gold/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-accent-gold">{src.name.charAt(0)}</span>
              </div>
              <p className="text-xs font-medium text-text-primary truncate">{src.name}</p>
              <p className="text-[10px] text-text-secondary mt-0.5 font-mono">{src.count} articles</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
