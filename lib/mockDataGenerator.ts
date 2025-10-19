import { OrderFlowCandle, Timeframe, BidAskLevel } from './types';

// Mock data generator for order flow data
export class MockDataGenerator {
  private basePrice = 105000;
  private priceStep = 10; // Price increment per level

  // Generate realistic bid/ask volumes for price levels within a candle
  private generateBidAskLevels(
    open: number,
    high: number,
    low: number,
    close: number
  ): BidAskLevel[] {
    const levels: BidAskLevel[] = [];
    const priceRange = Math.ceil((high - low) / this.priceStep);
    
    for (let i = 0; i <= priceRange; i++) {
      const price = low + (i * this.priceStep);
      if (price > high) break;

      // Generate volumes with some randomness and market dynamics
      const baseVol = Math.floor(Math.random() * 5000) + 500;
      const imbalanceRand = Math.random();
      
      let bidVol: number;
      let askVol: number;

      // Create occasional imbalances (30% chance)
      if (imbalanceRand > 0.7) {
        // Strong bid imbalance
        bidVol = baseVol * (2 + Math.random() * 2);
        askVol = baseVol * (0.3 + Math.random() * 0.4);
      } else if (imbalanceRand < 0.3) {
        // Strong ask imbalance
        bidVol = baseVol * (0.3 + Math.random() * 0.4);
        askVol = baseVol * (2 + Math.random() * 2);
      } else {
        // Balanced
        bidVol = baseVol * (0.8 + Math.random() * 0.4);
        askVol = baseVol * (0.8 + Math.random() * 0.4);
      }

      levels.push({
        price: Math.round(price),
        bidVol: Math.round(bidVol),
        askVol: Math.round(askVol),
      });
    }

    return levels.sort((a, b) => a.price - b.price);
  }

  // Generate a single candle with order flow data
  private generateCandle(timestamp: Date, prevClose: number): OrderFlowCandle {
    // Random walk with some volatility
    const change = (Math.random() - 0.5) * 1000;
    const open = prevClose;
    const close = open + change;
    
    // Generate OHLC
    const volatility = 200 + Math.random() * 300;
    const high = Math.max(open, close) + volatility;
    const low = Math.min(open, close) - volatility;

    // Generate bid/ask data
    const bidAskData = this.generateBidAskLevels(open, high, low, close);

    // Calculate delta and volume
    const delta = bidAskData.reduce((sum, level) => sum + (level.bidVol - level.askVol), 0);
    const volume = bidAskData.reduce((sum, level) => sum + level.bidVol + level.askVol, 0);

    return {
      timestamp: timestamp.toISOString(),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      bidAskData,
      delta: Math.round(delta),
      volume: Math.round(volume),
    };
  }

  // Get time interval in milliseconds for each timeframe
  private getTimeframeMs(timeframe: Timeframe): number {
    const intervals = {
      '1m': 1 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[timeframe];
  }

  // Generate mock historical data
  public generateHistoricalData(
    timeframe: Timeframe,
    barsCount: number = 100
  ): OrderFlowCandle[] {
    const candles: OrderFlowCandle[] = [];
    const intervalMs = this.getTimeframeMs(timeframe);
    const now = new Date();
    let currentPrice = this.basePrice;
    let cumulativeDelta = 0;

    for (let i = barsCount - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervalMs));
      const candle = this.generateCandle(timestamp, currentPrice);
      
      // Calculate CVD
      cumulativeDelta += candle.delta;
      candle.cvd = cumulativeDelta;
      
      candles.push(candle);
      currentPrice = candle.close;
    }

    return candles;
  }

  // Generate a new real-time candle
  public generateRealtimeCandle(
    lastCandle: OrderFlowCandle,
    timeframe: Timeframe
  ): OrderFlowCandle {
    const intervalMs = this.getTimeframeMs(timeframe);
    const lastTimestamp = new Date(lastCandle.timestamp);
    const newTimestamp = new Date(lastTimestamp.getTime() + intervalMs);
    
    const newCandle = this.generateCandle(newTimestamp, lastCandle.close);
    newCandle.cvd = (lastCandle.cvd || 0) + newCandle.delta;
    
    return newCandle;
  }
}

