import { formatDistanceToNow, format } from 'date-fns';
import type { Article } from './types';

export function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

export function sentimentEmoji(label: string): string {
  switch (label) {
    case 'positive': return '↑';
    case 'negative': return '↓';
    default: return '→';
  }
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function exportToCSV(articles: Article[], filename = 'syria-news-export.csv'): void {
  const headers = ['Title', 'Source', 'Category', 'Sentiment', 'Score', 'Published', 'URL', 'Keywords', 'Cities'];
  const rows = articles.map(a => [
    `"${a.title.replace(/"/g, '""')}"`,
    a.source,
    a.category,
    a.sentiment?.label || '',
    a.sentiment?.score?.toFixed(2) || '',
    a.publishedAt,
    a.url,
    `"${(a.keywords || []).join(', ')}"`,
    `"${(a.cities || []).map(c => c.name).join(', ')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
