// Order Flow Data Types

export interface Trade {
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
}

export interface BidAskLevel {
  price: number;
  bidVol: number;
  askVol: number;
}

export interface OrderFlowCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  bidAskData: BidAskLevel[];
  delta: number;
  volume: number;
  cvd?: number; // Cumulative Volume Delta
}

export type Timeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '12h' | '1d' | '1w' | '1M';

export interface FootprintBarStats {
  timestamp: string;
  volume: number;
  delta: number;
  relativeStrength: number;
  cvd: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  chartHeight: number;
  statsHeight: number;
}

