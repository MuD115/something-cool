export interface Article {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: Category;
  sentiment: { score: number; label: SentimentLabel };
  keywords: string[];
  people: string[];
  cities: CityMention[];
}

export type Category = 'politics' | 'humanitarian' | 'military' | 'economy' | 'reconstruction' | 'diplomacy';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface CityMention {
  name: string;
  lat: number;
  lng: number;
}

export interface MapMarker extends CityMention {
  count: number;
  headlines: string[];
}

export interface Stats {
  totalArticles: number;
  sourcesTracked: number;
  topTopic: string;
  avgSentiment: number;
  topCity: string;
  lastUpdate: string | null;
}

export interface TopicTrendDay {
  date: string;
  politics: number;
  humanitarian: number;
  military: number;
  economy: number;
  reconstruction: number;
  diplomacy: number;
}

export interface SentimentData {
  distribution: { positive: number; neutral: number; negative: number };
  average: number;
  totalAnalyzed: number;
}

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface Figure {
  name: string;
  count: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: Category;
  source: string;
  sentiment: SentimentLabel;
}

export interface NewsResponse {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
}

export interface WSMessage {
  type: 'connected' | 'update';
  message?: string;
  newArticles?: number;
  stats?: Stats;
  breaking?: Article[];
}
