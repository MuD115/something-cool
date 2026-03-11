import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  lastUpdate: string | null;
  connected: boolean;
  onRefresh: () => void;
}

export function Navbar({ lastUpdate, connected, onRefresh }: NavbarProps) {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Syria Live Dashboard';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50">
      {/* Syrian flag gradient accent */}
      <div className="h-1 bg-gradient-to-r from-accent-red via-white to-accent-green" />

      <div className="bg-bg/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="text-accent-gold"
            >
              <Globe size={28} />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">
                {typedText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-accent-gold"
                >
                  |
                </motion.span>
              </h1>
              <p className="text-xs text-text-secondary -mt-0.5">Real-time news intelligence</p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              {connected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green" />
                  </span>
                  <span className="text-accent-green font-medium">LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-text-secondary" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Last update */}
            {lastUpdate && (
              <span className="hidden md:block text-xs text-text-secondary font-mono">
                Updated {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}

            {/* Refresh button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={onRefresh}
              className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} className="text-text-secondary" />
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  );
}
