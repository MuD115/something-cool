import { motion } from 'framer-motion';
import { User, TrendingUp } from 'lucide-react';
import type { Figure } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';

interface KeyFiguresProps {
  figures: Figure[];
}

const AVATAR_COLORS = ['#ce1126', '#007a3d', '#f0a500', '#8b5cf6', '#3b82f6', '#f43f5e', '#10b981', '#eab308'];

export function KeyFigures({ figures }: KeyFiguresProps) {
  if (!figures.length) return null;

  return (
    <GlassCard delay={0.5}>
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-accent-green" />
        Key Figures Mentioned
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {figures.map((fig, i) => (
          <motion.div
            key={fig.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 bg-surface-hover/50 border border-surface-border rounded-xl p-3 min-w-[120px] text-center"
          >
            <div
              className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] + '20' }}
            >
              <User size={18} style={{ color: AVATAR_COLORS[i % AVATAR_COLORS.length] }} />
            </div>
            <p className="text-xs font-semibold text-text-primary truncate">{fig.name}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendingUp size={10} className="text-accent-green" />
              <span className="text-xs font-mono text-accent-gold">{fig.count}</span>
              <span className="text-[10px] text-text-secondary">mentions</span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
