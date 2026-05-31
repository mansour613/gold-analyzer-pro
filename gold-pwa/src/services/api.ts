import type { Candle, Quote, Signal, Timeframe } from "../types/market";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

const ranges: Record<Timeframe, string> = {
  // Frontend asks for safe windows only. Render keeps the rolling cache and
  // backend levels/analysis endpoints use cached history for calibration.
  "1m": "5d",
  "5m": "1mo",
  "15m": "2mo",
  "30m": "2mo",
  "1h": "3mo",
  "4h": "6mo",
  "1d": "1y",
  "1wk": "5y"
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(apiUrl(url));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }
  return data;
}

export function fetchQuote() {
  return readJson<Quote>("/api/gold/quote");
}

export function fetchDxyQuote() {
  return readJson<Quote>("/api/gold/dxy");
}

export interface CandleDataResponse {
  candles: Candle[];
  source?: string;
  interval?: Timeframe;
  timestamp?: number;
  lastCandleTime?: number;
  dataAgeSeconds?: number;
}

export async function fetchCandleData(timeframe: Timeframe) {
  const data = await readJson<CandleDataResponse>(`/api/gold/candles?interval=${timeframe}&range=${ranges[timeframe]}&_t=${Date.now()}`);
  return { ...data, candles: data.candles || [] };
}

export async function fetchCandles(timeframe: Timeframe) {
  const data = await fetchCandleData(timeframe);
  return data.candles;
}


export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: "low" | "medium" | "high";
  goldRelevant: boolean;
  time: string;
}

export async function fetchEconomicEvents() {
  const data = await readJson<{ events: EconomicEvent[]; source: string; note?: string }>("/api/news/calendar");
  return data.events || [];
}


export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  url: string;
  time: string;
  impact: "low" | "medium" | "high";
  goldRelevant: boolean;
  tags: string[];
}

export async function fetchNewsHeadlines() {
  const data = await readJson<{ headlines: NewsHeadline[]; source: string; errors?: string[] }>("/api/news/headlines");
  return data.headlines || [];
}


export interface AiAnalysisPayload {
  strategy?: string;
  strategyLabel?: string;
  importance?: string;
  goldOnly?: boolean;
  language?: "en" | "ar";
  quote?: unknown;
  signal?: unknown;
  timeframe?: Timeframe;
  recentCandles?: Candle[];
  events?: EconomicEvent[];
  headlines?: NewsHeadline[];
}

export interface AiAnalysisResult {
  provider?: string;
  bias?: string;
  confidence?: number;
  summary?: string;
  points?: string[];
  riskNote?: string;
  error?: string;
  details?: string;
}

export async function runAiNewsAnalysis(payload: AiAnalysisPayload) {
  const response = await fetch(apiUrl("/api/ai/analysis"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.details || data?.error || `AI request failed: ${response.status}`);
  }
  return data as AiAnalysisResult;
}

export interface BackendLevelResult {
  price: number;
  interval: Timeframe;
  source?: string;
  lastCandleTime?: number;
  reference: { high: number; low: number; close: number };
  summary: { current: number; nearestResistance: number; nearestSupport: number; range: number; bias: string };
  nearestAction: { side: string; level: number; distance: number; text: string };
  pivots: Array<{ name: string; value: number; type: string; distance: number }>;
  smartLevels: Array<{ kind: string; price: number; strength: number; touches: number }>;
  fibonacci: { trend: string; levels: Array<{ ratio: number; price: number; confluence?: string | null; strength?: string }>; currentZone?: { ratio: number; price: number; confluence?: string | null; strength?: string } | null };
  sessions: { asia: { high: number; low: number } | null; london: { high: number; low: number } | null; ny: { high: number; low: number } | null };
  debug?: { candlesUsed?: number; cacheStatus?: string; feedStatus?: string };
}

export function fetchBackendLevels(timeframe: Timeframe) {
  return readJson<BackendLevelResult>(`/api/gold/levels?interval=${timeframe}&_t=${Date.now()}`);
}

export interface BackendAnalysisResult {
  price: number;
  interval: Timeframe;
  source?: string;
  lastCandleTime?: number;
  summary: { bias: string; confidence: number; marketState: string; momentum: string; structure: string; currentWave: string };
  priceAction: string;
  levels: { support: number; resistance: number };
  indicators: { ema20: number; ema50: number; rsi: number; atr: number };
  fibonacci: BackendLevelResult["fibonacci"];
  dxy: { bias: string; changePercent: number | null };
  reopenOutlook: string;
  debug?: { candlesUsed?: number; cacheStatus?: string; feedStatus?: string };
}

export function fetchBackendAnalysis(timeframe: Timeframe) {
  return readJson<BackendAnalysisResult>(`/api/gold/analysis?interval=${timeframe}&_t=${Date.now()}`);
}


export function fetchBackendSignal(timeframe: Timeframe) {
  return readJson<Signal>(`/api/gold/signal?interval=${timeframe}&_t=${Date.now()}`);
}

export async function fetchBackendSignalScan() {
  const data = await readJson<{ signals: Signal[]; timestamp: number }>(`/api/gold/signals/scan?_t=${Date.now()}`);
  return data.signals || [];
}
