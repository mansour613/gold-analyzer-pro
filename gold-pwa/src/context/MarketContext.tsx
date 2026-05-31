import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchBackendSignal, fetchBackendSignalScan, fetchCandleData, fetchDxyQuote, fetchQuote } from "../services/api";
import type { Candle, Quote, Signal, Timeframe } from "../types/market";

interface MarketContextValue {
  quote: Quote | null;
  dxyQuote: Quote | null;
  candles: Candle[];
  candleMap: Partial<Record<Timeframe, Candle[]>>;
  signal: Signal;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
  dataSource: string;
  dataAgeSeconds: number | null;
  isDataStale: boolean;
  scanAllSignals: () => Promise<Signal[]>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

const emptySignal = (timeframe: Timeframe): Signal => ({
  direction: "NONE",
  timeframe,
  entry: 0,
  stopLoss: 0,
  takeProfit1: 0,
  takeProfit2: 0,
  takeProfit3: 0,
  riskReward: 0,
  confluence: 0,
  confidence: "NONE",
  reasons: ["Waiting for backend signal calibration"],
  indicators: { rsi: 50, ema20: 0, ema200: 0, macdPositive: false },
  generatedAt: Date.now(),
  expiresAt: Date.now() + 120 * 60_000,
  expiryMinutes: 120,
  alignmentScore: 0,
  priceActionSummary: "Waiting for backend candle cache analysis.",
  backtestLite: { samples: 0, winRate: 0 },
  calibration: { marketState: "RANGING", atr: 0, rrOk: false }
});

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [dxyQuote, setDxyQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candleMap, setCandleMap] = useState<Partial<Record<Timeframe, Candle[]>>>({});
  const [signal, setSignal] = useState<Signal>(() => emptySignal("15m"));
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState("");
  const [dataAgeSeconds, setDataAgeSeconds] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextQuote, candleData, nextDxy, backendSignal] = await Promise.all([
        fetchQuote(),
        fetchCandleData(timeframe),
        fetchDxyQuote().catch(() => null),
        fetchBackendSignal(timeframe).catch(() => emptySignal(timeframe))
      ]);

      setQuote(nextQuote);
      setDxyQuote(nextDxy);
      setCandles(candleData.candles);
      setCandleMap(prev => ({ ...prev, [timeframe]: candleData.candles }));
      setSignal(backendSignal);
      setDataSource(candleData.source || nextQuote.source || "backend-feed");
      setDataAgeSeconds(candleData.dataAgeSeconds ?? nextQuote.dataAgeSeconds ?? null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live data unavailable");
      setSignal(emptySignal(timeframe));
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, timeframe === "1m" ? 30000 : timeframe === "5m" ? 60000 : 120000);
    return () => window.clearInterval(timer);
  }, [refresh, timeframe]);

  const staleThresholdSeconds = timeframe === "1m" ? 300 : timeframe === "5m" ? 900 : timeframe === "15m" ? 2400 : timeframe === "30m" ? 4200 : timeframe === "1h" ? 9000 : timeframe === "4h" ? 36000 : timeframe === "1d" ? 172800 : 10 * 24 * 60 * 60;
  const isDataStale = dataAgeSeconds != null ? dataAgeSeconds > staleThresholdSeconds : false;

  const scanAllSignals = useCallback(async () => {
    const results = await fetchBackendSignalScan();
    return results.length ? results : [signal];
  }, [signal]);

  return (
    <MarketContext.Provider value={{ quote, dxyQuote, candles, candleMap, signal, timeframe, setTimeframe, loading, error, refresh, lastUpdated, dataSource, dataAgeSeconds, isDataStale, scanAllSignals }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used inside MarketProvider");
  return context;
}
