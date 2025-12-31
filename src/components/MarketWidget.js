import React from 'react';
import PriceTile from './PriceTile';
import useMarketData from '../hooks/useMarketData';
import '../styles/MarketWidget.css';

/**
 * MarketWidget Component - Citadel Gold Design
 *
 * Four price tiles in horizontal layout matching the design:
 * - Gold (OZ) - golden background
 * - Silver (OZ) - silver/gray background
 * - S&P 500 - blue/teal background
 * - DOW - darker teal background
 */
function MarketWidget() {
  const {
    data,
    loading,
    updatedTiles,
  } = useMarketData(30000);

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="market-widget">
        <div className="widget-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="price-tile price-tile--skeleton">
              <div className="tile-header">
                <div className="skeleton-text"></div>
              </div>
              <div className="tile-body">
                <div className="skeleton-price"></div>
                <div className="skeleton-change"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="market-widget">
      <div className="widget-grid">
        <PriceTile
          name="GOLD (OZ)"
          price={data?.gold?.price}
          changePercent={data?.gold?.changePercent}
          variant="gold"
          isUpdated={updatedTiles.gold}
          showDollarSign={true}
        />

        <PriceTile
          name="SILVER (OZ)"
          price={data?.silver?.price}
          changePercent={data?.silver?.changePercent}
          variant="silver"
          isUpdated={updatedTiles.silver}
          showDollarSign={true}
        />

        <PriceTile
          name="S&P 500"
          price={data?.sp500?.price}
          changePercent={data?.sp500?.changePercent}
          variant="blue"
          isUpdated={updatedTiles.sp500}
          showDollarSign={false}
        />

        <PriceTile
          name="DOW"
          price={data?.dow?.price}
          changePercent={data?.dow?.changePercent}
          variant="teal"
          isUpdated={updatedTiles.dow}
          showDollarSign={false}
        />
      </div>
    </div>
  );
}

export default MarketWidget;
