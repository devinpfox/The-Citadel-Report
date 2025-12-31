import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for fetching and managing market data
 *
 * Features:
 * - Auto-refresh at configurable intervals (default 30 seconds)
 * - Error handling with retry logic
 * - Loading states for initial and subsequent fetches
 * - Tracks which prices have updated for animations
 *
 * @param {number} refreshInterval - Refresh interval in milliseconds
 * @returns {Object} Market data, loading state, error state, and last updated time
 */
export function useMarketData(refreshInterval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // Track previous prices to detect changes for animations
  const prevPricesRef = useRef({});
  const [updatedTiles, setUpdatedTiles] = useState({});

  /**
   * Fetch market data from our API proxy
   */
  const fetchData = useCallback(async (isInitialFetch = false) => {
    // Only show loading spinner on initial fetch
    if (isInitialFetch) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/prices');

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }

      // Detect which prices changed for animation triggers
      const newUpdatedTiles = {};
      const currentPrices = prevPricesRef.current;

      if (result.data) {
        ['gold', 'silver', 'sp500', 'dow'].forEach((key) => {
          const newPrice = result.data[key]?.price;
          const oldPrice = currentPrices[key];

          if (oldPrice !== undefined && newPrice !== oldPrice) {
            newUpdatedTiles[key] = true;
          }

          if (newPrice !== undefined) {
            currentPrices[key] = newPrice;
          }
        });
      }

      // Trigger update animations
      if (Object.keys(newUpdatedTiles).length > 0) {
        setUpdatedTiles(newUpdatedTiles);
        // Clear animation flags after animation completes
        setTimeout(() => setUpdatedTiles({}), 600);
      }

      setData(result.data);
      setWarnings(result.warnings || []);
      setLastUpdated(new Date(result.lastUpdated));
      setError(null);

    } catch (err) {
      console.error('[useMarketData] Fetch error:', err);
      setError(err.message);

      // Don't clear existing data on error - show stale data with warning
      if (!data) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [data]);

  /**
   * Manual refresh function exposed to components
   */
  const refresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  // Initial fetch on mount (runs once)
  useEffect(() => {
    fetchData(true);
  }, []);

  // Set up auto-refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData(false);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    warnings,
    updatedTiles,
    refresh
  };
}

export default useMarketData;
