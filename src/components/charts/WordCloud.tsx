import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { WordCloudItem } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';

interface WordCloudProps {
  data: WordCloudItem[];
  onWordClick?: (word: string) => void;
}

const WORD_COLORS = ['#ce1126', '#007a3d', '#f0a500', '#8b5cf6', '#3b82f6', '#f43f5e', '#10b981', '#eab308'];

export function WordCloud({ data, onWordClick }: WordCloudProps) {
  const words = useMemo(() => {
    if (!data.length) return [];
    const maxVal = Math.max(...data.map(d => d.value));
    return data.slice(0, 35).map((item, i) => ({
      ...item,
      fontSize: 12 + (item.value / maxVal) * 28,
      color: WORD_COLORS[i % WORD_COLORS.length],
    }));
  }, [data]);

  if (!words.length) return null;

  return (
    <GlassCard delay={0.4}>
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-accent-red" />
        Trending Words
      </h3>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 min-h-[180px] py-2">
        {words.map((word, i) => (
          <motion.button
            key={word.text}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            whileHover={{ scale: 1.2, zIndex: 10 }}
            onClick={() => onWordClick?.(word.text)}
            className="cursor-pointer transition-all hover:drop-shadow-lg"
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              fontWeight: word.fontSize > 25 ? 700 : 500,
              opacity: 0.6 + (word.value / Math.max(...data.map(d => d.value))) * 0.4,
            }}
          >
            {word.text}
          </motion.button>
        ))}
      </div>
    </GlassCard>
  );
}
