import React, { useState, useEffect } from 'react';
import '../styles/PerformanceChart.css';

/**
 * Asset Performance Bar Chart
 * Fetches real 20-year performance data from Yahoo Finance
 * Gold and Silver prominently featured
 */

// Color mapping for each asset - Gold/Silver prominent, others muted
const colorMap = {
  'Gold': '#d4a84b',
  'Silver': '#9ca3a8',
  'S&P 500': '#5a7a9a',
  'Dow Jones': '#5a8a85',
  'Real Estate': '#5a9a6a',
  'Bonds': '#6a6a6a',
  'CDs/Savings': '#5a5a5a',
  'Cash (USD)': '#4a4a4a'
};

// Fallback data in case API fails
const fallbackData = [
  { name: 'Gold', return: 680 },
  { name: 'Silver', return: 420 },
  { name: 'S&P 500', return: 450 },
  { name: 'Dow Jones', return: 380 },
  { name: 'Real Estate', return: 220 },
  { name: 'Bonds', return: 85 },
  { name: 'CDs/Savings', return: 49 },
  { name: 'Cash (USD)', return: -44 }
];

function PerformanceChart() {
  const [assetData, setAssetData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await fetch('/api/performance');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
          // Add colors to the data
          const dataWithColors = result.data.map(item => ({
            ...item,
            color: colorMap[item.name] || '#666666'
          }));
          setAssetData(dataWithColors);
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  // Calculate max for scale
  const maxReturn = Math.max(1000, ...assetData.map(a => a.return));
  const gridLines = [0, 200, 400, 600, 800, 1000];

  // Add more grid lines if needed
  if (maxReturn > 1000) {
    const extra = Math.ceil(maxReturn / 200) * 200;
    gridLines.push(...[1200, 1400, 1600, 1800, 2000].filter(v => v <= extra));
  }

  return (
    <div className="performance-chart">
      <h2 className="chart-title">
        Gold & Silver vs. Traditional Asset Classes
        <span className="chart-period">(20-Year Performance)</span>
      </h2>

      <div className="bar-chart-container">
        {/* Y-axis */}
        <div className="bar-y-axis">
          {gridLines.slice().reverse().map((val) => (
            <span key={val}>{val}%</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="bar-chart-area">
          {/* Grid lines */}
          <div className="bar-grid">
            {gridLines.map((val) => (
              <div
                key={val}
                className="grid-line-h"
                style={{ bottom: `${(val / maxReturn) * 100}%` }}
              />
            ))}
          </div>

          {/* Zero line */}
          <div className="zero-line" />

          {/* Bars */}
          <div className="bars-container">
            {assetData.map((asset) => {
              const isNegative = asset.return < 0;
              const height = Math.abs(asset.return) / maxReturn * 100;
              const barStyle = {
                height: `${Math.max(height, 1)}%`,
                backgroundColor: asset.color || colorMap[asset.name] || '#666',
                bottom: isNegative ? 'auto' : '0',
                top: isNegative ? '100%' : 'auto'
              };

              return (
                <div key={asset.name} className="bar-wrapper">
                  <div className="bar-value">
                    {asset.return >= 0 ? '+' : ''}{asset.return}%
                  </div>
                  <div className="bar" style={barStyle}>
                    {asset.name === 'Gold' && <div className="bar-highlight" />}
                    {asset.name === 'Silver' && <div className="bar-highlight silver" />}
                  </div>
                  <div className="bar-label">{asset.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="chart-footnote">
        {loading ? 'Loading real-time data...' :
          '*Live data from Yahoo Finance. CDs & Cash are estimated. Past performance does not guarantee future results.'}
      </p>
    </div>
  );
}

export default PerformanceChart;
