import type { Candle } from "../types/market";

export type SmartDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface FairValueGap {
  direction: "BULLISH" | "BEARISH";
  startTime: number;
  endTime: number;
  top: number;
  bottom: number;
  midpoint: number;
}

export interface OrderBlock {
  direction: "BULLISH" | "BEARISH";
  time: number;
  high: number;
  low: number;
  midpoint: number;
  strength: number;
}

export interface LiquidityZone {
  type: "BUY_SIDE" | "SELL_SIDE";
  price: number;
  touches: number;
  swept: boolean;
}

export interface MarketStructure {
  bias: SmartDirection;
  swingHigh: number;
  swingLow: number;
  bos: boolean;
  choch: boolean;
  premium: number;
  discount: number;
}

function last<T>(items: T[]) {
  return items[items.length - 1];
}

export function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2];
    const c = candles[i];

    if (c.low > a.high) {
      gaps.push({
        direction: "BULLISH",
        startTime: a.time,
        endTime: c.time,
        top: c.low,
        bottom: a.high,
        midpoint: (c.low + a.high) / 2
      });
    }

    if (c.high < a.low) {
      gaps.push({
        direction: "BEARISH",
        startTime: a.time,
        endTime: c.time,
        top: a.low,
        bottom: c.high,
        midpoint: (a.low + c.high) / 2
      });
    }
  }
  return gaps.slice(-8);
}

export function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  const output: OrderBlock[] = [];
  const lookback = candles.slice(-80);

  for (let i = 2; i < lookback.length - 1; i++) {
    const prev = lookback[i - 1];
    const c = lookback[i];
    const next = lookback[i + 1];
    const body = Math.abs(c.close - c.open);
    const range = Math.max(0.01, c.high - c.low);
    const bodyRatio = body / range;

    const bullishDisplacement = next.close > next.open && next.close > c.high && next.close - next.open > range * 0.6;
    const bearishDisplacement = next.close < next.open && next.close < c.low && next.open - next.close > range * 0.6;

    if (c.close < c.open && bullishDisplacement) {
      output.push({
        direction: "BULLISH",
        time: c.time,
        high: c.high,
        low: c.low,
        midpoint: (c.high + c.low) / 2,
        strength: Math.round(50 + bodyRatio * 50)
      });
    }

    if (c.close > c.open && bearishDisplacement) {
      output.push({
        direction: "BEARISH",
        time: c.time,
        high: c.high,
        low: c.low,
        midpoint: (c.high + c.low) / 2,
        strength: Math.round(50 + bodyRatio * 50)
      });
    }
  }

  return output.slice(-8);
}

export function detectLiquidityZones(candles: Candle[]): LiquidityZone[] {
  const recent = candles.slice(-120);
  const zones: LiquidityZone[] = [];
  const tolerance = recent.length ? recent[recent.length - 1].close * 0.0008 : 1;

  function collect(prices: number[], type: "BUY_SIDE" | "SELL_SIDE") {
    for (const price of prices) {
      const existing = zones.find(z => z.type === type && Math.abs(z.price - price) <= tolerance);
      if (existing) {
        existing.price = (existing.price * existing.touches + price) / (existing.touches + 1);
        existing.touches += 1;
      } else {
        zones.push({ type, price, touches: 1, swept: false });
      }
    }
  }

  collect(recent.map(c => c.high), "BUY_SIDE");
  collect(recent.map(c => c.low), "SELL_SIDE");

  const lastCandle = last(recent);
  if (lastCandle) {
    for (const zone of zones) {
      if (zone.type === "BUY_SIDE" && lastCandle.high > zone.price + tolerance && lastCandle.close < zone.price) zone.swept = true;
      if (zone.type === "SELL_SIDE" && lastCandle.low < zone.price - tolerance && lastCandle.close > zone.price) zone.swept = true;
    }
  }

  return zones.filter(z => z.touches >= 3).sort((a, b) => b.touches - a.touches).slice(0, 8);
}

export function detectMarketStructure(candles: Candle[]): MarketStructure {
  const recent = candles.slice(-80);
  const fallback = last(candles)?.close ?? 0;
  const swingHigh = recent.length ? Math.max(...recent.map(c => c.high)) : fallback;
  const swingLow = recent.length ? Math.min(...recent.map(c => c.low)) : fallback;
  const current = last(recent)?.close ?? fallback;
  const mid = (swingHigh + swingLow) / 2;

  const closes = recent.map(c => c.close);
  const prevHigh = closes.slice(0, -1).length ? Math.max(...closes.slice(0, -1)) : current;
  const prevLow = closes.slice(0, -1).length ? Math.min(...closes.slice(0, -1)) : current;

  const bos = current > prevHigh || current < prevLow;
  const choch = recent.length >= 8
    ? (recent[recent.length - 1].close > recent[recent.length - 4].high) || (recent[recent.length - 1].close < recent[recent.length - 4].low)
    : false;

  return {
    bias: current > mid ? "BULLISH" : current < mid ? "BEARISH" : "NEUTRAL",
    swingHigh,
    swingLow,
    bos,
    choch,
    premium: swingLow + (swingHigh - swingLow) * 0.62,
    discount: swingLow + (swingHigh - swingLow) * 0.38
  };
}

export function summarizeSmartMoney(candles: Candle[]) {
  const fvgs = detectFairValueGaps(candles);
  const orderBlocks = detectOrderBlocks(candles);
  const liquidity = detectLiquidityZones(candles);
  const structure = detectMarketStructure(candles);

  const latestFvg = fvgs[fvgs.length - 1];
  const latestOb = orderBlocks[orderBlocks.length - 1];
  const swept = liquidity.find(z => z.swept);

  return {
    fvgs,
    orderBlocks,
    liquidity,
    structure,
    latestFvg,
    latestOb,
    sweptLiquidity: swept
  };
}
