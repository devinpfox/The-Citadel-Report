import React from 'react';

/**
 * PriceTile Component - Refined Dashboard Design
 *
 * New layout: Price prominent on top, label below, % as pill badge
 * Glassmorphism styling with improved scannability
 */
function PriceTile({
  name,
  price,
  changePercent,
  variant = 'default',
  isUpdated = false,
  showDollarSign = true
}) {
  const isPositive = changePercent >= 0;

  // Format price based on magnitude
  const formatPrice = (val) => {
    if (val === null || val === undefined) return '--';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Format percent change
  const formatPercent = (val) => {
    if (val === null || val === undefined) return '--';
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}${val.toFixed(2)}%`;
  };

  const tileClasses = [
    'price-tile',
    `price-tile--${variant}`,
    isUpdated ? 'price-tile--updated' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={tileClasses}>
      <div className="tile-content">
        <div className="tile-price">
          {showDollarSign && <span className="currency">$</span>}
          <span className="price-value">{formatPrice(price)}</span>
        </div>
        <div className="tile-label">{name}</div>
        <div className={`tile-badge ${isPositive ? 'badge-positive' : 'badge-negative'}`}>
          {formatPercent(changePercent)}
        </div>
      </div>
    </div>
  );
}

export default PriceTile;
