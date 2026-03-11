const nlp = require('compromise');

const CATEGORIES = {
  politics: ['government', 'president', 'minister', 'election', 'parliament', 'political', 'diplomacy', 'diplomatic', 'sanctions', 'un ', 'united nations', 'ambassador', 'regime', 'opposition', 'constitution', 'assad', 'transition', 'negotiations'],
  humanitarian: ['refugee', 'humanitarian', 'aid', 'displacement', 'civilian', 'hunger', 'famine', 'cholera', 'hospital', 'medical', 'shelter', 'unhcr', 'red cross', 'food', 'water', 'children', 'women', 'crisis'],
  military: ['military', 'army', 'attack', 'strike', 'bomb', 'weapon', 'soldier', 'militia', 'fighting', 'offensive', 'ceasefire', 'troops', 'drone', 'airforce', 'artillery', 'sdf', 'hts', 'isis'],
  economy: ['economy', 'economic', 'trade', 'currency', 'oil', 'inflation', 'market', 'business', 'investment', 'reconstruction', 'infrastructure', 'poverty', 'unemployment', 'lira', 'gdp'],
  reconstruction: ['rebuild', 'reconstruction', 'recovery', 'restoration', 'development', 'construction', 'housing', 'school', 'electricity', 'road', 'bridge', 'project'],
  diplomacy: ['treaty', 'agreement', 'summit', 'talks', 'negotiation', 'peace', 'deal', 'normalization', 'turkey', 'iran', 'russia', 'saudi', 'arab league', 'eu ', 'nato'],
};

const POSITIVE_WORDS = ['peace', 'agreement', 'ceasefire', 'aid', 'reconstruction', 'rebuild', 'recovery', 'hope', 'progress', 'deal', 'support', 'growth', 'return', 'safe', 'open', 'free', 'release', 'rescue', 'improve'];
const NEGATIVE_WORDS = ['attack', 'bomb', 'kill', 'dead', 'death', 'destroy', 'crisis', 'flee', 'refugee', 'strike', 'fighting', 'war', 'conflict', 'violence', 'torture', 'arrest', 'siege', 'famine', 'collapse', 'threat'];

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) { if (lower.includes(w)) score += 1; }
  for (const w of NEGATIVE_WORDS) { if (lower.includes(w)) score -= 1; }
  const normalized = Math.max(-1, Math.min(1, score / 3));
  const label = normalized > 0.2 ? 'positive' : normalized < -0.2 ? 'negative' : 'neutral';
  return { score: normalized, label };
}

function categorize(text) {
  const lower = text.toLowerCase();
  let best = 'politics';
  let bestCount = 0;
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    let count = 0;
    for (const kw of keywords) { if (lower.includes(kw)) count++; }
    if (count > bestCount) { bestCount = count; best = cat; }
  }
  return best;
}

function extractKeywords(text) {
  const doc = nlp(text);
  const nouns = doc.nouns().out('array').slice(0, 10);
  const topics = doc.topics().out('array').slice(0, 5);
  return [...new Set([...topics, ...nouns])].slice(0, 8);
}

function extractPeople(text) {
  const doc = nlp(text);
  return doc.people().out('array').slice(0, 5);
}

function analyzeArticle(title, description = '') {
  const fullText = `${title} ${description}`;
  return {
    sentiment: analyzeSentiment(fullText),
    category: categorize(fullText),
    keywords: extractKeywords(fullText),
    people: extractPeople(fullText),
  };
}

module.exports = { analyzeArticle, analyzeSentiment, categorize, extractKeywords };
