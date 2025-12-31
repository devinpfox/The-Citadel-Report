import React, { useState, useEffect, useCallback } from 'react';
import '../styles/HeadlinesWidget.css';

/**
 * HeadlinesWidget - Sidebar carousel of bullish investment headlines
 * Shows 5 headlines at a time, rotates every 60 seconds
 */

const ROTATION_INTERVAL = 60000; // 1 minute
const REFRESH_INTERVAL = 600000; // 10 minutes
const HEADLINES_PER_PAGE = 5;

function HeadlinesWidget() {
  const [headlines, setHeadlines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slideDirection, setSlideDirection] = useState('');

  const totalPages = Math.ceil(headlines.length / HEADLINES_PER_PAGE);

  // Fetch headlines from API
  const fetchHeadlines = useCallback(async () => {
    try {
      const response = await fetch('/api/news/headlines');
      const result = await response.json();

      if (result.success && result.headlines.length > 0) {
        setHeadlines(result.headlines);
        setError(null);
      } else if (result.headlines.length === 0) {
        setError('No headlines found');
      }
    } catch (err) {
      console.error('Failed to fetch headlines:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchHeadlines();
    const refreshTimer = setInterval(fetchHeadlines, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimer);
  }, [fetchHeadlines]);

  // Auto-rotate pages
  useEffect(() => {
    if (totalPages <= 1) return;

    const rotationTimer = setInterval(() => {
      setSlideDirection('slide-out-up');
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setSlideDirection('slide-in-up');
        setTimeout(() => {
          setSlideDirection('');
        }, 400);
      }, 400);
    }, ROTATION_INTERVAL);

    return () => clearInterval(rotationTimer);
  }, [totalPages]);

  // Get current page headlines
  const getCurrentHeadlines = () => {
    const start = currentPage * HEADLINES_PER_PAGE;
    return headlines.slice(start, start + HEADLINES_PER_PAGE);
  };

  // Format relative time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      const days = Math.floor(diffHours / 24);
      return `${days}d`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="headlines-widget">
        <h3 className="headlines-title">Investment News</h3>
        <div className="headlines-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="headline-item headline-item--skeleton">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error/empty state
  if (error || headlines.length === 0) {
    return (
      <div className="headlines-widget">
        <h3 className="headlines-title">Investment News</h3>
        <div className="headlines-empty">
          <p>No headlines available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="headlines-widget">
      <h3 className="headlines-title">Investment News</h3>

      <div className={`headlines-list ${slideDirection}`}>
        {getCurrentHeadlines().map((headline, index) => (
          <div key={`${currentPage}-${index}`} className="headline-item">
            <span className="headline-bullet">&#9670;</span>
            <div className="headline-content">
              <p className="headline-text">{headline.title}</p>
              <div className="headline-meta">
                <span className="headline-source">{headline.source}</span>
                <span className="headline-time">{formatTime(headline.publishedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="headlines-pagination">
          {[...Array(totalPages)].map((_, index) => (
            <span
              key={index}
              className={`pagination-dot ${index === currentPage ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeadlinesWidget;
