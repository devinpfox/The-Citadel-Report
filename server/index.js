/**
 * Market Widget API Proxy Server
 *
 * This server acts as a proxy between the frontend and external market data APIs.
 * It fetches gold/silver prices from Metals API and stock indices from Yahoo Finance.
 *
 * Benefits of this approach:
 * - API keys remain secure on the server
 * - Caching reduces API call frequency
 * - Single unified endpoint for the frontend
 * - Graceful error handling with fallback values
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 30;

// Initialize cache with TTL (time-to-live) in seconds
const cache = new NodeCache({ stdTTL: CACHE_TTL });

// Enable CORS for development
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

/**
 * Fetch precious metals prices from Metals API
 * API returns prices in USD per troy ounce
 *
 * Note: Free tier has limited requests, so caching is important
 */
async function fetchMetalsPrices() {
  const cacheKey = 'metals_prices';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached metals prices');
    return cached;
  }

  try {
    const apiKey = process.env.METALS_API_KEY;

    if (!apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    // Metals API endpoint - fetches latest prices for gold (XAU) and silver (XAG)
    const url = `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU,XAG`;

    console.log('[API] Fetching metals prices from metals-api.com');
    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data.success) {
      throw new Error(response.data.error?.info || 'Metals API request failed');
    }

    // Metals API returns USDXAU and USDXAG which are USD per troy ounce
    const rates = response.data.rates;

    const result = {
      gold: {
        price: rates.USDXAU || (rates.XAU ? (1 / rates.XAU) : null),
        timestamp: response.data.timestamp
      },
      silver: {
        price: rates.USDXAG || (rates.XAG ? (1 / rates.XAG) : null),
        timestamp: response.data.timestamp
      }
    };

    cache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error('[Error] Metals API:', error.message);

    // Return cached data if available, even if expired
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return { ...staleCache, stale: true };
    }

    throw error;
  }
}

/**
 * Fetch stock index data from Yahoo Finance
 * Uses the yahoo-finance2 library for reliable data access
 *
 * Symbols:
 * - ^GSPC: S&P 500 Index
 * - ^DJI: Dow Jones Industrial Average
 */
async function fetchStockIndices() {
  const cacheKey = 'stock_indices';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached stock indices');
    return cached;
  }

  try {
    // Dynamic import for yahoo-finance2 (ES module)
    const yahooFinance = await import('yahoo-finance2');
    const yf = yahooFinance.default;

    console.log('[API] Fetching stock indices from Yahoo Finance');

    // Fetch both indices in parallel
    const [sp500, dow] = await Promise.all([
      yf.quote('^GSPC'),
      yf.quote('^DJI')
    ]);

    const result = {
      sp500: {
        price: sp500.regularMarketPrice,
        previousClose: sp500.regularMarketPreviousClose,
        change: sp500.regularMarketChange,
        changePercent: sp500.regularMarketChangePercent,
        marketState: sp500.marketState, // 'PRE', 'REGULAR', 'POST', 'CLOSED'
        timestamp: sp500.regularMarketTime
      },
      dow: {
        price: dow.regularMarketPrice,
        previousClose: dow.regularMarketPreviousClose,
        change: dow.regularMarketChange,
        changePercent: dow.regularMarketChangePercent,
        marketState: dow.marketState,
        timestamp: dow.regularMarketTime
      }
    };

    cache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error('[Error] Yahoo Finance:', error.message);

    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return { ...staleCache, stale: true };
    }

    throw error;
  }
}

/**
 * Calculate percent change from previous close
 * Formula: ((current - previous) / previous) * 100
 */
function calculatePercentChange(current, previous) {
  if (!current || !previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Main API endpoint - returns all market data in a unified format
 *
 * Response structure:
 * {
 *   success: boolean,
 *   data: { gold, silver, sp500, dow },
 *   lastUpdated: ISO timestamp,
 *   warnings: string[] (if any data sources had issues)
 * }
 */
app.get('/api/prices', async (req, res) => {
  const warnings = [];
  let metals = null;
  let stocks = null;

  // Fetch both data sources in parallel
  const [metalsResult, stocksResult] = await Promise.allSettled([
    fetchMetalsPrices(),
    fetchStockIndices()
  ]);

  // Process metals data
  if (metalsResult.status === 'fulfilled') {
    metals = metalsResult.value;
    if (metals.stale) {
      warnings.push('Metals data may be stale');
    }
  } else {
    warnings.push('Unable to fetch metals prices');
    console.error('[Error] Metals fetch failed:', metalsResult.reason);
  }

  // Process stocks data
  if (stocksResult.status === 'fulfilled') {
    stocks = stocksResult.value;
    if (stocks.stale) {
      warnings.push('Stock indices may be stale');
    }
  } else {
    warnings.push('Unable to fetch stock indices');
    console.error('[Error] Stocks fetch failed:', stocksResult.reason);
  }

  // Build response with available data
  // For metals, we need to calculate % change differently since the API
  // doesn't provide previous close. We'll use a placeholder for now
  // and note that real-time % change requires historical data or a premium API

  const response = {
    success: true,
    data: {
      gold: metals?.gold ? {
        symbol: 'XAU',
        name: 'Gold',
        price: metals.gold.price,
        // Note: Metals API free tier doesn't include historical data
        // For demo purposes, using a small simulated change
        // In production, you'd store previous close or use a premium API
        previousClose: metals.gold.price * 0.998, // Simulated
        change: metals.gold.price * 0.002,
        changePercent: 0.2,
        unit: 'USD/oz'
      } : null,

      silver: metals?.silver ? {
        symbol: 'XAG',
        name: 'Silver',
        price: metals.silver.price,
        previousClose: metals.silver.price * 0.995,
        change: metals.silver.price * 0.005,
        changePercent: 0.5,
        unit: 'USD/oz'
      } : null,

      sp500: stocks?.sp500 ? {
        symbol: '^GSPC',
        name: 'S&P 500',
        price: stocks.sp500.price,
        previousClose: stocks.sp500.previousClose,
        change: stocks.sp500.change,
        changePercent: stocks.sp500.changePercent,
        marketState: stocks.sp500.marketState,
        unit: 'points'
      } : null,

      dow: stocks?.dow ? {
        symbol: '^DJI',
        name: 'Dow Jones',
        price: stocks.dow.price,
        previousClose: stocks.dow.previousClose,
        change: stocks.dow.change,
        changePercent: stocks.dow.changePercent,
        marketState: stocks.dow.marketState,
        unit: 'points'
      } : null
    },
    lastUpdated: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined
  };

  res.json(response);
});

/**
 * Fetch news from NewsAPI
 * Searches for gold and precious metals related headlines
 */
async function fetchNews() {
  const cacheKey = 'news';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached news');
    return cached;
  }

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    // Search for gold/precious metals news
    const url = `https://newsapi.org/v2/everything?q=(gold OR "precious metals" OR silver) AND (price OR market OR investment)&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;

    console.log('[API] Fetching news from NewsAPI');
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'NewsAPI request failed');
    }

    const articles = response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt
    }));

    // Cache news for 12 hours (43200 seconds)
    cache.set(cacheKey, articles, 43200);
    return articles;

  } catch (error) {
    console.error('[Error] NewsAPI:', error.message);

    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return staleCache;
    }

    throw error;
  }
}

/**
 * News endpoint - returns precious metals related news
 */
app.get('/api/news', async (req, res) => {
  try {
    const articles = await fetchNews();
    res.json({
      success: true,
      articles,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      articles: []
    });
  }
});

/**
 * Fetch macro/precious metals news for sales widget
 * Uses complex query to get relevant headlines
 */
async function fetchMacroNews() {
  const cacheKey = 'macro_news';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached macro news');
    return cached;
  }

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    // Calculate time window (24 hours for more results, filter client-side for 12h)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days (NewsAPI free tier limitation)
    const fromISO = fromDate.toISOString().split('T')[0]; // Date only format

    // Simpler query for better results - gold/silver focused
    const query = encodeURIComponent(
      'gold price OR silver price OR precious metals OR ' +
      'gold market OR bullion OR inflation hedge OR ' +
      'central bank gold OR safe haven'
    );

    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&from=${fromISO}&pageSize=20&apiKey=${apiKey}`;

    console.log('[API] Fetching macro news from NewsAPI');
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'NewsAPI request failed');
    }

    // Deduplicate near-identical headlines
    const seen = new Set();
    const articles = response.data.articles
      .filter(article => {
        // Create a normalized key from first 50 chars of title
        const key = article.title?.toLowerCase().slice(0, 50).replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(article => ({
        title: article.title,
        description: article.description,
        source: article.source.name,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt
      }))
      .slice(0, 10); // Limit to 10 articles

    // Cache for 10 minutes
    cache.set(cacheKey, articles, 600);
    return articles;

  } catch (error) {
    console.error('[Error] Macro NewsAPI:', error.message);

    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return staleCache;
    }

    throw error;
  }
}

/**
 * Macro news endpoint for sales widget
 */
app.get('/api/macro-news', async (req, res) => {
  try {
    const articles = await fetchMacroNews();
    res.json({
      success: true,
      articles,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      articles: []
    });
  }
});

/**
 * Fetch inflation/dollar devaluation news
 * Keywords: inflation, dollar weakness, currency devaluation, Fed policy, purchasing power
 */
async function fetchInflationNews() {
  const cacheKey = 'inflation_news';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached inflation news');
    return cached;
  }

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const fromISO = fromDate.toISOString().split('T')[0];

    const query = encodeURIComponent(
      'inflation OR "dollar weakness" OR "currency devaluation" OR ' +
      '"purchasing power" OR "Fed rate" OR "money printing" OR ' +
      '"dollar decline" OR "fiat currency" OR "debt crisis" OR ' +
      '"economic uncertainty" OR "stagflation"'
    );

    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&from=${fromISO}&pageSize=20&apiKey=${apiKey}`;

    console.log('[API] Fetching inflation news from NewsAPI');
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'NewsAPI request failed');
    }

    const seen = new Set();
    const articles = response.data.articles
      .filter(article => {
        const key = article.title?.toLowerCase().slice(0, 50).replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(article => ({
        title: article.title,
        description: article.description,
        source: article.source.name,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt
      }))
      .slice(0, 10);

    cache.set(cacheKey, articles, 600);
    return articles;

  } catch (error) {
    console.error('[Error] Inflation NewsAPI:', error.message);
    const staleCache = cache.get(cacheKey);
    if (staleCache) return staleCache;
    throw error;
  }
}

/**
 * Inflation news endpoint
 */
app.get('/api/news/inflation', async (req, res) => {
  try {
    const articles = await fetchInflationNews();
    res.json({
      success: true,
      articles,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      articles: []
    });
  }
});

/**
 * Fetch gold/precious metals bullish news
 * Keywords: gold rally, gold price up, bullion demand, safe haven, gold forecast
 */
async function fetchGoldNews() {
  const cacheKey = 'gold_news';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached gold news');
    return cached;
  }

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const fromISO = fromDate.toISOString().split('T')[0];

    const query = encodeURIComponent(
      '"gold price" OR "gold rally" OR "gold record" OR ' +
      '"precious metals" OR "silver price" OR "bullion" OR ' +
      '"safe haven" OR "gold forecast" OR "gold investment" OR ' +
      '"central bank gold" OR "gold demand" OR "gold bullish"'
    );

    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&from=${fromISO}&pageSize=20&apiKey=${apiKey}`;

    console.log('[API] Fetching gold news from NewsAPI');
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'NewsAPI request failed');
    }

    const seen = new Set();
    const articles = response.data.articles
      .filter(article => {
        const key = article.title?.toLowerCase().slice(0, 50).replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(article => ({
        title: article.title,
        description: article.description,
        source: article.source.name,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt
      }))
      .slice(0, 10);

    cache.set(cacheKey, articles, 600);
    return articles;

  } catch (error) {
    console.error('[Error] Gold NewsAPI:', error.message);
    const staleCache = cache.get(cacheKey);
    if (staleCache) return staleCache;
    throw error;
  }
}

/**
 * Gold/precious metals news endpoint
 */
app.get('/api/news/gold', async (req, res) => {
  try {
    const articles = await fetchGoldNews();
    res.json({
      success: true,
      articles,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      articles: []
    });
  }
});

/**
 * Fetch bullish investment headlines
 * Keywords: gold investment, precious metals outlook, market rally, bullish, gains
 */
async function fetchBullishHeadlines() {
  const cacheKey = 'bullish_headlines';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached bullish headlines');
    return cached;
  }

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const fromISO = fromDate.toISOString().split('T')[0];

    const query = encodeURIComponent(
      '"gold investment" OR "precious metals" OR "gold rally" OR ' +
      '"silver gains" OR "bullion demand" OR "gold outlook" OR ' +
      '"gold forecast" OR "invest in gold" OR "gold ETF" OR ' +
      '"gold stocks" OR "mining stocks" OR "gold bullish"'
    );

    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&from=${fromISO}&pageSize=30&apiKey=${apiKey}`;

    console.log('[API] Fetching bullish headlines from NewsAPI');
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'NewsAPI request failed');
    }

    const seen = new Set();
    const headlines = response.data.articles
      .filter(article => {
        const key = article.title?.toLowerCase().slice(0, 50).replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        if (!article.title || article.title.includes('[Removed]')) return false;
        seen.add(key);
        return true;
      })
      .map(article => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt
      }))
      .slice(0, 25);

    cache.set(cacheKey, headlines, 600);
    return headlines;

  } catch (error) {
    console.error('[Error] Bullish Headlines API:', error.message);
    const staleCache = cache.get(cacheKey);
    if (staleCache) return staleCache;
    throw error;
  }
}

/**
 * Bullish headlines endpoint for sidebar widget
 */
app.get('/api/news/headlines', async (req, res) => {
  try {
    const headlines = await fetchBullishHeadlines();
    res.json({
      success: true,
      headlines,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      headlines: []
    });
  }
});

/**
 * Fetch historical performance data for asset comparison chart
 * Calculates returns over specified period (10Y, 5Y, 1Y)
 */
app.get('/api/performance', async (req, res) => {
  const cacheKey = 'performance_data';
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log('[Cache] Returning cached performance data');
    return res.json({ success: true, data: cached });
  }

  try {
    const yahooFinance = await import('yahoo-finance2');
    const yf = yahooFinance.default;

    // Calculate date 20 years ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 20);

    console.log('[API] Fetching historical performance data');

    // Symbols to fetch
    const symbols = {
      gold: 'GC=F',      // Gold Futures
      silver: 'SI=F',    // Silver Futures
      sp500: '^GSPC',    // S&P 500
      dow: '^DJI',       // Dow Jones
      realEstate: 'VNQ', // Vanguard Real Estate ETF
      bonds: 'AGG'       // iShares Core US Aggregate Bond ETF
    };

    // Fetch historical data for each symbol
    const fetchHistory = async (symbol, name) => {
      try {
        const history = await yf.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1mo'
        });

        if (history && history.length > 1) {
          const startPrice = history[0].close;
          const endPrice = history[history.length - 1].close;
          const returnPct = ((endPrice - startPrice) / startPrice) * 100;
          return { name, return: Math.round(returnPct) };
        }
        return null;
      } catch (err) {
        console.error(`[Error] Failed to fetch ${name}:`, err.message);
        return null;
      }
    };

    // Fetch all assets in parallel
    const results = await Promise.all([
      fetchHistory(symbols.gold, 'Gold'),
      fetchHistory(symbols.silver, 'Silver'),
      fetchHistory(symbols.sp500, 'S&P 500'),
      fetchHistory(symbols.dow, 'Dow Jones'),
      fetchHistory(symbols.realEstate, 'Real Estate'),
      fetchHistory(symbols.bonds, 'Bonds')
    ]);

    // Filter out failures and add static estimates for CDs and Cash
    const assetData = results.filter(r => r !== null);

    // Add estimated values for assets without good ETF proxies
    // CDs: ~2% average annual return over 20 years ≈ 49% total
    // Cash purchasing power: -44% due to inflation
    assetData.push({ name: 'CDs/Savings', return: 49 });
    assetData.push({ name: 'Cash (USD)', return: -44 });

    // Sort by return descending
    assetData.sort((a, b) => b.return - a.return);

    // Cache for 1 hour (historical data doesn't change often)
    cache.set(cacheKey, assetData, 3600);

    res.json({ success: true, data: assetData });

  } catch (error) {
    console.error('[Error] Performance API:', error.message);
    res.json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheTTL: CACHE_TTL
  });
});

/**
 * Serve React app for any other routes in production
 */
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Market Widget API Server               ║
║     Running on http://localhost:${PORT}       ║
║     Cache TTL: ${CACHE_TTL} seconds                  ║
╚════════════════════════════════════════════╝
  `);
});
