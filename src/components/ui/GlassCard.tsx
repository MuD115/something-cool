import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function GlassCard({ children, className, hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.01, borderColor: 'rgba(255,255,255,0.1)' } : undefined}
      className={clsx(
        'bg-surface/70 backdrop-blur-xl border border-surface-border rounded-2xl p-5',
        'shadow-lg shadow-black/20 transition-colors duration-300',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
