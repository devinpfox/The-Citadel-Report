import React from 'react';
import MarketWidget from './components/MarketWidget';
import PerformanceChart from './components/PerformanceChart';
import NewsWidget from './components/NewsWidget';
import HeadlinesWidget from './components/HeadlinesWidget';
import './styles/App.css';

const talkingPoints = [
  {
    title: "Gold & Silver Up, Dollar Down",
    quote: "Gold and silver prices have hit multi-year highs fueled by a weakening dollar, expected rate cuts, and global risk appetite shifting to hard assets like bullion.",
    source: "New York Post"
  },
  {
    title: "Market Volatility = Risk of Missing Out",
    quote: "Recent sell-offs show markets are unstable and can swing fast — precious metals often act as a hedge when stocks and currencies get shaky.",
    source: "AP News"
  },
  {
    title: "Central Banks Are Buying",
    quote: "Central banks are buying gold aggressively to diversify reserves, reducing reliance on fiat currencies and underpinning long-term demand.",
    source: "Bloomberg"
  }
];

function App() {
  return (
    <div className="app">
      <div className="app-layout">
        {/* Main Content Area */}
        <div className="main-content">
          <header className="app-header">
            <img src="/logo.png" alt="Citadel Gold" className="logo" />
            <p className="subtitle">
              <span className="line"></span>
              THE CITADEL GOLD REPORT
              <span className="line"></span>
            </p>
          </header>

          <main className="app-main">
            <MarketWidget />
          </main>

          <section className="talking-points">
            <h2 className="section-header">
              <span className="line"></span>
              TALKING POINTS
              <span className="line"></span>
            </h2>
            <div className="points-grid">
              {talkingPoints.map((point, index) => (
                <div key={index} className="point-card">
                  <h3 className="point-title">{point.title}</h3>
                  <p className="point-quote">"{point.quote}"</p>
                  <span className="point-source">— {point.source}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Chart + News: 50% / 25% / 25% Layout */}
          <section className="chart-news-section">
            <div className="chart-column">
              <PerformanceChart />
            </div>
            <div className="news-column">
              <NewsWidget topic="inflation" />
            </div>
            <div className="news-column">
              <NewsWidget topic="gold" />
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="sidebar">
          <HeadlinesWidget />
        </aside>
      </div>
    </div>
  );
}

export default App;
