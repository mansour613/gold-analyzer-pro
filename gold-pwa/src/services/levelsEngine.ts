import type { Candle } from "../types/market";

export interface SmartLevel {
  kind: "RESISTANCE" | "SUPPORT" | "PIVOT";
  name: string;
  price: number;
  touches: number;
  strength: number;
  distancePercent: number;
}

export function detectSmartLevels(candles: Candle[], currentPrice: number): SmartLevel[] {
  const recent = candles.slice(-180);
  if (!recent.length || !currentPrice) return [];

  const tolerance = currentPrice * 0.0012;
  const buckets: SmartLevel[] = [];

  function add(kind: "RESISTANCE" | "SUPPORT", price: number) {
    const existing = buckets.find(b => b.kind === kind && Math.abs(b.price - price) <= tolerance);
    if (existing) {
      existing.price = (existing.price * existing.touches + price) / (existing.touches + 1);
      existing.touches += 1;
    } else {
      buckets.push({
        kind,
        name: kind === "RESISTANCE" ? "R" : "S",
        price,
        touches: 1,
        strength: 0,
        distancePercent: 0
      });
    }
  }

  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    const isHigh = c.high > recent[i - 1].high && c.high > recent[i - 2].high && c.high > recent[i + 1].high && c.high > recent[i + 2].high;
    const isLow = c.low < recent[i - 1].low && c.low < recent[i - 2].low && c.low < recent[i + 1].low && c.low < recent[i + 2].low;
    if (isHigh) add("RESISTANCE", c.high);
    if (isLow) add("SUPPORT", c.low);
  }

  return buckets
    .filter(level => level.touches >= 2)
    .map(level => ({
      ...level,
      strength: Math.min(100, level.touches * 18),
      distancePercent: ((level.price - currentPrice) / currentPrice) * 100
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 12);
}

export function pivots(high: number, low: number, close: number) {
  const pp = (high + low + close) / 3;
  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  const r2 = pp + (high - low);
  const s2 = pp - (high - low);
  const r3 = high + 2 * (pp - low);
  const s3 = low - 2 * (high - pp);
  return { pp, r1, r2, r3, s1, s2, s3 };
}
