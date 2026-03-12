class ArticleCache {
  constructor(maxAge = 24 * 60 * 60 * 1000) {
    this.articles = new Map();
    this.maxAge = maxAge;
    this.topicHistory = [];
    this.lastUpdate = null;
  }

  add(article) {
    const key = this._hashTitle(article.title);
    if (this.articles.has(key)) return false;
    article.id = key;
    article.fetchedAt = Date.now();
    this.articles.set(key, article);
    this.lastUpdate = new Date().toISOString();
    return true;
  }

  getAll(filters = {}) {
    this._evictStale();
    let results = [...this.articles.values()];

    // Apply filters
    if (filters.category) {
      results = results.filter(a => a.category === filters.category);
    }
    if (filters.sentiment) {
      results = results.filter(a => a.sentiment?.label === filters.sentiment);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(a => a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    }
    if (filters.source) {
      results = results.filter(a => a.source === filters.source);
    }

    // Apply sort
    const sort = filters.sort || '';
    switch (sort) {
      case 'oldest':
        results.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        break;
      case 'sentiment_high':
        results.sort((a, b) => (b.sentiment?.score || 0) - (a.sentiment?.score || 0));
        break;
      case 'sentiment_low':
        results.sort((a, b) => (a.sentiment?.score || 0) - (b.sentiment?.score || 0));
        break;
      case 'source':
        results.sort((a, b) => a.source.localeCompare(b.source));
        break;
      default:
        results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;

    return {
      articles: results.slice(start, start + limit),
      total: results.length,
      page,
      totalPages: Math.ceil(results.length / limit),
    };
  }

  getBreaking() {
    this._evictStale();
    return [...this.articles.values()]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 5);
  }

  getStats() {
    const all = [...this.articles.values()];
    const sentiments = all.map(a => a.sentiment?.score || 0);
    const avgSentiment = sentiments.length ? sentiments.reduce((s, v) => s + v, 0) / sentiments.length : 0;

    const categoryCounts = {};
    const cityCounts = {};
    const sources = new Set();

    for (const a of all) {
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      sources.add(a.source);
      for (const c of (a.cities || [])) {
        cityCounts[c.name] = (cityCounts[c.name] || 0) + 1;
      }
    }

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalArticles: all.length,
      sourcesTracked: sources.size,
      topTopic: topCategory ? topCategory[0] : 'N/A',
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      topCity: topCity ? topCity[0] : 'N/A',
      lastUpdate: this.lastUpdate,
    };
  }

  getTopicTrends() {
    const all = [...this.articles.values()];
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: key, politics: 0, humanitarian: 0, military: 0, economy: 0, reconstruction: 0, diplomacy: 0 };
    }
    for (const a of all) {
      const day = new Date(a.publishedAt).toISOString().split('T')[0];
      if (days[day] && a.category) {
        days[day][a.category] = (days[day][a.category] || 0) + 1;
      }
    }
    return Object.values(days);
  }

  getSentimentData() {
    const all = [...this.articles.values()];
    const counts = { positive: 0, neutral: 0, negative: 0 };
    let total = 0;
    for (const a of all) {
      if (a.sentiment?.label) {
        counts[a.sentiment.label]++;
        total += a.sentiment.score;
      }
    }
    return {
      distribution: counts,
      average: all.length ? total / all.length : 0,
      totalAnalyzed: all.length,
    };
  }

  getMapData() {
    const all = [...this.articles.values()];
    const cityMap = {};
    for (const a of all) {
      for (const c of (a.cities || [])) {
        if (!cityMap[c.name]) {
          cityMap[c.name] = { ...c, count: 0, headlines: [] };
        }
        cityMap[c.name].count++;
        if (cityMap[c.name].headlines.length < 5) {
          cityMap[c.name].headlines.push(a.title);
        }
      }
    }
    return Object.values(cityMap);
  }

  getWordCloud() {
    const all = [...this.articles.values()];
    const freq = {};
    const stopwords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'with', 'from', 'by', 'as', 'or', 'but', 'not', 'this', 'that', 'it', 'its', 'syria', 'syrian', 'says', 'new', 'after', 'over', 'amid', 'will', 'could', 'also', 'more', 'than', 'about', 'into', 'their', 'they', 'his', 'her', 'who', 'what', 'how', 'when', 'where', 'which', 'all', 'been']);
    for (const a of all) {
      const words = a.title.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
      for (const w of words) {
        if (w.length > 2 && !stopwords.has(w)) {
          freq[w] = (freq[w] || 0) + 1;
        }
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([text, value]) => ({ text, value }));
  }

  getFigures() {
    const all = [...this.articles.values()];
    const people = {};
    for (const a of all) {
      for (const p of (a.people || [])) {
        const name = p.trim();
        if (name.length > 2) {
          people[name] = (people[name] || 0) + 1;
        }
      }
    }
    return Object.entries(people)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  getTimeline() {
    return [...this.articles.values()]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 15)
      .map(a => ({
        id: a.id,
        date: a.publishedAt,
        title: a.title,
        category: a.category,
        source: a.source,
        sentiment: a.sentiment?.label,
      }));
  }

  getAnalytics() {
    const all = [...this.articles.values()];
    const stats = this.getStats();
    const sentimentData = this.getSentimentData();
    const topicTrends = this.getTopicTrends();

    // Source breakdown
    const sourceCounts = {};
    for (const a of all) {
      sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
    }

    // Category breakdown
    const categoryCounts = {};
    for (const a of all) {
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
    }

    // Hourly distribution (last 24h)
    const hourly = {};
    for (let i = 0; i < 24; i++) hourly[i] = 0;
    for (const a of all) {
      const hour = new Date(a.publishedAt).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    }

    // Most active cities
    const cityCounts = {};
    for (const a of all) {
      for (const c of (a.cities || [])) {
        cityCounts[c.name] = (cityCounts[c.name] || 0) + 1;
      }
    }
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      ...stats,
      sentimentData,
      topicTrends,
      sourceCounts,
      categoryCounts,
      hourlyDistribution: hourly,
      topCities,
    };
  }

  _hashTitle(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      const chr = title.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'a' + Math.abs(hash).toString(36);
  }

  _evictStale() {
    const now = Date.now();
    for (const [key, article] of this.articles) {
      if (now - article.fetchedAt > this.maxAge) {
        this.articles.delete(key);
      }
    }
  }
}

module.exports = new ArticleCache();
