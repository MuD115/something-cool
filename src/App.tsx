import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { NewsTicker } from './components/news/NewsTicker';
import { NewsFeed } from './components/news/NewsFeed';
import { SyriaMap } from './components/map/SyriaMap';
import { SentimentGauge } from './components/charts/SentimentGauge';
import { TopicTrends } from './components/charts/TopicTrends';
import { WordCloud } from './components/charts/WordCloud';
import { StatsRow } from './components/widgets/StatsRow';
import { KeyFigures } from './components/widgets/KeyFigures';
import { Timeline } from './components/widgets/Timeline';
import { SourcesPanel } from './components/widgets/SourcesPanel';
import { useNewsData } from './hooks/useNews';
import { useWebSocket } from './hooks/useWebSocket';
import type { WSMessage } from './lib/types';

export default function App() {
  const {
    news, breaking, stats, topics, sentiment, mapData, wordCloud, figures, timeline,
    loading, filters, updateFilters, refresh,
  } = useNewsData();

  const handleWSMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'update') {
      refresh();
    }
  }, [refresh]);

  const { connected } = useWebSocket(handleWSMessage);

  const handleWordClick = (word: string) => {
    updateFilters({ search: word, page: 1 });
  };

  return (
    <div className="min-h-screen bg-bg bg-grid">
      <Navbar
        lastUpdate={stats?.lastUpdate || null}
        connected={connected}
        onRefresh={refresh}
      />

      <NewsTicker articles={breaking} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Row */}
        <StatsRow stats={stats} />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: News Feed */}
          <div className="lg:col-span-7 xl:col-span-7">
            <NewsFeed
              data={news}
              loading={loading}
              onFilterChange={updateFilters}
              activeCategory={filters.category as string}
            />
          </div>

          {/* Right column: Widgets */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-5">
            <SyriaMap markers={mapData} />
            <SentimentGauge data={sentiment} />
            <TopicTrends data={topics} />
            <WordCloud data={wordCloud} onWordClick={handleWordClick} />
            <KeyFigures figures={figures} />
          </div>
        </div>

        {/* Timeline section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Timeline events={timeline} />
        </motion.div>

        {/* Sources footer */}
        <div className="border-t border-surface-border pt-2">
          <SourcesPanel articles={news?.articles || []} />
        </div>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-surface-border">
          <p className="text-xs text-text-secondary">
            Syria Live Dashboard — Real-time news intelligence aggregated from multiple sources
          </p>
          <p className="text-[10px] text-text-secondary/50 mt-1">
            Data is for informational purposes only. Sources are attributed above.
          </p>
        </footer>
      </main>
    </div>
  );
}
