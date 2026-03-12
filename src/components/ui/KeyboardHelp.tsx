import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['R'], description: 'Refresh data' },
  { keys: ['S'], description: 'Focus search' },
  { keys: ['T'], description: 'Toggle theme' },
  { keys: ['B'], description: 'Toggle bookmarks panel' },
  { keys: ['E'], description: 'Export articles as CSV' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['1-6'], description: 'Filter by category' },
  { keys: ['0'], description: 'Clear all filters' },
];

export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <div className="flex items-center gap-2 text-text-primary">
                <Keyboard size={18} className="text-accent-gold" />
                <h3 className="text-base font-semibold">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {SHORTCUTS.map(({ keys, description }) => (
                <div key={description} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-surface-hover/50">
                  <span className="text-sm text-text-secondary">{description}</span>
                  <div className="flex gap-1">
                    {keys.map(key => (
                      <kbd
                        key={key}
                        className="px-2 py-0.5 bg-surface-hover border border-surface-border rounded-md text-xs font-mono text-text-primary"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-surface-border">
              <p className="text-xs text-text-secondary text-center">
                Press <kbd className="px-1.5 py-0.5 bg-surface-hover border border-surface-border rounded text-[10px] font-mono">?</kbd> anywhere to toggle this panel
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
