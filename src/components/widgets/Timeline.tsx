import { motion } from 'framer-motion';
import { Circle, Shield, Heart, Landmark, Wrench, Handshake, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TimelineEvent, Category } from '../../lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS, SENTIMENT_COLORS } from '../../lib/constants';
import { relativeTime } from '../../lib/utils';

interface TimelineProps {
  events: TimelineEvent[];
}

const CATEGORY_ICONS: Record<Category, any> = {
  politics: Landmark,
  humanitarian: Heart,
  military: Shield,
  economy: Circle,
  reconstruction: Wrench,
  diplomacy: Handshake,
};

export function Timeline({ events }: TimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? events : events.slice(0, 6);

  if (!events.length) return null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Event Timeline</h2>
        <span className="text-xs text-text-secondary font-mono">{events.length} events</span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-gold via-accent-red to-accent-green" />

        <div className="space-y-1">
          {displayed.map((event, i) => {
            const Icon = CATEGORY_ICONS[event.category] || Circle;
            const color = CATEGORY_COLORS[event.category] || '#6b7280';

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative pl-14 py-3 group"
              >
                {/* Node */}
                <div
                  className="absolute left-3.5 top-4 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-bg z-10 group-hover:scale-125 transition-transform"
                  style={{ borderColor: color }}
                >
                  <Icon size={10} style={{ color }} />
                </div>

                {/* Content */}
                <div className="bg-surface/50 border border-surface-border rounded-xl p-3 hover:border-surface-hover transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      {CATEGORY_LABELS[event.category]}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: SENTIMENT_COLORS[event.sentiment] }}
                    />
                    <span className="text-[10px] text-text-secondary ml-auto font-mono">
                      {relativeTime(event.date)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-medium leading-snug">{event.title}</p>
                  <p className="text-[10px] text-text-secondary mt-1">{event.source}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {events.length > 6 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full py-2.5 bg-surface/70 border border-surface-border rounded-xl text-sm text-text-secondary
                     hover:text-text-primary hover:border-accent-gold/30 transition-all flex items-center justify-center gap-2"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Show less' : `Show ${events.length - 6} more events`}
        </motion.button>
      )}
    </div>
  );
}
