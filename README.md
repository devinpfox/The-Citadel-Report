# Market Widget

Real-time precious metals and market index widget for internal dashboards.

## Features

- **Live Prices**: Gold, Silver, S&P 500, and Dow Jones
- **Auto-Refresh**: Updates every 30 seconds
- **Professional UI**: Institutional finance aesthetic with color-coded tiles
- **Error Handling**: Graceful fallbacks with cached data
- **Responsive**: Works on desktop and large monitors
- **Animations**: Subtle flash when prices update

## Architecture

```
┌─────────────────────────────────────────────────┐
│                React Frontend                    │
│    [GOLD] [SILVER] [S&P 500] [DOW]              │
│         ↑ Polls /api/prices every 30s           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│           Node.js API Proxy (Port 3001)          │
│                       │                          │
│    ┌──────────────────┴──────────────────┐      │
│    ↓                                     ↓       │
│  Metals API                      Yahoo Finance   │
│  (XAU, XAG)                     (^GSPC, ^DJI)   │
└──────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd market-widget
npm install
```

### 2. Configure Environment

Your `.env` file is already set up. To modify:

```bash
# .env
METALS_API_KEY=your_api_key_here
PORT=3001
CACHE_TTL=30
```

### 3. Run Development Mode

```bash
npm run dev
```

This starts both:
- Backend API proxy on http://localhost:3001
- React frontend on http://localhost:3000

### 4. Production Build

```bash
npm run build
npm start
```

## API Endpoints

### GET /api/prices

Returns all market data:

```json
{
  "success": true,
  "data": {
    "gold": {
      "symbol": "XAU",
      "name": "Gold",
      "price": 2650.25,
      "changePercent": 0.45,
      "unit": "USD/oz"
    },
    "silver": { ... },
    "sp500": { ... },
    "dow": { ... }
  },
  "lastUpdated": "2024-01-15T14:30:00.000Z",
  "warnings": []
}
```

### GET /api/health

Health check endpoint.

## Data Sources

| Asset | Source | Notes |
|-------|--------|-------|
| Gold (XAU) | Metals API | Free tier: ~50 requests/month |
| Silver (XAG) | Metals API | Same as above |
| S&P 500 | Yahoo Finance | No API key required |
| Dow Jones | Yahoo Finance | No API key required |

## How It Works

### Data Flow

1. **Frontend** polls `/api/prices` every 30 seconds
2. **Backend** checks cache (30s TTL)
3. If cache miss, fetches from external APIs in parallel
4. Responses are cached and returned
5. **Frontend** updates tiles, triggers animations on price changes

### Percent Change Calculation

For stock indices, Yahoo Finance provides real previous close data:
```
changePercent = ((currentPrice - previousClose) / previousClose) * 100
```

For metals (free tier limitation), we display simulated change values.
For accurate metals % change, consider:
- Storing previous close daily
- Upgrading to a premium Metals API plan

### Error Handling

- If an API fails, cached data is returned with a warning
- If no cache exists, error UI is shown with retry button
- Stale data is always preferred over no data

## Customization

### Refresh Interval

Edit `src/components/MarketWidget.js`:
```javascript
const { data, ... } = useMarketData(60000); // 60 seconds
```

### Color Scheme

Edit `src/styles/MarketWidget.css` color variants:
- `.price-tile--gold`
- `.price-tile--silver`
- `.price-tile--blue`
- `.price-tile--teal`

## Troubleshooting

**"Unable to load market data"**
- Check that the backend is running on port 3001
- Verify your Metals API key in `.env`

**Metals prices not updating**
- Free tier has limited requests (~50/month)
- Data is cached for 30 seconds

**Stock indices showing "Market Closed"**
- This is expected outside US market hours (9:30 AM - 4:00 PM ET)
- Prices shown are from last market close

## License

Internal use only.
