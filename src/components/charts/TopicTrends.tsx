import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopicTrendDay } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants';
import type { Category } from '../../lib/types';

interface TopicTrendsProps {
  data: TopicTrendDay[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-mono text-text-secondary mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{CATEGORY_LABELS[entry.dataKey as Category]}:</span>
          <span className="text-text-primary font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function TopicTrends({ data }: TopicTrendsProps) {
  if (!data.length) return null;

  const categories: Category[] = ['politics', 'humanitarian', 'military', 'economy', 'reconstruction', 'diplomacy'];

  return (
    <GlassCard delay={0.3}>
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-accent-gold" />
        Topic Trends (7 Days)
      </h3>

      <div className="h-[220px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {categories.map(cat => (
                <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: '#8888a0', fontSize: 10 }}
              axisLine={{ stroke: '#2a2a3e' }}
              tickLine={false}
              tickFormatter={v => v.slice(5)}
            />
            <YAxis
              tick={{ fill: '#8888a0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            {categories.map(cat => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={CATEGORY_COLORS[cat]}
                fill={`url(#grad-${cat})`}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {categories.map(cat => (
          <div key={cat} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {CATEGORY_LABELS[cat]}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
