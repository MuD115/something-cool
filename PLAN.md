# Syria Live Dashboard — Implementation Plan

## Overview

A visually stunning, single-page interactive dashboard that aggregates and displays the latest news, data, and developments about Syria. Built as a modern web app with real-time web search integration, rich visualizations, and an immersive dark-themed UI with accent colors inspired by the Syrian flag (red, white, black, green).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  Vite + React 18 + TypeScript + Tailwind CSS         │
│  Charts: Recharts | Map: Leaflet | Animations: Framer│
├─────────────────────────────────────────────────────┤
│                 Backend (Express.js)                  │
│  REST API + WebSocket for live updates               │
├─────────────────────────────────────────────────────┤
│              External Data Sources                    │
│  News APIs, Web Search, RSS feeds                    │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Frontend    | React 18 + TypeScript, Vite, Tailwind CSS            |
| Charts      | Recharts (area/bar/pie), custom SVG gauges           |
| Map         | React-Leaflet with custom tile layers                |
| Animations  | Framer Motion (page transitions, card reveals)       |
| Icons       | Lucide React                                         |
| Backend     | Express.js + Node.js                                 |
| Search      | Brave Search API (free tier, web search)             |
| RSS/News    | rss-parser for RSS feed aggregation                  |
| Realtime    | WebSocket (ws) for push updates                      |
| Sentiment   | compromise (NLP) for headline sentiment analysis     |

---

## Pages & Visual Components

### 1. **Top Navigation Bar**
- Glassmorphism effect (backdrop-blur, semi-transparent)
- Syria flag gradient accent line at top
- Dashboard title with animated typing effect on first load
- Last-updated timestamp with pulsing green dot (live indicator)
- Dark/light theme toggle
- Auto-refresh interval selector (1min, 5min, 15min)

### 2. **Hero Section — Breaking News Ticker**
- Full-width horizontal scrolling ticker (marquee-style, CSS animation)
- Top 5 breaking headlines pulled from web search
- Each headline: colored urgency badge (red=breaking, orange=developing, blue=update)
- Click to expand into a modal with full article summary

### 3. **Live News Feed Panel** (Left column, ~60% width)
- **Card-based layout** with staggered fade-in animation (Framer Motion)
- Each news card contains:
  - Source favicon + name + timestamp (relative: "2 hours ago")
  - Headline (bold, truncated to 2 lines)
  - AI-generated 2-sentence summary
  - Sentiment indicator (colored pill: positive/neutral/negative)
  - Category tag (Politics, Humanitarian, Military, Economy, Reconstruction)
  - "Read more" link opening source in new tab
  - Share button (copy link)
- **Infinite scroll** with skeleton loading placeholders
- **Filter bar** at top:
  - Category chips (multi-select, pill-shaped buttons)
  - Date range picker
  - Source filter dropdown
  - Sort by: Latest / Most relevant / Sentiment

### 4. **Sidebar Widgets** (Right column, ~40% width)

#### 4a. **Interactive Map of Syria**
- React-Leaflet map centered on Syria (lat 35, lng 38)
- Custom dark map tiles (CartoDB dark_all)
- Animated pulsing markers for cities with recent news
- Marker size = proportional to number of articles mentioning that city
- Click marker → popup with latest headlines for that location
- Key cities pre-mapped: Damascus, Aleppo, Homs, Idlib, Raqqa, Deir ez-Zor, Daraa, Latakia, Qamishli, Tartus
- Heatmap overlay option showing news density
- Zoom controls + fullscreen toggle

#### 4b. **Sentiment Gauge**
- Animated semi-circular gauge (custom SVG)
- Shows overall sentiment of recent news (scale: Very Negative ↔ Very Positive)
- Needle animates on data change
- Color gradient: red → yellow → green
- Below gauge: "Based on analysis of X articles in the last 24 hours"

#### 4c. **Topic Trends Chart**
- Recharts AreaChart with stacked areas
- Shows topic frequency over the past 7 days
- Topics: Politics, Humanitarian, Military, Economy, Reconstruction, Diplomacy
- Each topic a distinct color from the palette
- Hover tooltip shows exact counts per day
- Smooth curve interpolation

#### 4d. **Key Figures Tracker**
- Horizontal scrollable row of avatar cards
- Key political/military figures mentioned in news
- Each card: name, role, mention count (animated counter), trend arrow (up/down)
- Data extracted from headline analysis

#### 4e. **Word Cloud**
- Dynamic word cloud (react-wordcloud or custom SVG)
- Most frequent terms from recent headlines
- Word size proportional to frequency
- Syrian flag color palette for words
- Click a word → filters news feed to that term

### 5. **Statistics Row** (Full-width section below main content)
- 4-5 animated counter cards in a row:
  - "Articles Today" (number with counting animation)
  - "Sources Tracked"
  - "Top Topic" (with icon)
  - "Average Sentiment" (with emoji indicator)
  - "Most Mentioned City"
- Each card: glass-card style, icon on left, number + label on right
- Numbers animate (count up) when scrolled into view

### 6. **Timeline View** (Expandable section)
- Vertical timeline of major recent events
- Each node: date, headline, category icon, brief description
- Alternating left/right layout
- Connecting line with animated gradient
- Nodes animate in on scroll (intersection observer)

### 7. **Sources Panel** (Collapsible footer section)
- Grid of source cards showing all aggregated sources
- Each: logo/favicon, name, article count, reliability indicator
- Sorted by article count

---

## Backend API Endpoints

```
GET  /api/news              → Paginated news articles (with filters)
GET  /api/news/breaking     → Top 5 breaking headlines
GET  /api/news/search?q=    → Search within articles
GET  /api/stats             → Dashboard statistics
GET  /api/topics            → Topic distribution data (7 days)
GET  /api/sentiment         → Sentiment analysis data
GET  /api/map               → City-based news markers
GET  /api/timeline          → Major events timeline
GET  /api/figures           → Key figures mention data
GET  /api/wordcloud         → Word frequency data
WS   /ws/live               → WebSocket for live updates
```

### Data Flow

1. **Scheduled fetcher** (runs every 5 minutes):
   - Queries Brave Search API for "Syria news", "Syria latest", "Syria politics", etc.
   - Parses RSS feeds from: Al Jazeera, Reuters, BBC, Syria Direct, SOHR
   - Deduplicates by headline similarity
   - Runs NLP (compromise) for: sentiment, entity extraction, keyword extraction
   - Geocodes city mentions against known Syria cities list
   - Stores in in-memory cache (no database needed for MVP)

2. **WebSocket broadcaster**:
   - On new articles detected, pushes delta to all connected clients
   - Client merges into existing state (no full reload)

---

## Color Palette & Design System

```
Background:        #0a0a0f (deep navy-black)
Surface:           #12121a (card backgrounds)
Surface Hover:     #1a1a2e
Border:            #2a2a3e (subtle borders)
Text Primary:      #e4e4e7
Text Secondary:    #8888a0
Accent Red:        #ce1126 (from Syrian flag)
Accent Green:      #007a3d (from Syrian flag)
Accent White:      #ffffff
Accent Gold:       #f0a500 (warm highlight)
Gradient Primary:  linear-gradient(135deg, #ce1126, #f0a500)
Gradient Card:     linear-gradient(145deg, #12121a, #1a1a2e)
Glassmorphism:     background: rgba(18,18,26,0.7); backdrop-filter: blur(12px)
```

### Typography
- Headings: Inter (bold, tracking tight)
- Body: Inter (regular)
- Monospace accents: JetBrains Mono (for counters, timestamps)

### Visual Effects
- Cards: subtle box-shadow + border (1px solid rgba(255,255,255,0.05))
- Hover: scale(1.02) + brighter border + shadow lift
- Loading: skeleton screens with shimmer animation
- Page transitions: fade + slide-up (Framer Motion)
- Scroll reveal: staggered children animation

---

## File Structure

```
/
├── server/
│   ├── index.js              # Express + WebSocket server
│   ├── fetcher.js            # Data fetching (Brave Search + RSS)
│   ├── analyzer.js           # NLP: sentiment, entities, keywords
│   ├── cache.js              # In-memory article cache
│   └── geocoder.js           # City mention → lat/lng mapping
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Root layout + routing
│   ├── index.css             # Tailwind directives + custom styles
│   ├── hooks/
│   │   ├── useNews.ts        # News data fetching hook
│   │   ├── useWebSocket.ts   # WebSocket connection hook
│   │   └── useStats.ts       # Stats data hook
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── news/
│   │   │   ├── NewsTicker.tsx       # Breaking news marquee
│   │   │   ├── NewsFeed.tsx         # Main news card list
│   │   │   ├── NewsCard.tsx         # Individual article card
│   │   │   ├── NewsFilters.tsx      # Category/date/source filters
│   │   │   └── NewsModal.tsx        # Expanded article modal
│   │   ├── map/
│   │   │   └── SyriaMap.tsx         # Interactive Leaflet map
│   │   ├── charts/
│   │   │   ├── SentimentGauge.tsx   # SVG gauge component
│   │   │   ├── TopicTrends.tsx      # Recharts area chart
│   │   │   └── WordCloud.tsx        # Word cloud visualization
│   │   ├── widgets/
│   │   │   ├── StatsRow.tsx         # Animated counter cards
│   │   │   ├── KeyFigures.tsx       # People tracker cards
│   │   │   ├── Timeline.tsx         # Event timeline
│   │   │   └── SourcesPanel.tsx     # Source attribution grid
│   │   └── ui/
│   │       ├── GlassCard.tsx        # Reusable glassmorphism card
│   │       ├── Badge.tsx            # Colored badge/pill
│   │       ├── Skeleton.tsx         # Loading skeleton
│   │       └── AnimatedCounter.tsx  # Count-up number animation
│   └── lib/
│       ├── api.ts            # API client functions
│       ├── types.ts          # TypeScript interfaces
│       ├── constants.ts      # Cities, categories, colors
│       └── utils.ts          # Formatting helpers
├── package.json
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── PLAN.md
```

---

## Implementation Order

### Phase 1: Project Setup
1. Initialize Vite + React + TypeScript project
2. Install all dependencies
3. Configure Tailwind CSS with custom theme (colors, fonts)
4. Set up Express backend with basic structure
5. Configure Vite proxy to backend

### Phase 2: Backend Data Pipeline
6. Implement Brave Search API integration
7. Implement RSS feed parser (Al Jazeera, Reuters, BBC)
8. Build article deduplication logic
9. Build NLP analyzer (sentiment, keywords, entities, city mentions)
10. Create in-memory cache with TTL
11. Implement all REST API endpoints
12. Set up WebSocket server for live push

### Phase 3: Core Frontend — Layout & News
13. Build Navbar with glassmorphism + live indicator
14. Build NewsTicker (breaking news marquee)
15. Build NewsCard component with all visual elements
16. Build NewsFeed with infinite scroll + skeleton loading
17. Build NewsFilters (categories, date, source, sort)
18. Build NewsModal for expanded article view

### Phase 4: Visualizations & Widgets
19. Build SyriaMap with Leaflet (dark tiles, pulsing markers, popups)
20. Build SentimentGauge (animated SVG)
21. Build TopicTrends chart (Recharts stacked area)
22. Build WordCloud visualization
23. Build KeyFigures tracker row
24. Build StatsRow with animated counters
25. Build Timeline component

### Phase 5: Polish & Integration
26. Add Framer Motion animations (page load, scroll reveal, hover)
27. Connect WebSocket for live updates
28. Add dark/light theme toggle
29. Responsive design pass (mobile/tablet)
30. Error states, empty states, loading states
31. Final visual polish and testing

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.8.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.290.0",
    "react-wordcloud": "^1.2.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^3.3.0",
    "@types/react": "^18.2.0",
    "vite": "^5.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  },
  "server": {
    "express": "^4.18.0",
    "ws": "^8.14.0",
    "rss-parser": "^3.13.0",
    "compromise": "^14.10.0",
    "axios": "^1.6.0",
    "cors": "^2.8.0"
  }
}
```

---

## Notes

- **No database required** — in-memory cache is sufficient for a live dashboard
- **Brave Search API** free tier: 2,000 queries/month — schedule wisely
- **Fallback**: If API key not configured, backend serves curated mock data so the UI is always demonstrable
- **Accessibility**: All charts include aria-labels; color is never the only differentiator
- **Performance**: Virtualized lists for large feeds; chart data pre-aggregated server-side
