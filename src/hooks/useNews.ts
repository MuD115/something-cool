import { useState, useEffect, useCallback } from 'react';
import { fetchNews, fetchBreaking, fetchStats, fetchTopics, fetchSentiment, fetchMapData, fetchWordCloud, fetchFigures, fetchTimeline } from '../lib/api';
import type { Article, NewsResponse, Stats, TopicTrendDay, SentimentData, MapMarker, WordCloudItem, Figure, TimelineEvent } from '../lib/types';

export function useNewsData() {
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<TopicTrendDay[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [mapData, setMapData] = useState<MapMarker[]>([]);
  const [wordCloud, setWordCloud] = useState<WordCloudItem[]>([]);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});

  const loadAll = useCallback(async () => {
    try {
      const [newsRes, breakingRes, statsRes, topicsRes, sentimentRes, mapRes, wcRes, figRes, tlRes] = await Promise.all([
        fetchNews(filters),
        fetchBreaking(),
        fetchStats(),
        fetchTopics(),
        fetchSentiment(),
        fetchMapData(),
        fetchWordCloud(),
        fetchFigures(),
        fetchTimeline(),
      ]);
      setNews(newsRes);
      setBreaking(breakingRes);
      setStats(statsRes);
      setTopics(topicsRes);
      setSentiment(sentimentRes);
      setMapData(mapRes);
      setWordCloud(wcRes);
      setFigures(figRes);
      setTimeline(tlRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateFilters = useCallback((newFilters: Record<string, string | number>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    news, breaking, stats, topics, sentiment, mapData, wordCloud, figures, timeline,
    loading, filters, updateFilters, refresh: loadAll,
  };
}
