import { motion } from 'framer-motion';
import type { SentimentData } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';

interface SentimentGaugeProps {
  data: SentimentData | null;
}

export function SentimentGauge({ data }: SentimentGaugeProps) {
  if (!data) return null;

  // average is -1 to 1, map to 0 to 180 degrees
  const angle = ((data.average + 1) / 2) * 180;
  const total = data.distribution.positive + data.distribution.neutral + data.distribution.negative;

  // Color based on value
  const getColor = (avg: number) => {
    if (avg > 0.2) return '#10b981';
    if (avg < -0.2) return '#ef4444';
    return '#eab308';
  };

  const color = getColor(data.average);

  return (
    <GlassCard delay={0.2}>
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        Sentiment Analysis
      </h3>

      <div className="flex justify-center">
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Background arc */}
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="#2a2a3e"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Gradient arc */}
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeOpacity="0.3"
          />

          {/* Needle */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: angle - 90 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            style={{ transformOrigin: '100px 110px' }}
          >
            <line x1="100" y1="110" x2="100" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="110" r="6" fill={color} />
            <circle cx="100" cy="110" r="3" fill="#0a0a0f" />
          </motion.g>

          {/* Labels */}
          <text x="15" y="118" fill="#ef4444" fontSize="9" fontWeight="600">NEG</text>
          <text x="90" y="28" fill="#eab308" fontSize="9" fontWeight="600">NEU</text>
          <text x="168" y="118" fill="#10b981" fontSize="9" fontWeight="600">POS</text>
        </svg>
      </div>

      {/* Stats below */}
      <div className="flex justify-between mt-2 px-2">
        <div className="text-center">
          <div className="text-lg font-bold text-red-400">{data.distribution.negative}</div>
          <div className="text-[10px] text-text-secondary">Negative</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-400">{data.distribution.neutral}</div>
          <div className="text-[10px] text-text-secondary">Neutral</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">{data.distribution.positive}</div>
          <div className="text-[10px] text-text-secondary">Positive</div>
        </div>
      </div>

      <p className="text-[10px] text-text-secondary text-center mt-3">
        Based on {total} articles analyzed
      </p>
    </GlassCard>
  );
}
