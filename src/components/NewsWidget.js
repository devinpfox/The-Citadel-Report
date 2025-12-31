import React, { useState, useEffect, useCallback } from 'react';
import '../styles/NewsWidget.css';

/**
 * NewsWidget - Carousel of topic-specific news
 * Auto-rotates every 30 seconds, refreshes data every 10 minutes
 *
 * Props:
 * - topic: 'inflation' | 'gold' (determines API endpoint and title)
 */

const ROTATION_INTERVAL = 30000; // 30 seconds
const REFRESH_INTERVAL = 600000; // 10 minutes

const TOPIC_CONFIG = {
  inflation: {
    title: 'Dollar & Inflation',
    endpoint: '/api/news/inflation',
    emptyIcon: '💵',
    emptyText: 'No inflation news available'
  },
  gold: {
    title: 'Gold & Precious Metals',
    endpoint: '/api/news/gold',
    emptyIcon: '🥇',
    emptyText: 'No gold news available'
  }
};

function NewsWidget({ topic = 'gold' }) {
  const [articles, setArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slideDirection, setSlideDirection] = useState('');

  const config = TOPIC_CONFIG[topic] || TOPIC_CONFIG.gold;

  // Fetch articles from API
  const fetchArticles = useCallback(async () => {
    try {
      const response = await fetch(config.endpoint);
      const result = await response.json();

      if (result.success && result.articles.length > 0) {
        setArticles(result.articles);
        setError(null);
      } else if (result.articles.length === 0) {
        setError('No recent articles found');
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchArticles();

    const refreshTimer = setInterval(fetchArticles, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimer);
  }, [fetchArticles]);

  // Auto-rotate carousel
  useEffect(() => {
    if (articles.length <= 1) return;

    const rotationTimer = setInterval(() => {
      setSlideDirection('slide-out-left');
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % articles.length);
        setSlideDirection('slide-in-right');
        setTimeout(() => {
          setSlideDirection('');
        }, 400);
      }, 400);
    }, ROTATION_INTERVAL);

    return () => clearInterval(rotationTimer);
  }, [articles.length]);

  // Format relative time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Manual navigation
  const goToSlide = (index) => {
    if (index === currentIndex || slideDirection) return;
    const direction = index > currentIndex ? 'left' : 'right';
    setSlideDirection(`slide-out-${direction}`);
    setTimeout(() => {
      setCurrentIndex(index);
      setSlideDirection(`slide-in-${direction === 'left' ? 'right' : 'left'}`);
      setTimeout(() => {
        setSlideDirection('');
      }, 400);
    }, 400);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="news-widget">
        <h3 className="news-widget-title">{config.title}</h3>
        <div className="news-card news-card--skeleton">
          <div className="news-image-skeleton" />
          <div className="news-content-skeleton">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-desc" />
            <div className="skeleton-line skeleton-desc short" />
            <div className="skeleton-line skeleton-meta" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (error || articles.length === 0) {
    return (
      <div className="news-widget">
        <h3 className="news-widget-title">{config.title}</h3>
        <div className="news-card news-card--empty">
          <div className="empty-state">
            <span className="empty-icon">{config.emptyIcon}</span>
            <p>{config.emptyText}</p>
            <span className="empty-hint">Check back soon for updates</span>
          </div>
        </div>
      </div>
    );
  }

  const article = articles[currentIndex];

  return (
    <div className="news-widget">
      <h3 className="news-widget-title">{config.title}</h3>

      <div className={`news-card ${slideDirection}`}>
        {article.image && (
          <div className="news-image-wrapper">
            <img
              src={article.image}
              alt=""
              className="news-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="news-content">
          <h4 className="news-headline">{article.title}</h4>

          {article.description && (
            <p className="news-excerpt">
              {article.description.length > 120
                ? article.description.slice(0, 120) + '...'
                : article.description}
            </p>
          )}

          <div className="news-meta">
            <span className="news-source">{article.source}</span>
            <span className="news-time">{formatTime(article.publishedAt)}</span>
          </div>
        </div>
      </div>

      {/* Carousel dots */}
      {articles.length > 1 && (
        <div className="news-dots">
          {articles.map((_, index) => (
            <button
              key={index}
              className={`news-dot ${index === currentIndex ? 'news-dot--active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className="news-footer">
        <span className="news-count">
          {currentIndex + 1} of {articles.length}
        </span>
      </div>
    </div>
  );
}

export default NewsWidget;
