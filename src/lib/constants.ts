import type { Category } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  politics: '#8b5cf6',
  humanitarian: '#f43f5e',
  military: '#f97316',
  economy: '#10b981',
  reconstruction: '#3b82f6',
  diplomacy: '#eab308',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: 'Politics',
  humanitarian: 'Humanitarian',
  military: 'Military',
  economy: 'Economy',
  reconstruction: 'Reconstruction',
  diplomacy: 'Diplomacy',
};

export const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#6b7280',
  negative: '#ef4444',
};

export const CHART_COLORS = [
  '#8b5cf6', '#f43f5e', '#f97316', '#10b981', '#3b82f6', '#eab308',
];

export const ALL_CATEGORIES: Category[] = [
  'politics', 'humanitarian', 'military', 'economy', 'reconstruction', 'diplomacy',
];
