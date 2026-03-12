import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Minus, PieChart, Activity } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { SentimentData, TopicTrendDay } from '../../lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants';
import type { Category } from '../../lib/types';

interface AnalyticsSummaryProps {
  sentiment: SentimentData | null;
  topics: TopicTrendDay[];
  totalArticles: number;
}

export function AnalyticsSummary({ sentiment, topics, totalArticles }: AnalyticsSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!sentiment || topics.length === 0) return null;

  // Calculate category totals from topic trends
  const categoryTotals: Record<string, number> = {};
  const categories: Category[] = ['politics', 'humanitarian', 'military', 'economy', 'reconstruction', 'diplomacy'];

  for (const day of topics) {
    for (const cat of categories) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (day[cat] || 0);
    }
  }

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  const maxCategoryCount = sortedCategories[0]?.[1] || 1;

  // Sentiment trend direction
  const sentimentDirection = sentiment.average > 0.1
    ? { icon: TrendingUp, label: 'Positive', color: 'text-accent-green' }
    : sentiment.average < -0.1
      ? { icon: TrendingDown, label: 'Negative', color: 'text-accent-red' }
      : { icon: Minus, label: 'Neutral', color: 'text-text-secondary' };

  const SentimentIcon = sentimentDirection.icon;

  // Daily article counts
  const dailyCounts = topics.map(day => {
    let total = 0;
    for (const cat of categories) total += day[cat] || 0;
    return { date: day.date, total };
  });

  const maxDaily = Math.max(...dailyCounts.map(d => d.total), 1);

  return (
    <GlassCard delay={0.5}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-accent-gold" />
          <h3 className="text-base font-semibold text-text-primary">Analytics Overview</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-accent-gold hover:text-accent-gold/80 transition-colors"
        >
          {showDetails ? 'Less' : 'More'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface-hover/50 rounded-xl p-3 text-center">
          <Activity size={14} className="mx-auto mb-1 text-accent-gold" />
          <p className="text-lg font-bold text-text-primary">{totalArticles}</p>
          <p className="text-[10px] text-text-secondary">Total Articles</p>
        </div>
        <div className="bg-surface-hover/50 rounded-xl p-3 text-center">
          <PieChart size={14} className="mx-auto mb-1 text-blue-400" />
          <p className="text-lg font-bold text-text-primary">{sentiment.totalAnalyzed}</p>
          <p className="text-[10px] text-text-secondary">Analyzed</p>
        </div>
        <div className="bg-surface-hover/50 rounded-xl p-3 text-center">
          <SentimentIcon size={14} className={`mx-auto mb-1 ${sentimentDirection.color}`} />
          <p className="text-lg font-bold text-text-primary">{(sentiment.average * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-text-secondary">{sentimentDirection.label} Bias</p>
        </div>
      </div>

      {/* Category distribution bars */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-text-secondary">Topic Distribution</h4>
        {sortedCategories.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary w-24 truncate">
              {CATEGORY_LABELS[cat as Category] || cat}
            </span>
            <div className="flex-1 bg-surface-hover rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCategoryCount) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }}
              />
            </div>
            <span className="text-[10px] text-text-secondary w-6 text-right font-mono">{count}</span>
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-surface-border space-y-3"
        >
          {/* Daily activity mini chart */}
          <h4 className="text-xs font-medium text-text-secondary">7-Day Activity</h4>
          <div className="flex items-end gap-1 h-16">
            {dailyCounts.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.total / maxDaily) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="w-full bg-accent-gold/30 hover:bg-accent-gold/50 rounded-t transition-colors"
                  title={`${day.date}: ${day.total} articles`}
                />
                <span className="text-[8px] text-text-secondary font-mono">
                  {day.date.slice(-2)}
                </span>
              </div>
            ))}
          </div>

          {/* Sentiment breakdown */}
          <h4 className="text-xs font-medium text-text-secondary">Sentiment Breakdown</h4>
          <div className="flex gap-2">
            {(['positive', 'neutral', 'negative'] as const).map(label => {
              const count = sentiment.distribution[label];
              const pct = sentiment.totalAnalyzed ? ((count / sentiment.totalAnalyzed) * 100).toFixed(1) : '0';
              const colors = { positive: 'bg-accent-green', neutral: 'bg-gray-500', negative: 'bg-accent-red' };
              return (
                <div key={label} className="flex-1 bg-surface-hover/50 rounded-lg p-2 text-center">
                  <div className={`w-2 h-2 rounded-full ${colors[label]} mx-auto mb-1`} />
                  <p className="text-xs font-bold text-text-primary">{pct}%</p>
                  <p className="text-[9px] text-text-secondary capitalize">{label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}
