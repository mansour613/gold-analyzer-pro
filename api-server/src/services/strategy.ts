import type { Candle, Quote } from "./marketData.js";

export type Direction = "LONG" | "SHORT" | "NONE";

function clean(candles: Candle[]) {
  return [...candles].filter(c => Number.isFinite(c.close) && c.close > 0).sort((a,b)=>a.time-b.time);
}

export function avgRange(candles: Candle[], period = 14) {
  const rows = clean(candles).slice(-period);
  if (!rows.length) return 0;
  return rows.reduce((sum,c)=>sum + Math.abs(c.high-c.low), 0) / rows.length;
}

export function ema(values: number[], period: number) {
  if (!values.length) return [] as number[];
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i-1] * (1-k)));
  return out;
}

export function rsi(closes: number[], period = 14) {
  if (closes.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i-1];
    if (diff >= 0) gains += diff; else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function pivots(high: number, low: number, close: number) {
  const pp = (high + low + close) / 3;
  const range = high - low;
  return {
    pp,
    r1: 2 * pp - low,
    s1: 2 * pp - high,
    r2: pp + range,
    s2: pp - range,
    r3: high + 2 * (pp - low),
    s3: low - 2 * (high - pp)
  };
}

function groupByUtcDay(candles: Candle[]) {
  const groups = new Map<string, Candle[]>();
  for (const c of clean(candles)) {
    const key = new Date(c.time).toISOString().slice(0,10);
    const arr = groups.get(key) || [];
    arr.push(c); groups.set(key, arr);
  }
  return Array.from(groups.entries()).sort(([a],[b])=>a.localeCompare(b));
}

function ohlc(rows: Candle[]) {
  const sorted = clean(rows);
  if (!sorted.length) return null;
  return { high: Math.max(...sorted.map(c=>c.high)), low: Math.min(...sorted.map(c=>c.low)), close: sorted[sorted.length-1].close, open: sorted[0].open };
}

export function referenceOhlc(candles: Candle[], interval: string, quote: Quote, mode: "latest" | "previous" = "previous") {
  const sorted = clean(candles);
  const fallback = { high: quote.dayHigh || quote.price, low: quote.dayLow || quote.price, close: quote.price, open: quote.price };
  if (sorted.length < 1) return fallback;

  // Daily/weekly pivot references should come from completed higher-timeframe
  // candles. The Levels page passes daily/weekly candle bundles from the backend
  // so pivots are not accidentally calculated from the tiny selected timeframe
  // range (for example one 15M candle).
  if (interval === "1d") {
    const days = groupByUtcDay(sorted);
    const rows = mode === "latest" ? days[days.length - 1]?.[1] : (days[days.length - 2]?.[1] || days[days.length - 1]?.[1]);
    return ohlc(rows || sorted) || fallback;
  }
  if (interval === "1wk") {
    const bucket = new Map<string, Candle[]>();
    for (const c of sorted) {
      const d = new Date(c.time);
      const day = d.getUTCDay() || 7;
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));
      const key = monday.toISOString().slice(0,10);
      const arr = bucket.get(key) || []; arr.push(c); bucket.set(key, arr);
    }
    const weeks = Array.from(bucket.entries()).sort(([a],[b])=>a.localeCompare(b));
    const rows = mode === "latest" ? weeks[weeks.length - 1]?.[1] : (weeks[weeks.length - 2]?.[1] || weeks[weeks.length - 1]?.[1]);
    return ohlc(rows || sorted) || fallback;
  }

  const days = groupByUtcDay(sorted);
  const rows = mode === "latest" ? days[days.length - 1]?.[1] : (days.length >= 2 ? days[days.length - 2][1] : sorted.slice(-96));
  return ohlc(rows) || fallback;
}

function latestTradingDayRows(candles: Candle[]) {
  const groups = groupByUtcDay(candles).filter(([,rows])=>rows.length >= 3);
  return groups[groups.length - 1]?.[1] || clean(candles).slice(-96);
}

export function sessionLevels(candles: Candle[]) {
  const rows = latestTradingDayRows(candles);
  const session = (start: number, end: number) => {
    const selected = rows.filter(c => {
      const h = new Date(c.time).getUTCHours();
      return start <= end ? h >= start && h < end : h >= start || h < end;
    });
    const x = ohlc(selected);
    return x ? { high: Number(x.high.toFixed(2)), low: Number(x.low.toFixed(2)) } : null;
  };
  return { asia: session(0,8), london: session(7,16), ny: session(13,22) };
}

function swingPoints(candles: Candle[], lookback = 160) {
  const rows = clean(candles).slice(-lookback);
  const highs: Array<{ price:number; time:number; touches:number }> = [];
  const lows: Array<{ price:number; time:number; touches:number }> = [];
  for (let i = 2; i < rows.length - 2; i++) {
    const c = rows[i];
    if (c.high >= rows[i-1].high && c.high >= rows[i-2].high && c.high >= rows[i+1].high && c.high >= rows[i+2].high) highs.push({price:c.high,time:c.time,touches:1});
    if (c.low <= rows[i-1].low && c.low <= rows[i-2].low && c.low <= rows[i+1].low && c.low <= rows[i+2].low) lows.push({price:c.low,time:c.time,touches:1});
  }
  return { highs, lows };
}

export function smartSupportResistance(candles: Candle[], price: number) {
  const { highs, lows } = swingPoints(candles, 220);
  const tolerance = Math.max(avgRange(candles, 20), price * 0.0015);
  const merge = (items: Array<{price:number;time:number;touches:number}>, kind: "RESISTANCE"|"SUPPORT") => {
    const clusters: Array<{ price:number; time:number; touches:number; kind:"RESISTANCE"|"SUPPORT"; strength:number }> = [];
    for (const item of items) {
      const found = clusters.find(c => Math.abs(c.price - item.price) <= tolerance);
      if (found) {
        found.price = (found.price * found.touches + item.price) / (found.touches + 1);
        found.touches += 1;
        found.time = Math.max(found.time, item.time);
      } else clusters.push({ ...item, kind, strength: 35 });
    }
    return clusters.map(c => ({...c, price:Number(c.price.toFixed(2)), strength: Math.min(95, 35 + c.touches * 12 + (Date.now()-c.time < 14*24*3600_000 ? 10 : 0))}));
  };
  return [...merge(highs, "RESISTANCE"), ...merge(lows, "SUPPORT")]
    .filter(l => Math.abs(l.price - price) <= Math.max(120, price * 0.04))
    .sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price));
}

export function fibonacciConfluence(candles: Candle[], price: number, levels: Array<{name:string;value:number}>) {
  const rows = clean(candles).slice(-180);
  if (rows.length < 20) return { trend: "NONE", levels: [] as any[], currentZone: null as any };
  const closes = rows.map(c=>c.close);
  const e = ema(closes, Math.min(50, closes.length-1));
  const bullish = closes[closes.length-1] >= e[e.length-1];
  const recentHigh = rows.reduce((m,c)=>c.high>m.high?c:m, rows[0]);
  const recentLow = rows.reduce((m,c)=>c.low<m.low?c:m, rows[0]);
  const high = recentHigh.high, low = recentLow.low;
  const range = Math.max(0.01, high-low);
  const ratios = [0.236,0.382,0.5,0.618,0.786];
  const fibs = ratios.map(ratio => {
    const fibPrice = bullish ? high - range * ratio : low + range * ratio;
    const near = levels.find(l => Math.abs(l.value - fibPrice) <= Math.max(avgRange(rows,14), price*0.0015));
    return { ratio, price: Number(fibPrice.toFixed(2)), confluence: near ? near.name : null, strength: near ? "Strong" : Math.abs(fibPrice-price) < avgRange(rows,14)*2 ? "Medium" : "Weak" };
  });
  const currentZone = fibs.reduce((best, f)=>Math.abs(f.price-price) < Math.abs(best.price-price) ? f : best, fibs[0]);
  return { trend: bullish ? "BULLISH" : "BEARISH", levels: fibs, currentZone };
}

export function marketState(candles: Candle[]) {
  const rows = clean(candles);
  if (rows.length < 20) return "RANGING";
  const ranges = rows.slice(-20).map(c=>c.high-c.low);
  const avg = ranges.reduce((a,b)=>a+b,0)/ranges.length;
  const last = ranges[ranges.length-1];
  const closes = rows.map(c=>c.close);
  const e20 = ema(closes, Math.min(20, closes.length-1)).slice(-1)[0] || closes[closes.length-1];
  const e50 = ema(closes, Math.min(50, closes.length-1)).slice(-1)[0] || e20;
  if (last > avg * 1.7) return "BREAKOUT";
  if (Math.abs(e20-e50) > avg * 0.8) return "TRENDING";
  return "RANGING";
}

export function buildLevelResult(
  candles: Candle[],
  quote: Quote,
  interval: string,
  context: { dailyCandles?: Candle[]; weeklyCandles?: Candle[] } = {}
) {
  const price = quote.price || clean(candles).slice(-1)[0]?.close || 0;
  const pivotSource = ["1m", "5m", "15m", "30m", "1h", "4h"].includes(interval)
    ? (context.dailyCandles?.length ? context.dailyCandles : candles)
    : interval === "1d"
      ? (context.weeklyCandles?.length ? context.weeklyCandles : candles)
      : (context.weeklyCandles?.length ? context.weeklyCandles : candles);
  const pivotInterval = ["1m", "5m", "15m", "30m", "1h", "4h"].includes(interval) ? "1d" : "1wk";
  const ref = referenceOhlc(pivotSource, pivotInterval, quote, "latest");
  const pv = pivots(ref.high, ref.low, ref.close);
  const pivotLevels = [
    { name:"R3", value:pv.r3, type:"resistance" },{ name:"R2", value:pv.r2, type:"resistance" },{ name:"R1", value:pv.r1, type:"resistance" },
    { name:"PP", value:pv.pp, type:"pivot" },{ name:"S1", value:pv.s1, type:"support" },{ name:"S2", value:pv.s2, type:"support" },{ name:"S3", value:pv.s3, type:"support" }
  ].map(l => ({ ...l, value:Number(l.value.toFixed(2)), distance:Number((l.value-price).toFixed(1)) }));
  const sr = smartSupportResistance(candles, price).slice(0,8);
  const resistances = sr.filter(l=>l.kind === "RESISTANCE" && l.price > price).sort((a,b)=>a.price-b.price);
  const supports = sr.filter(l=>l.kind === "SUPPORT" && l.price < price).sort((a,b)=>b.price-a.price);
  const nearestResistance = resistances[0]?.price || pivotLevels.find(l=>l.name==="R1")!.value;
  const nearestSupport = supports[0]?.price || pivotLevels.find(l=>l.name==="S1")!.value;
  const fib = fibonacciConfluence(candles, price, pivotLevels.map(l=>({name:l.name,value:l.value})));
  const nearestIsResistance = Math.abs(nearestResistance-price) <= Math.abs(price-nearestSupport);
  return {
    price:Number(price.toFixed(2)), interval, source: quote.source, lastCandleTime: clean(candles).slice(-1)[0]?.time || quote.timestamp,
    reference: { high:Number(ref.high.toFixed(2)), low:Number(ref.low.toFixed(2)), close:Number(ref.close.toFixed(2)) },
    summary: { current:Number(price.toFixed(2)), nearestResistance, nearestSupport, range:Number((nearestResistance-nearestSupport).toFixed(1)), bias: price > pv.pp ? "BULLISH" : price < pv.pp ? "BEARISH" : "NEUTRAL" },
    nearestAction: { side: nearestIsResistance ? "RESISTANCE" : "SUPPORT", level: nearestIsResistance ? nearestResistance : nearestSupport, distance:Number(Math.abs((nearestIsResistance?nearestResistance-price:price-nearestSupport)).toFixed(1)), text: nearestIsResistance ? "Potential resistance ahead" : "Support holding nearby" },
    pivots: pivotLevels,
    smartLevels: sr,
    fibonacci: fib,
    sessions: sessionLevels(candles),
    debug: { candlesUsed: clean(candles).length, cacheStatus: quote.marketClosedFallback ? "LAST_CLOSED" : "LIVE_OR_DELAYED", feedStatus: quote.feedStatus }
  };
}

export function buildAnalysisResult(candles: Candle[], quote: Quote, interval: string, dxyQuote?: Quote | null) {
  const rows = clean(candles);
  const closes = rows.map(c=>c.close);
  const price = quote.price || rows[rows.length-1]?.close || 0;
  const e20 = ema(closes, Math.min(20, Math.max(2, closes.length-1))).slice(-1)[0] || price;
  const e50 = ema(closes, Math.min(50, Math.max(2, closes.length-1))).slice(-1)[0] || e20;
  const r = rsi(closes, 14);
  const state = marketState(rows);
  const sr = smartSupportResistance(rows, price);
  const resistance = sr.find(l=>l.kind==="RESISTANCE" && l.price>price)?.price || price + avgRange(rows,14)*3;
  const support = sr.find(l=>l.kind==="SUPPORT" && l.price<price)?.price || price - avgRange(rows,14)*3;
  const bias: "BULLISH"|"BEARISH"|"NEUTRAL" = e20 > e50 && price > e20 ? "BULLISH" : e20 < e50 && price < e20 ? "BEARISH" : "NEUTRAL";
  const confidence = Math.min(95, Math.max(35, 50 + (bias !== "NEUTRAL" ? 18 : 0) + (state === "TRENDING" ? 12 : 0) + (r > 55 || r < 45 ? 8 : 0)));
  const fib = fibonacciConfluence(rows, price, sr.slice(0,4).map((l,i)=>({name:`SR${i+1}`,value:l.price})));
  const dxyBias = dxyQuote ? (dxyQuote.changePercent > 0.03 ? "BULLISH" : dxyQuote.changePercent < -0.03 ? "BEARISH" : "NEUTRAL") : "NEUTRAL";
  const expected = bias === "BULLISH" ? `Gold is holding above nearby support near ${support.toFixed(2)}. Break above ${resistance.toFixed(2)} supports continuation.` : bias === "BEARISH" ? `Gold is trading below resistance near ${resistance.toFixed(2)}. Failure to reclaim it keeps downside risk toward ${support.toFixed(2)}.` : `Gold is balanced between ${support.toFixed(2)} support and ${resistance.toFixed(2)} resistance. Wait for breakout confirmation.`;
  return {
    price:Number(price.toFixed(2)), interval, source: quote.source, lastCandleTime: rows[rows.length-1]?.time || quote.timestamp,
    summary: { bias, confidence, marketState: state, momentum: r >= 55 ? "BULLISH" : r <= 45 ? "BEARISH" : "NEUTRAL", structure: bias === "BULLISH" ? "HH → HL" : bias === "BEARISH" ? "LH → LL" : "Range", currentWave: bias === "BULLISH" ? "W3" : bias === "BEARISH" ? "C" : "-" },
    priceAction: expected,
    levels: { support:Number(support.toFixed(2)), resistance:Number(resistance.toFixed(2)) },
    indicators: { ema20:Number(e20.toFixed(2)), ema50:Number(e50.toFixed(2)), rsi:Number(r.toFixed(1)), atr:Number(avgRange(rows,14).toFixed(2)) },
    fibonacci: fib,
    dxy: { bias: dxyBias, changePercent: dxyQuote?.changePercent ?? null },
    reopenOutlook: expected,
    debug: { candlesUsed: rows.length, cacheStatus: quote.marketClosedFallback ? "LAST_CLOSED" : "LIVE_OR_DELAYED", feedStatus: quote.feedStatus }
  };
}


export type BackendSignalDirection = "LONG" | "SHORT" | "NONE";

const signalExpiryMinutes: Record<string, number> = {
  "1m": 20,
  "5m": 45,
  "15m": 120,
  "30m": 240,
  "1h": 360,
  "4h": 1440,
  "1d": 4320,
  "1wk": 10080
};

export function trendBias(candles: Candle[]): BackendSignalDirection {
  const rows = clean(candles);
  const last = rows[rows.length - 1];
  if (!last || rows.length < 20) return "NONE";
  const closes = rows.map(c => c.close);
  const e20 = ema(closes, Math.min(20, rows.length - 1)).slice(-1)[0] || last.close;
  const e50 = ema(closes, Math.min(50, Math.max(12, rows.length - 1))).slice(-1)[0] || e20;
  const e200 = ema(closes, Math.min(200, Math.max(30, rows.length - 1))).slice(-1)[0] || e50;
  const rv = rsi(closes, 14);
  if (last.close > e20 && e20 >= e50 && last.close >= e200 && rv >= 50) return "LONG";
  if (last.close < e20 && e20 <= e50 && last.close <= e200 && rv <= 50) return "SHORT";
  return "NONE";
}

function signalGrade(score: number) {
  if (score >= 75) return "HIGH";
  if (score >= 55) return "MEDIUM";
  if (score > 0) return "LOW";
  return "NONE";
}

function backtestLiteServer(candles: Candle[], direction: BackendSignalDirection, currentRsi: number) {
  const rows = clean(candles);
  if (direction === "NONE" || rows.length < 80) return { samples: 0, winRate: 0 };
  let samples = 0, wins = 0;
  for (let i = 30; i < rows.length - 8; i++) {
    const closes = rows.slice(0, i + 1).map(c => c.close);
    const localRsi = rsi(closes, 14);
    if (Math.abs(localRsi - currentRsi) > 7) continue;
    const entry = rows[i].close;
    const future = rows.slice(i + 1, i + 9);
    const move = direction === "LONG" ? Math.max(...future.map(c => c.high)) - entry : entry - Math.min(...future.map(c => c.low));
    const adverse = direction === "LONG" ? entry - Math.min(...future.map(c => c.low)) : Math.max(...future.map(c => c.high)) - entry;
    samples += 1;
    if (move > adverse * 1.2) wins += 1;
    if (samples >= 40) break;
  }
  return { samples, winRate: samples ? Math.round((wins / samples) * 100) : 0 };
}

export function buildSignalResult(
  candles: Candle[],
  quote: Quote,
  interval: string,
  context: { higherTimeframeBias?: BackendSignalDirection; alignmentScore?: number; dxyChangePercent?: number; highImpactNewsSoon?: boolean } = {}
) {
  const rows = clean(candles);
  const last = rows[rows.length - 1];
  const generatedAt = Date.now();
  const expiryMinutes = signalExpiryMinutes[interval] || 120;

  if (!last || rows.length < 30) {
    return {
      direction: "NONE",
      timeframe: interval,
      entry: 0,
      stopLoss: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      takeProfit3: 0,
      riskReward: 0,
      confluence: 0,
      confidence: "NONE",
      reasons: ["Not enough real candle history for this timeframe"],
      indicators: { rsi: 50, ema20: 0, ema200: 0, macdPositive: false },
      generatedAt,
      expiresAt: generatedAt + expiryMinutes * 60_000,
      expiryMinutes,
      alignmentScore: context.alignmentScore || 0,
      priceActionSummary: "Waiting for enough real candles to calibrate price action.",
      backtestLite: { samples: 0, winRate: 0 },
      calibration: { marketState: "RANGING", atr: 0, rrOk: false, htfBias: context.higherTimeframeBias },
      debug: { source: quote.source, candlesUsed: rows.length, lastCandleTime: last?.time || quote.timestamp, feedStatus: quote.feedStatus }
    };
  }

  const price = quote.price || last.close;
  const closes = rows.map(c => c.close);
  const e20 = ema(closes, Math.min(20, rows.length - 1)).slice(-1)[0] || price;
  const e50 = ema(closes, Math.min(50, Math.max(12, rows.length - 1))).slice(-1)[0] || e20;
  const e200 = ema(closes, Math.min(200, Math.max(30, rows.length - 1))).slice(-1)[0] || e50;
  const rv = rsi(closes, 14);
  const atrValue = avgRange(rows, 14) || price * 0.002;
  const prev = rows[rows.length - 2];
  const state = marketState(rows);
  const sr = smartSupportResistance(rows, price);
  const support = sr.find(l => l.kind === "SUPPORT" && l.price < price)?.price || Math.min(...rows.slice(-80).map(c => c.low));
  const resistance = sr.find(l => l.kind === "RESISTANCE" && l.price > price)?.price || Math.max(...rows.slice(-80).map(c => c.high));

  let bull = 0, bear = 0;
  const reasons: string[] = ["Generated by backend from Render rolling candle cache"];
  const penalties: string[] = [];

  if (price > e20 && e20 > e50) { bull += 18; reasons.push("EMA trend bullish"); }
  if (price < e20 && e20 < e50) { bear += 18; reasons.push("EMA trend bearish"); }
  if (price > e200) { bull += 8; reasons.push("Price above long-term mean"); } else { bear += 8; reasons.push("Price below long-term mean"); }
  if (rv > 55 && rv < 75) { bull += 12; reasons.push(`RSI bullish momentum ${rv.toFixed(0)}`); }
  if (rv < 45 && rv > 25) { bear += 12; reasons.push(`RSI bearish pressure ${rv.toFixed(0)}`); }
  if (last.close > prev.close && last.close > last.open) { bull += 8; reasons.push("Strong bullish candle close"); }
  if (last.close < prev.close && last.close < last.open) { bear += 8; reasons.push("Strong bearish candle close"); }

  const structureBullish = rows.slice(-6).filter((c, i, arr) => i > 0 && c.close > arr[i-1].close).length >= 4;
  const structureBearish = rows.slice(-6).filter((c, i, arr) => i > 0 && c.close < arr[i-1].close).length >= 4;
  if (structureBullish) { bull += 14; reasons.push("Market structure bullish"); }
  if (structureBearish) { bear += 14; reasons.push("Market structure bearish"); }

  const nearSupport = Math.abs(price - support) <= atrValue * 2.3;
  const nearResistance = Math.abs(resistance - price) <= atrValue * 2.3;
  if (nearSupport) { bull += 12; reasons.push(`Near support ${support.toFixed(2)}`); }
  if (nearResistance) { bear += 12; reasons.push(`Near resistance ${resistance.toFixed(2)}`); }

  if (context.higherTimeframeBias === "LONG") { bull += 12; reasons.push("Higher timeframe filter bullish"); }
  if (context.higherTimeframeBias === "SHORT") { bear += 12; reasons.push("Higher timeframe filter bearish"); }
  if (context.dxyChangePercent != null) {
    if (context.dxyChangePercent < -0.03) { bull += 6; reasons.push("DXY weakness supports gold"); }
    if (context.dxyChangePercent > 0.03) { bear += 6; reasons.push("DXY strength pressures gold"); }
  }

  let direction: BackendSignalDirection = bull - bear >= 20 ? "LONG" : bear - bull >= 20 ? "SHORT" : "NONE";
  const risk = Math.max(atrValue * 1.35, price * 0.0012);
  let stopLoss = direction === "LONG" ? Math.min(price - risk, support - atrValue * 0.25) : direction === "SHORT" ? Math.max(price + risk, resistance + atrValue * 0.25) : price;
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) stopLoss = direction === "LONG" ? price - risk : direction === "SHORT" ? price + risk : price;

  const targetBase = direction === "LONG" ? Math.max(resistance, price + risk * 2) : direction === "SHORT" ? Math.min(support, price - risk * 2) : price;
  const takeProfit1 = direction === "LONG" ? Math.max(price + risk * 1.5, Math.min(targetBase, price + risk * 2)) : direction === "SHORT" ? Math.min(price - risk * 1.5, Math.max(targetBase, price - risk * 2)) : price;
  const takeProfit2 = direction === "LONG" ? price + risk * 2.4 : direction === "SHORT" ? price - risk * 2.4 : price;
  const takeProfit3 = direction === "LONG" ? price + risk * 3.6 : direction === "SHORT" ? price - risk * 3.6 : price;
  let riskReward = direction === "NONE" ? 0 : Math.abs(takeProfit2 - price) / Math.max(0.01, Math.abs(price - stopLoss));

  if (direction === "LONG" && nearResistance && !nearSupport) { penalties.push("Too close to resistance"); bull -= 16; }
  if (direction === "SHORT" && nearSupport && !nearResistance) { penalties.push("Too close to support"); bear -= 16; }
  if (state === "RANGING" && !nearSupport && !nearResistance) { penalties.push("Price is mid-range"); bull -= 8; bear -= 8; }
  if (context.highImpactNewsSoon) { penalties.push("High impact news risk soon"); bull -= 12; bear -= 12; }
  if (context.alignmentScore != null && context.alignmentScore < 55) { penalties.push("Weak timeframe alignment"); bull -= 10; bear -= 10; }
  if (context.higherTimeframeBias && direction !== "NONE" && context.higherTimeframeBias !== direction) penalties.push("Against higher timeframe bias");
  if (riskReward < 1.5 && direction !== "NONE") penalties.push("Risk/reward below 1:1.5");

  direction = bull - bear >= 20 ? "LONG" : bear - bull >= 20 ? "SHORT" : "NONE";
  if (riskReward < 1.5 || penalties.some(p => /Against higher timeframe|Risk\/reward/.test(p))) direction = "NONE";
  const confluence = Math.max(0, Math.min(95, direction === "LONG" ? bull : direction === "SHORT" ? bear : Math.max(bull, bear)));
  if (direction === "NONE") riskReward = 0;

  const summary = direction === "LONG"
    ? `Bullish setup from backend cache; support ${support.toFixed(2)} holds and resistance ${resistance.toFixed(2)} is the next objective.`
    : direction === "SHORT"
      ? `Bearish setup from backend cache; resistance ${resistance.toFixed(2)} caps price and support ${support.toFixed(2)} is the next objective.`
      : `No clean trade. Price is between support ${support.toFixed(2)} and resistance ${resistance.toFixed(2)}; wait for confirmation.`;

  return {
    direction,
    timeframe: interval,
    entry: Number(price.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit1: Number(takeProfit1.toFixed(2)),
    takeProfit2: Number(takeProfit2.toFixed(2)),
    takeProfit3: Number(takeProfit3.toFixed(2)),
    riskReward: Number(riskReward.toFixed(2)),
    confluence,
    confidence: direction === "NONE" ? "NONE" : signalGrade(confluence),
    reasons: [...reasons, ...penalties.map(p => `WAIT filter: ${p}`)].slice(0, 9),
    indicators: { rsi: Number(rv.toFixed(1)), ema20: Number(e20.toFixed(2)), ema200: Number(e200.toFixed(2)), macdPositive: bull > bear },
    generatedAt,
    expiresAt: generatedAt + expiryMinutes * 60_000,
    expiryMinutes,
    alignmentScore: context.alignmentScore || 0,
    priceActionSummary: summary,
    backtestLite: backtestLiteServer(rows, direction, rv),
    calibration: { marketState: state, nearestSupport: Number(support.toFixed(2)), nearestResistance: Number(resistance.toFixed(2)), atr: Number(atrValue.toFixed(2)), rrOk: riskReward >= 1.5, htfBias: context.higherTimeframeBias },
    debug: { source: quote.source, candlesUsed: rows.length, lastCandleTime: last.time, feedStatus: quote.feedStatus }
  };
}
