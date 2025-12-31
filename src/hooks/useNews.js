import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching precious metals news
 * Refreshes every 12 hours
 */
export function useNews(refreshInterval = 43200000) {
  const [headlines, setHeadlines] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news');
      const data = await response.json();

      if (data.success && data.articles.length > 0) {
        setHeadlines(data.articles);
        setError(null);
      } else if (data.articles.length === 0) {
        setError('No news available');
      }
    } catch (err) {
      console.error('[useNews] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Refresh news periodically
  useEffect(() => {
    const intervalId = setInterval(fetchNews, refreshInterval);
    return () => clearInterval(intervalId);
  }, [fetchNews, refreshInterval]);

  // Rotate through headlines every 30 seconds
  useEffect(() => {
    if (headlines.length <= 1) return;

    const rotateId = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % headlines.length);
    }, 30000);

    return () => clearInterval(rotateId);
  }, [headlines.length]);

  return {
    headline: headlines[currentIndex] || null,
    loading,
    error,
    totalHeadlines: headlines.length
  };
}

export default useNews;
