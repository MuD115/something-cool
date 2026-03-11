const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const cache = require('./cache.cjs');
const { fetchAll } = require('./fetcher.cjs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });

app.use(cors());
app.use(express.json());

// Serve static files in production
app.use(express.static(path.join(__dirname, '..', 'dist')));

// --- API Routes ---

app.get('/api/news', (req, res) => {
  const filters = {
    category: req.query.category,
    sentiment: req.query.sentiment,
    search: req.query.search || req.query.q,
    source: req.query.source,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  res.json(cache.getAll(filters));
});

app.get('/api/news/breaking', (req, res) => {
  res.json(cache.getBreaking());
});

app.get('/api/stats', (req, res) => {
  res.json(cache.getStats());
});

app.get('/api/topics', (req, res) => {
  res.json(cache.getTopicTrends());
});

app.get('/api/sentiment', (req, res) => {
  res.json(cache.getSentimentData());
});

app.get('/api/map', (req, res) => {
  res.json(cache.getMapData());
});

app.get('/api/wordcloud', (req, res) => {
  res.json(cache.getWordCloud());
});

app.get('/api/figures', (req, res) => {
  res.json(cache.getFigures());
});

app.get('/api/timeline', (req, res) => {
  res.json(cache.getTimeline());
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

// --- WebSocket ---

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', message: 'Live feed connected' }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// --- Fetch Scheduler ---

async function scheduleFetch() {
  try {
    const newCount = await fetchAll();
    if (newCount > 0) {
      broadcast({
        type: 'update',
        newArticles: newCount,
        stats: cache.getStats(),
        breaking: cache.getBreaking(),
      });
    }
  } catch (err) {
    console.error('[Scheduler] Fetch error:', err.message);
  }
}

// Initial fetch on startup
scheduleFetch();

// Refetch every 5 minutes
setInterval(scheduleFetch, 5 * 60 * 1000);

// --- Start Server ---

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Server] Syria Dashboard API running on port ${PORT}`);
});
