export type Language = "en" | "ar";
export type Page = "chart" | "signals" | "levels" | "waves" | "ai";
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1wk";
export type Direction = "LONG" | "SHORT" | "NONE";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  symbol: string;
  timestamp: number;
  source?: string;
  dataAgeSeconds?: number;
  feedStatus?: "LIVE" | "DELAYED" | "STALE" | "FALLBACK" | "INVALID";
  feedConfidence?: number;
  verifiedSources?: string[];
  fallbackReason?: string;
  marketClosedFallback?: boolean;
}

export interface Signal {
  direction: Direction;
  timeframe: Timeframe;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  confluence: number;
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  indicators: {
    rsi: number;
    ema20: number;
    ema200: number;
    macdPositive: boolean;
  };
  generatedAt?: number;
  expiresAt?: number;
  expiryMinutes?: number;
  alignmentScore?: number;
  priceActionSummary?: string;
  backtestLite?: { samples: number; winRate: number };
  calibration?: {
    marketState: "TRENDING" | "RANGING" | "BREAKOUT";
    nearestSupport?: number;
    nearestResistance?: number;
    atr: number;
    rrOk: boolean;
    htfBias?: Direction;
  };
}
