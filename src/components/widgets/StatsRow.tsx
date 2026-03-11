import { motion } from 'framer-motion';
import { Newspaper, Radio, TrendingUp, BarChart3, MapPin } from 'lucide-react';
import type { Stats } from '../../lib/types';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { capitalize, sentimentEmoji } from '../../lib/utils';

interface StatsRowProps {
  stats: Stats | null;
}

export function StatsRow({ stats }: StatsRowProps) {
  if (!stats) return null;

  const items = [
    {
      label: 'Articles Today',
      value: stats.totalArticles,
      icon: Newspaper,
      color: '#f0a500',
    },
    {
      label: 'Sources Tracked',
      value: stats.sourcesTracked,
      icon: Radio,
      color: '#3b82f6',
    },
    {
      label: 'Top Topic',
      text: capitalize(stats.topTopic),
      icon: TrendingUp,
      color: '#8b5cf6',
    },
    {
      label: 'Avg Sentiment',
      value: stats.avgSentiment,
      decimals: 2,
      prefix: stats.avgSentiment >= 0 ? '+' : '',
      icon: BarChart3,
      color: stats.avgSentiment > 0 ? '#10b981' : stats.avgSentiment < 0 ? '#ef4444' : '#eab308',
    },
    {
      label: 'Most Mentioned',
      text: stats.topCity,
      icon: MapPin,
      color: '#f43f5e',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.03, borderColor: item.color + '44' }}
          className="bg-surface/70 backdrop-blur-sm border border-surface-border rounded-2xl p-4 flex items-center gap-3
                     hover:shadow-lg hover:shadow-black/20 transition-all"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: item.color + '15' }}
          >
            <item.icon size={20} style={{ color: item.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-text-primary truncate">
              {item.text ? (
                item.text
              ) : (
                <AnimatedCounter
                  value={item.value!}
                  prefix={item.prefix}
                  decimals={item.decimals}
                />
              )}
            </div>
            <div className="text-[10px] text-text-secondary truncate">{item.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
