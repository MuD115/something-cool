import axios from 'axios';
import type { NewsResponse, Article, Stats, TopicTrendDay, SentimentData, MapMarker, WordCloudItem, Figure, TimelineEvent } from './types';

const api = axios.create({ baseURL: '/api' });

export async function fetchNews(params: Record<string, string | number> = {}): Promise<NewsResponse> {
  const { data } = await api.get('/news', { params });
  return data;
}

export async function fetchBreaking(): Promise<Article[]> {
  const { data } = await api.get('/news/breaking');
  return data;
}

export async function fetchStats(): Promise<Stats> {
  const { data } = await api.get('/stats');
  return data;
}

export async function fetchTopics(): Promise<TopicTrendDay[]> {
  const { data } = await api.get('/topics');
  return data;
}

export async function fetchSentiment(): Promise<SentimentData> {
  const { data } = await api.get('/sentiment');
  return data;
}

export async function fetchMapData(): Promise<MapMarker[]> {
  const { data } = await api.get('/map');
  return data;
}

export async function fetchWordCloud(): Promise<WordCloudItem[]> {
  const { data } = await api.get('/wordcloud');
  return data;
}

export async function fetchFigures(): Promise<Figure[]> {
  const { data } = await api.get('/figures');
  return data;
}

export async function fetchTimeline(): Promise<TimelineEvent[]> {
  const { data } = await api.get('/timeline');
  return data;
}
