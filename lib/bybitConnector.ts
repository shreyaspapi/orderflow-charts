import { OrderFlowCandle, Timeframe, BidAskLevel } from './types';

interface BybitTrade {
  T: number;      // timestamp
  s: string;      // symbol
  S: string;      // side (Buy/Sell)
  v: string;      // volume
  p: string;      // price
  L: string;      // tickDirection
  i: string;      // trade ID
  BT: boolean;    // blockTrade
}

interface BybitKline {
  start: number;
  end: number;
  interval: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  turnover: string;
  confirm: boolean;
  timestamp: number;
}

export class BybitConnector {
  private symbol: string = 'BTCUSDT';
  private ws: WebSocket | null = null;
  private trades: BybitTrade[] = [];
  private onCandleUpdate?: (candle: OrderFlowCandle) => void;
  private currentCandle: OrderFlowCandle | null = null;
  private timeframe: Timeframe = '15m';
  private candleStartTime: number = 0;

  constructor(symbol: string = 'BTCUSDT') {
    this.symbol = symbol;
  }

  // Convert timeframe to milliseconds
  private getTimeframeMs(timeframe: Timeframe): number {
    const intervals = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
    };
    return intervals[timeframe];
  }

  // Convert timeframe to Bybit interval format
  private getBybitInterval(timeframe: Timeframe): string {
    const intervals = {
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
    };
    return intervals[timeframe];
  }

  // Fetch historical klines
  async fetchHistoricalData(timeframe: Timeframe, limit: number = 100): Promise<OrderFlowCandle[]> {
    try {
      const interval = this.getBybitInterval(timeframe);
      const endTime = Date.now();
      const startTime = endTime - (limit * this.getTimeframeMs(timeframe));

      const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${this.symbol}&interval=${interval}&start=${startTime}&end=${endTime}&limit=${limit}`;
      
      console.log('Fetching from Bybit:', url);
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(`Bybit API error: ${data.retMsg}`);
      }

      // Parse klines into candles
      const klines = data.result.list.reverse(); // Bybit returns newest first
      const candles: OrderFlowCandle[] = [];
      let cumulativeDelta = 0;

      for (let i = 0; i < klines.length; i++) {
        const kline = klines[i];
        const [timestamp, open, high, low, close, volume] = kline;

        // Fetch trades for this candle to calculate bid/ask volumes
        const candleStart = parseInt(timestamp);
        const candleEnd = candleStart + this.getTimeframeMs(timeframe);
        
        // For historical data, we'll generate approximate bid/ask data based on price action
        // In real-time, we'll use actual trade data
        const bidAskData = this.generateApproximateBidAsk(
          parseFloat(open),
          parseFloat(high),
          parseFloat(low),
          parseFloat(close),
          parseFloat(volume)
        );

        const delta = bidAskData.reduce((sum, level) => sum + (level.bidVol - level.askVol), 0);
        const totalVolume = bidAskData.reduce((sum, level) => sum + level.bidVol + level.askVol, 0);
        cumulativeDelta += delta;

        candles.push({
          timestamp: new Date(candleStart).toISOString(),
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          bidAskData,
          delta: Math.round(delta),
          volume: Math.round(totalVolume),
          cvd: Math.round(cumulativeDelta),
        });
      }

      return candles;
    } catch (error) {
      console.error('Error fetching Bybit data:', error);
      throw error;
    }
  }

  // Generate approximate bid/ask data based on OHLC and volume
  private generateApproximateBidAsk(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number
  ): BidAskLevel[] {
    const levels: BidAskLevel[] = [];
    const priceStep = 10; // $10 increments for BTC
    const range = high - low;
    const numLevels = Math.ceil(range / priceStep);
    
    // Distribute volume across price levels
    const volumePerLevel = volume / numLevels;
    const isBullish = close > open;

    for (let i = 0; i <= numLevels; i++) {
      const price = Math.round(low + (i * priceStep));
      if (price > high) break;

      // Weight bid/ask based on price position and direction
      const pricePosition = (price - low) / range; // 0 to 1
      let bidRatio = 0.5;

      if (isBullish) {
        // More buying at lower prices, pushing price up
        bidRatio = 0.4 + (1 - pricePosition) * 0.4; // 0.4 to 0.8
      } else {
        // More selling at higher prices, pushing price down
        bidRatio = 0.2 + (1 - pricePosition) * 0.4; // 0.2 to 0.6
      }

      const bidVol = Math.round(volumePerLevel * bidRatio);
      const askVol = Math.round(volumePerLevel * (1 - bidRatio));

      levels.push({
        price,
        bidVol: Math.max(bidVol, 100),
        askVol: Math.max(askVol, 100),
      });
    }

    return levels;
  }

  // Subscribe to real-time trade updates via WebSocket
  subscribeRealtime(
    timeframe: Timeframe,
    onUpdate: (candle: OrderFlowCandle) => void,
    lastCandle?: OrderFlowCandle
  ): void {
    this.timeframe = timeframe;
    this.onCandleUpdate = onUpdate;
    this.currentCandle = lastCandle || null;
    this.candleStartTime = Math.floor(Date.now() / this.getTimeframeMs(timeframe)) * this.getTimeframeMs(timeframe);

    // Connect to Bybit WebSocket
    this.ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');

    this.ws.onopen = () => {
      console.log('Connected to Bybit WebSocket');
      
      // Subscribe to trade stream
      this.ws?.send(JSON.stringify({
        op: 'subscribe',
        args: [`publicTrade.${this.symbol}`]
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.topic === `publicTrade.${this.symbol}`) {
          const trades = message.data;
          this.processTrades(trades);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.onCandleUpdate) {
          this.subscribeRealtime(timeframe, this.onCandleUpdate, this.currentCandle || undefined);
        }
      }, 5000);
    };
  }

  // Process incoming trades and aggregate into candles
  private processTrades(trades: BybitTrade[]): void {
    const timeframeMs = this.getTimeframeMs(this.timeframe);
    
    trades.forEach(trade => {
      const tradeTime = trade.T;
      const currentCandleStart = Math.floor(tradeTime / timeframeMs) * timeframeMs;

      // Check if we need to start a new candle
      if (currentCandleStart > this.candleStartTime) {
        // Finalize and emit the previous candle
        if (this.currentCandle) {
          this.onCandleUpdate?.(this.currentCandle);
        }

        // Start new candle
        this.candleStartTime = currentCandleStart;
        const price = parseFloat(trade.p);
        
        this.currentCandle = {
          timestamp: new Date(currentCandleStart).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          bidAskData: [],
          delta: 0,
          volume: 0,
          cvd: this.currentCandle?.cvd || 0,
        };
      }

      // Update current candle with trade data
      if (this.currentCandle) {
        const price = parseFloat(trade.p);
        const volume = parseFloat(trade.v);
        const side = trade.S; // 'Buy' or 'Sell'

        // Update OHLC
        this.currentCandle.high = Math.max(this.currentCandle.high, price);
        this.currentCandle.low = Math.min(this.currentCandle.low, price);
        this.currentCandle.close = price;

        // Update bid/ask data
        this.updateBidAskData(Math.round(price), volume, side);

        // Recalculate delta and volume
        this.recalculateMetrics();

        // Emit updated candle
        this.onCandleUpdate?.({ ...this.currentCandle });
      }
    });
  }

  // Update bid/ask volumes for a price level
  private updateBidAskData(price: number, volume: number, side: string): void {
    if (!this.currentCandle) return;

    // Find or create price level
    const existingLevel = this.currentCandle.bidAskData.find(l => l.price === price);
    
    if (!existingLevel) {
      const newLevel = { price, bidVol: 0, askVol: 0 };
      this.currentCandle.bidAskData.push(newLevel);
      
      // Update volume based on trade side
      if (side === 'Buy') {
        newLevel.bidVol += volume;
      } else {
        newLevel.askVol += volume;
      }
    } else {
      // Update volume based on trade side
      if (side === 'Buy') {
        existingLevel.bidVol += volume;
      } else {
        existingLevel.askVol += volume;
      }
    }
  }

  // Recalculate delta and volume metrics
  private recalculateMetrics(): void {
    if (!this.currentCandle) return;

    const delta = this.currentCandle.bidAskData.reduce(
      (sum, level) => sum + (level.bidVol - level.askVol), 
      0
    );
    
    const volume = this.currentCandle.bidAskData.reduce(
      (sum, level) => sum + level.bidVol + level.askVol, 
      0
    );

    const previousCvd = (this.currentCandle.cvd || 0) - (this.currentCandle.delta || 0);
    
    this.currentCandle.delta = Math.round(delta);
    this.currentCandle.volume = Math.round(volume);
    this.currentCandle.cvd = Math.round(previousCvd + delta);
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

