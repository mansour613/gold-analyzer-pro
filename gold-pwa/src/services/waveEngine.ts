import type { Candle } from "../types/market";

export interface WavePoint {
  label: string;
  time: number;
  price: number;
}

export interface WaveAnalysis {
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  currentWave: string;
  nextWave: string;
  points: WavePoint[];
  projection: number | null;
}

export function detectWaves(candles: Candle[]): WaveAnalysis {
  const recent = candles.slice(-140);
  if (recent.length < 20) {
    return { trend: "NEUTRAL", confidence: 0, currentWave: "-", nextWave: "-", points: [], projection: null };
  }

  const pivots: WavePoint[] = [];
  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    const highPivot = c.high > recent[i - 1].high && c.high > recent[i - 2].high && c.high > recent[i + 1].high && c.high > recent[i + 2].high;
    const lowPivot = c.low < recent[i - 1].low && c.low < recent[i - 2].low && c.low < recent[i + 1].low && c.low < recent[i + 2].low;
    if (highPivot) pivots.push({ label: "H", time: c.time, price: c.high });
    if (lowPivot) pivots.push({ label: "L", time: c.time, price: c.low });
  }

  const points = pivots.slice(-6).map((p, i) => ({ ...p, label: String(i) }));
  const first = points[0];
  const last = points[points.length - 1];
  const trend = first && last ? (last.price > first.price ? "BULLISH" : last.price < first.price ? "BEARISH" : "NEUTRAL") : "NEUTRAL";
  const currentWave = points.length >= 5 ? "5" : String(points.length || "-");
  const nextWave = points.length >= 5 ? "A" : String(points.length + 1);
  const projection = points.length >= 2
    ? last.price + (last.price - points[points.length - 2].price) * 0.618
    : null;

  return {
    trend,
    confidence: Math.min(88, points.length * 14),
    currentWave,
    nextWave,
    points,
    projection
  };
}
