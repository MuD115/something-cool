import { useCallback, useRef, useState, useMemo } from 'react';
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
import { AnalyticsSummary } from './components/widgets/AnalyticsSummary';
import { BookmarksPanel } from './components/widgets/BookmarksPanel';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { ToastContainer, useToasts } from './components/ui/Toast';
import { KeyboardHelp } from './components/ui/KeyboardHelp';
import { useNewsData } from './hooks/useNews';
import { useWebSocket } from './hooks/useWebSocket';
import { useBookmarks } from './hooks/useBookmarks';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportToCSV } from './lib/utils';
import { ALL_CATEGORIES } from './lib/constants';
import type { WSMessage } from './lib/types';

export default function App() {
  const {
    news, breaking, stats, topics, sentiment, mapData, wordCloud, figures, timeline,
    loading, filters, updateFilters, refresh,
  } = useNewsData();

  const { toasts, addToast, dismissToast } = useToasts();
  const { bookmarks, toggleBookmark, isBookmarked, removeBookmark, clearAll: clearBookmarks } = useBookmarks();
  const { theme, toggleTheme } = useTheme();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleWSMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'update') {
      refresh();
      if (msg.newArticles && msg.newArticles > 0) {
        addToast({
          type: 'breaking',
          title: 'Breaking News',
          message: `${msg.newArticles} new article${msg.newArticles > 1 ? 's' : ''} just arrived`,
          duration: 6000,
        });
      }
    }
  }, [refresh, addToast]);

  const { connected } = useWebSocket(handleWSMessage);

  const handleWordClick = (word: string) => {
    updateFilters({ search: word, page: 1 });
  };

  const handleExportAll = useCallback(() => {
    if (news?.articles?.length) {
      exportToCSV(news.articles);
      addToast({ type: 'success', title: 'Exported', message: `${news.articles.length} articles exported to CSV` });
    }
  }, [news, addToast]);

  const shortcutActions = useMemo(() => ({
    onRefresh: refresh,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onToggleTheme: toggleTheme,
    onToggleBookmarks: () => setShowBookmarks(prev => !prev),
    onExport: handleExportAll,
    onShowHelp: () => setShowShortcuts(prev => !prev),
    onCategoryFilter: (index: number) => {
      if (index < ALL_CATEGORIES.length) {
        updateFilters({ category: ALL_CATEGORIES[index], page: 1 });
      }
    },
    onClearFilters: () => updateFilters({ category: '', sentiment: '', search: '', sort: '', page: 1 }),
  }), [refresh, toggleTheme, handleExportAll, updateFilters]);

  useKeyboardShortcuts(shortcutActions);

  return (
    <div className="min-h-screen bg-bg bg-grid">
      <Navbar
        lastUpdate={stats?.lastUpdate || null}
        connected={connected}
        onRefresh={refresh}
        theme={theme}
        onToggleTheme={toggleTheme}
        bookmarkCount={bookmarks.length}
        onToggleBookmarks={() => setShowBookmarks(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
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
              activeSentiment={filters.sentiment as string}
              activeSort={filters.sort as string}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              searchInputRef={searchInputRef}
            />
          </div>

          {/* Right column: Widgets */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-5">
            <SyriaMap markers={mapData} />
            <SentimentGauge data={sentiment} />
            <TopicTrends data={topics} />
            <AnalyticsSummary
              sentiment={sentiment}
              topics={topics}
              totalArticles={stats?.totalArticles || 0}
            />
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
            Press <kbd className="px-1 py-0.5 bg-surface-hover border border-surface-border rounded text-[9px] font-mono">?</kbd> for keyboard shortcuts.
          </p>
        </footer>
      </main>

      {/* Overlays & floating UI */}
      <ScrollToTop />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <KeyboardHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <BookmarksPanel
        open={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        bookmarks={bookmarks}
        onRemove={removeBookmark}
        onClearAll={clearBookmarks}
        onArticleClick={() => {
          setShowBookmarks(false);
        }}
      />
    </div>
  );
}
