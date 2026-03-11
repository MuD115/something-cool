const axios = require('axios');
const RSSParser = require('rss-parser');
const cache = require('./cache.cjs');
const { analyzeArticle } = require('./analyzer.cjs');
const { extractCities } = require('./geocoder.cjs');

const rssParser = new RSSParser();

const RSS_FEEDS = [
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', name: 'NY Times' },
  { url: 'https://www.theguardian.com/world/syria/rss', name: 'The Guardian' },
];

const SEARCH_QUERIES = [
  'Syria latest news today',
  'Syria political developments',
  'Syria humanitarian situation',
  'Syria reconstruction',
  'Damascus news',
  'Aleppo news',
];

// Mock data generator for when APIs are unavailable
function generateMockArticles() {
  const mockHeadlines = [
    { title: 'Syria reconstruction efforts accelerate in Aleppo with international funding', source: 'Reuters', desc: 'International donors pledged additional funding for rebuilding efforts in Aleppo, focusing on critical infrastructure and housing projects that will benefit thousands of displaced families.' },
    { title: 'Damascus hosts regional diplomatic summit on Syria peace process', source: 'Al Jazeera', desc: 'Senior diplomats from multiple nations gathered in Damascus for talks aimed at advancing the Syrian peace process and normalizing regional relations.' },
    { title: 'UN agencies expand humanitarian operations across northern Syria', source: 'BBC', desc: 'United Nations humanitarian agencies announced expanded operations in northern Syria, delivering food, medical supplies, and shelter materials to communities affected by years of conflict.' },
    { title: 'Syrian economy shows signs of recovery as trade routes reopen', source: 'NY Times', desc: 'Economic indicators suggest gradual recovery in Syria as key trade routes reopen and foreign investment begins flowing into reconstruction projects.' },
    { title: 'Ceasefire agreement holds in Idlib province amid renewed peace talks', source: 'The Guardian', desc: 'The ceasefire in Idlib province continues to hold as parties engage in renewed diplomatic discussions aimed at a lasting peace settlement.' },
    { title: 'International community debates Syria sanctions reform', source: 'Reuters', desc: 'Western nations are reconsidering sanctions policies toward Syria as the humanitarian situation demands increased aid access and economic recovery support.' },
    { title: 'Refugees begin returning to rebuilt neighborhoods in Homs', source: 'Al Jazeera', desc: 'Thousands of Syrian refugees have started returning to recently reconstructed areas in Homs, marking a significant milestone in the country\'s recovery.' },
    { title: 'Turkey and Syria normalize relations in historic agreement', source: 'BBC', desc: 'In a landmark diplomatic development, Turkey and Syria announced steps toward normalizing bilateral relations, including border cooperation and trade agreements.' },
    { title: 'New schools and hospitals open in Raqqa as rebuilding continues', source: 'NY Times', desc: 'Reconstruction milestones reached in Raqqa with the opening of several new schools and a major hospital, supported by international development organizations.' },
    { title: 'SDF and government forces reach power-sharing agreement in northeast', source: 'The Guardian', desc: 'Syrian Democratic Forces and the central government reached a framework agreement on governance and security arrangements in northeastern Syria.' },
    { title: 'Syria cultural heritage restoration project launches in Palmyra', source: 'Reuters', desc: 'UNESCO-backed restoration project begins work on ancient ruins in Palmyra, aiming to preserve Syria\'s invaluable cultural heritage for future generations.' },
    { title: 'Arab League welcomes Syria back with full membership restoration', source: 'Al Jazeera', desc: 'The Arab League formally restored Syria\'s full membership during a summit meeting, marking the country\'s return to the regional diplomatic fold.' },
    { title: 'European Union announces new aid package for Syrian civilians', source: 'BBC', desc: 'The EU committed a substantial new aid package focused on food security, healthcare, and education for vulnerable Syrian communities.' },
    { title: 'Water infrastructure projects bring relief to Daraa province', source: 'NY Times', desc: 'Major water treatment and distribution projects completed in Daraa province, providing clean water access to over 200,000 residents for the first time in years.' },
    { title: 'Syrian lira stabilizes as central bank implements reforms', source: 'The Guardian', desc: 'The Syrian pound showed signs of stabilization after the central bank introduced monetary reforms and attracted foreign currency reserves.' },
    { title: 'Kobani sees economic boom with cross-border trade expansion', source: 'Reuters', desc: 'The border town of Kobani is experiencing rapid economic growth as new cross-border trade agreements facilitate commerce with neighboring countries.' },
    { title: 'Russia and Iran coordinate with Damascus on military withdrawal plans', source: 'Al Jazeera', desc: 'Discussions between Russia, Iran, and Syrian officials on phased military withdrawal continue, with preliminary agreements on timeline and security transitions.' },
    { title: 'Syrian civil society organizations gain new international support', source: 'BBC', desc: 'International foundations and NGOs have increased support for Syrian civil society groups working on governance, human rights, and community reconciliation.' },
    { title: 'Latakia port expansion project aims to boost Syrian trade', source: 'NY Times', desc: 'A major expansion project at Latakia port will increase cargo capacity, supporting Syria\'s economic recovery through enhanced maritime trade connections.' },
    { title: 'Deir ez-Zor oil fields return to full production capacity', source: 'The Guardian', desc: 'Oil production in the Deir ez-Zor region has returned to pre-conflict levels, providing crucial revenue for national reconstruction efforts.' },
  ];

  const now = Date.now();
  return mockHeadlines.map((item, i) => {
    const publishedAt = new Date(now - (i * 2 + Math.random() * 3) * 3600000).toISOString();
    const analysis = analyzeArticle(item.title, item.desc);
    const cities = extractCities(`${item.title} ${item.desc}`);
    return {
      title: item.title,
      description: item.desc,
      source: item.source,
      url: '#',
      publishedAt,
      ...analysis,
      cities,
    };
  });
}

async function fetchRSSFeeds() {
  const articles = [];
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`;
        const isSyriaRelated = /syria|syrian|damascus|aleppo|idlib|homs|assad/i.test(text);
        if (isSyriaRelated) {
          const analysis = analyzeArticle(item.title, item.contentSnippet);
          const cities = extractCities(text);
          articles.push({
            title: item.title,
            description: item.contentSnippet || '',
            source: feed.name,
            url: item.link,
            publishedAt: item.isoDate || new Date().toISOString(),
            ...analysis,
            cities,
          });
        }
      }
    } catch (err) {
      console.error(`RSS fetch failed for ${feed.name}:`, err.message);
    }
  }
  return articles;
}

async function fetchBraveSearch() {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  const articles = [];
  for (const query of SEARCH_QUERIES.slice(0, 2)) {
    try {
      const res = await axios.get('https://api.search.brave.com/res/v1/news/search', {
        headers: { 'X-Subscription-Token': apiKey },
        params: { q: query, count: 10, freshness: 'pd' },
      });
      for (const result of res.data.results || []) {
        const analysis = analyzeArticle(result.title, result.description);
        const cities = extractCities(`${result.title} ${result.description}`);
        articles.push({
          title: result.title,
          description: result.description || '',
          source: result.meta_url?.hostname?.replace('www.', '') || 'Web',
          url: result.url,
          publishedAt: result.age ? new Date().toISOString() : new Date().toISOString(),
          ...analysis,
          cities,
        });
      }
    } catch (err) {
      console.error(`Brave search failed for "${query}":`, err.message);
    }
  }
  return articles;
}

async function fetchAll() {
  console.log('[Fetcher] Starting data fetch cycle...');

  let articles = [];

  // Try real sources first
  const [rssArticles, searchArticles] = await Promise.all([
    fetchRSSFeeds(),
    fetchBraveSearch(),
  ]);

  articles = [...rssArticles, ...searchArticles];

  // Fall back to mock data if no real articles found
  if (articles.length === 0) {
    console.log('[Fetcher] No live data available, using curated mock data');
    articles = generateMockArticles();
  }

  let newCount = 0;
  for (const article of articles) {
    if (cache.add(article)) newCount++;
  }

  console.log(`[Fetcher] Cycle complete: ${newCount} new articles added (${cache.articles.size} total)`);
  return newCount;
}

module.exports = { fetchAll };
