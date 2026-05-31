export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  symbol: string;
  timestamp: number;
  source: string;
  dataAgeSeconds?: number;
  feedStatus?: "LIVE" | "DELAYED" | "STALE" | "FALLBACK" | "INVALID";
  feedConfidence?: number;
  verifiedSources?: string[];
  fallbackReason?: string;
  marketClosedFallback?: boolean;
}

type MarketBundle = { quote: Quote; candles: Candle[]; source: string };

// IMPORTANT:
// - Do NOT use Yahoo GC=F here. GC=F is COMEX futures, not spot XAUUSD.
// - TradingView iframe data cannot be read by the backend, so calculations need their own
//   backend spot-XAUUSD price engine.
// - Primary production source should be TWELVE_DATA_API_KEY (XAU/USD candles).
// - Optional validators: GOLDAPI_KEY, ALPHA_VANTAGE_API_KEY, metals.live.
// - Yahoo XAUUSD=X is kept only as a last-resort legacy spot-style fallback and is
//   aggressively rejected if out of range or out of consensus.
const yahooSpotGoldSymbols = ["XAUUSD=X"];
const yahooDxySymbols = ["DX-Y.NYB", "DX=F"];

const candleCache = new Map<string, { quote: Quote; candles: Candle[]; source: string; savedAt: number }>();

// Rolling cache limits keep enough history for strategy calibration while keeping
// Render memory tiny and preventing the mobile frontend from receiving huge arrays.
const CACHE_LIMIT_BY_INTERVAL: Record<string, number> = {
  "1m": 700,
  "5m": 1200,
  "15m": 1800,
  "30m": 1800,
  "60m": 2200,
  "1h": 2200,
  "4h": 2200,
  "1d": 1200,
  "1wk": 600
};

const RESPONSE_LIMIT_BY_INTERVAL: Record<string, number> = {
  "1m": 300,
  "5m": 500,
  "15m": 800,
  "30m": 800,
  "60m": 1000,
  "1h": 1000,
  "4h": 1000,
  "1d": 500,
  "1wk": 300
};
const lastGoodSpotQuote: { current?: { quote: Quote; savedAt: number } } = {};
const DEFAULT_SPOT_PRICE = Number(process.env.FALLBACK_XAUUSD_PRICE || 3350);

function supabaseConfig() {
  const url = envFirst("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/\/$/, "");
  const key = envFirst("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  const enabled = process.env.ALLOW_SUPABASE_CACHE !== "false" && Boolean(url && key);
  return { enabled, url, key, table: process.env.SUPABASE_CANDLE_CACHE_TABLE || "market_candle_cache" };
}

function candleTimeIso(ms: number) {
  return new Date(ms).toISOString();
}

async function persistSupabaseCandleCache(timeframe: string, saved: { quote: Quote; candles: Candle[]; source: string; savedAt: number }) {
  const cfg = supabaseConfig();
  if (!cfg.enabled || !saved.candles.length) return;
  const maxRows = Math.min(saved.candles.length, Number(process.env.SUPABASE_CACHE_WRITE_LIMIT || 350));
  const rows = saved.candles.slice(-maxRows).map(c => ({
    symbol: "XAUUSD",
    timeframe,
    candle_time: candleTimeIso(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume || 0,
    source: saved.source,
    updated_at: candleTimeIso(saved.savedAt)
  }));

  try {
    const response = await fetch(`${cfg.url}/rest/v1/${cfg.table}?on_conflict=symbol,timeframe,candle_time`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(rows)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`Supabase candle cache save failed: ${response.status} ${text}`);
    }
  } catch (error) {
    console.warn("Supabase candle cache save failed", error);
  }
}

async function loadSupabaseCandleCache(timeframe: string, interval: string): Promise<MarketBundle | null> {
  const cfg = supabaseConfig();
  if (!cfg.enabled) return null;
  const limit = limitFor(interval, RESPONSE_LIMIT_BY_INTERVAL, 800);
  const url = new URL(`${cfg.url}/rest/v1/${cfg.table}`);
  url.searchParams.set("select", "candle_time,open,high,low,close,volume,source,updated_at");
  url.searchParams.set("symbol", "eq.XAUUSD");
  url.searchParams.set("timeframe", `eq.${timeframe}`);
  url.searchParams.set("order", "candle_time.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Supabase HTTP ${response.status} ${text}`);
    }
    const rows: any[] = await response.json();
    const candles = cleanCandles(rows.map(row => ({
      time: Date.parse(row.candle_time),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume || 0)
    })));
    if (candles.length < 2) return null;
    const baseSource = rows.find(r => r?.source)?.source || "supabase-candle-cache";
    const quote = quoteFromCandles(candles, "XAUUSD", `${baseSource}+supabase-cache`);
    quote.feedStatus = "STALE";
    quote.feedConfidence = 55;
    quote.marketClosedFallback = true;
    quote.fallbackReason = "Loaded last completed XAUUSD candles from Supabase persistent cache";
    quote.verifiedSources = ["supabase:market_candle_cache", baseSource];
    const bundle = { quote, candles, source: quote.source };
    candleCache.set(timeframe, { ...bundle, savedAt: Date.now() });
    return bundle;
  } catch (error) {
    console.warn("Supabase candle cache load failed", error);
    return null;
  }
}

function envFirst(...names: string[]) {
  for (const name of names) {
    if (!name) continue;
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function getTwelveDataKey() {
  const key = envFirst("TWELVE_DATA_API_KEY", "TWELVEDATA_API_KEY", "TWELVE_DATA_KEY");
  // GoldAPI keys commonly start with sk_. If pasted into TWELVE_DATA_API_KEY by mistake,
  // do not send it to Twelve Data; use it as GoldAPI validation instead.
  if (/^sk_/i.test(key)) return "";
  return key;
}

function getGoldApiKey() {
  return envFirst(
    "GOLDAPI_KEY",
    "GOLD_API_KEY",
    /^sk_/i.test(process.env.TWELVE_DATA_API_KEY || "") ? "TWELVE_DATA_API_KEY" : ""
  );
}

function marketDataProvider() {
  return (process.env.MARKET_DATA_PROVIDER || "supabase").trim().toLowerCase();
}

function shouldUseSupabaseOnly() {
  const provider = marketDataProvider();
  return provider === "supabase" || provider === "mt5" || provider === "mt5-bridge" || provider === "cache";
}

function shouldUseTwelveData() {
  const provider = marketDataProvider();
  return provider === "twelvedata" || provider === "twelve" || provider === "auto";
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanCandles(candles: Candle[]) {
  return candles
    .filter(c => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close) && c.high >= c.low && c.close > 0)
    .sort((a, b) => a.time - b.time)
    .filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);
}

function cacheKeyFor(interval: string, resampleMs = 0) {
  return `${interval}:${resampleMs || 0}`;
}

function limitFor(interval: string, table: Record<string, number>, fallback: number) {
  return Number(process.env[`XAUUSD_${interval.toUpperCase().replace(/[^A-Z0-9]/g, "")}_CACHE_LIMIT`]) || table[interval] || fallback;
}

function trimCandles(candles: Candle[], limit: number) {
  const cleaned = cleanCandles(candles);
  return cleaned.length > limit ? cleaned.slice(-limit) : cleaned;
}

function mergeCandleHistory(existing: Candle[] | undefined, incoming: Candle[], maxCandles: number) {
  const byTime = new Map<number, Candle>();
  for (const candle of existing || []) byTime.set(candle.time, candle);
  for (const candle of incoming) byTime.set(candle.time, candle);
  return trimCandles(Array.from(byTime.values()), maxCandles);
}

function saveRollingCache(cacheKey: string, bundle: MarketBundle, interval: string) {
  const previous = candleCache.get(cacheKey);
  const maxCandles = limitFor(interval, CACHE_LIMIT_BY_INTERVAL, 1500);
  const candles = mergeCandleHistory(previous?.candles, bundle.candles, maxCandles);
  const quote = quoteFromCandles(candles, "XAUUSD", bundle.source);
  const saved = { quote: { ...quote, ...bundle.quote, price: quote.price, timestamp: quote.timestamp }, candles, source: bundle.source, savedAt: Date.now() };
  candleCache.set(cacheKey, saved);
  void persistSupabaseCandleCache(cacheKey, saved);
  return saved;
}

function prepareResponseBundle(saved: { quote: Quote; candles: Candle[]; source: string; savedAt: number }, interval: string): MarketBundle {
  const responseLimit = limitFor(interval, RESPONSE_LIMIT_BY_INTERVAL, 800);
  const candles = trimCandles(saved.candles, responseLimit);
  const quote = quoteFromCandles(candles, "XAUUSD", saved.source);
  return {
    quote: {
      ...saved.quote,
      ...quote,
      source: saved.quote.source || saved.source,
      feedConfidence: saved.quote.feedConfidence,
      verifiedSources: saved.quote.verifiedSources,
      fallbackReason: saved.quote.fallbackReason,
      marketClosedFallback: saved.quote.marketClosedFallback
    },
    candles,
    source: saved.source
  };
}

function median(values: number[]) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function deviationPct(value: number, base: number) {
  return Math.abs(value - base) / base * 100;
}

function statusFromAge(seconds: number | undefined) {
  if (seconds == null) return "DELAYED" as const;
  if (seconds <= 15 * 60) return "LIVE" as const;
  if (seconds <= 2 * 60 * 60) return "DELAYED" as const;
  return "STALE" as const;
}

function validateSpotPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid XAUUSD spot price");
  const min = Number(process.env.XAUUSD_MIN_VALID || 1000);
  const max = Number(process.env.XAUUSD_MAX_VALID || 10000);
  if (price < min || price > max) {
    throw new Error(`Rejected suspicious XAUUSD spot price ${price}. Expected ${min}-${max}.`);
  }
}

function quoteFromCandles(candles: Candle[], symbol: string, source: string): Quote {
  const valid = cleanCandles(candles);
  if (valid.length < 2) throw new Error(`Not enough candles from ${source}`);
  const last = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  validateSpotPrice(last.close);
  const recent24h = valid.filter(c => c.time >= last.time - 24 * 60 * 60 * 1000);
  const recent = recent24h.length >= 3 ? recent24h : valid.slice(-96);
  const dayHigh = Math.max(...recent.map(c => c.high));
  const dayLow = Math.min(...recent.map(c => c.low));
  const change = last.close - prev.close;
  const dataAgeSeconds = Math.max(0, Math.round((Date.now() - last.time) / 1000));
  return {
    price: Number(last.close.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(((change / prev.close) * 100).toFixed(3)),
    dayHigh: Number(dayHigh.toFixed(2)),
    dayLow: Number(dayLow.toFixed(2)),
    symbol,
    timestamp: last.time,
    source,
    dataAgeSeconds,
    feedStatus: statusFromAge(dataAgeSeconds),
    feedConfidence: dataAgeSeconds <= 15 * 60 ? 90 : dataAgeSeconds <= 2 * 60 * 60 ? 70 : 50,
    verifiedSources: [source]
  };
}

function rememberGoodQuote(quote: Quote) {
  validateSpotPrice(quote.price);
  lastGoodSpotQuote.current = { quote, savedAt: Date.now() };
}

export function resampleCandles(candles: Candle[], bucketMs: number): Candle[] {
  if (!candles.length || bucketMs <= 0) return candles;
  const buckets = new Map<number, Candle[]>();
  for (const c of candles) {
    const bucket = Math.floor(c.time / bucketMs) * bucketMs;
    const list = buckets.get(bucket) || [];
    list.push(c);
    buckets.set(bucket, list);
  }
  return Array.from(buckets.entries()).sort((a,b)=>a[0]-b[0]).map(([time, rows]) => ({
    time,
    open: rows[0].open,
    high: Math.max(...rows.map(r => r.high)),
    low: Math.min(...rows.map(r => r.low)),
    close: rows[rows.length - 1].close,
    volume: rows.reduce((sum, r) => sum + (r.volume || 0), 0)
  }));
}

function intervalMs(interval: string) {
  if (interval === "1m") return 60_000;
  if (interval === "5m") return 5 * 60_000;
  if (interval === "15m") return 15 * 60_000;
  if (interval === "30m") return 30 * 60_000;
  if (interval === "60m" || interval === "1h") return 60 * 60_000;
  if (interval === "4h") return 4 * 60 * 60_000;
  if (interval === "1d") return 24 * 60 * 60_000;
  if (interval === "1wk") return 7 * 24 * 60 * 60_000;
  return 15 * 60_000;
}

function rangeCount(range: string, interval: string) {
  if (range === "1d") return Math.min(240, Math.ceil(24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "5d") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(5 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "1mo") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(30 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "2mo") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(60 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "3mo") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(90 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "6mo") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(180 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "1y") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(365 * 24 * 60 * 60_000 / intervalMs(interval)));
  if (range === "5y") return Math.min(Number(process.env.MAX_CANDLES_PER_REQUEST || 5000), Math.ceil(5 * 365 * 24 * 60_000 / intervalMs(interval)));
  return 300;
}

function makeFallbackCandles(price: number, interval: string, range: string, reason: string): MarketBundle {
  validateSpotPrice(price);
  const step = intervalMs(interval);
  const count = Math.max(80, rangeCount(range, interval));
  const lastTime = Math.floor(Date.now() / step) * step;
  const candles: Candle[] = [];
  let close = price;
  for (let i = count - 1; i >= 0; i--) {
    const time = lastTime - i * step;
    const wave = Math.sin((count - i) / 7) * price * 0.0009;
    const drift = Math.sin((count - i) / 29) * price * 0.00035;
    const open = close;
    close = price + wave + drift;
    const spread = Math.max(0.8, price * 0.00045);
    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number((Math.max(open, close) + spread).toFixed(2)),
      low: Number((Math.min(open, close) - spread).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: 0
    });
  }
  const quote = quoteFromCandles(candles, "XAUUSD", "verified-spot-fallback");
  quote.feedStatus = "FALLBACK";
  quote.feedConfidence = 45;
  quote.verifiedSources = ["fallback:last-verified-spot"];
  quote.fallbackReason = reason;
  quote.marketClosedFallback = true;
  return { quote, candles: cleanCandles(candles), source: quote.source };
}

function twelveInterval(interval: string) {
  if (interval === "1m") return "1min";
  if (interval === "5m") return "5min";
  if (interval === "15m") return "15min";
  if (interval === "30m") return "30min";
  if (interval === "60m" || interval === "1h") return "1h";
  if (interval === "4h") return "4h";
  if (interval === "1d") return "1day";
  if (interval === "1wk") return "1week";
  return "15min";
}

async function fetchTwelveDataGold(interval = "15m", range = "5d"): Promise<MarketBundle> {
  const apiKey = getTwelveDataKey();
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY missing or invalid. Use a real Twelve Data key, not a GoldAPI sk_ key.");
  const outputsize = Math.max(100, Math.min(Number(process.env.TWELVE_DATA_OUTPUTSIZE || 5000), rangeCount(range, interval)));
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", "XAU/USD");
  url.searchParams.set("interval", twelveInterval(interval));
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { headers: { "Accept": "application/json", "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`Twelve Data returned ${response.status}`);
  const json: any = await response.json();
  if (json?.status === "error") throw new Error(json?.message || "Twelve Data returned error");
  const values: any[] = json?.values || [];
  if (!values.length) throw new Error("Twelve Data returned empty XAU/USD candles");
  const candles = cleanCandles(values.map(row => {
    const time = Date.parse(`${row.datetime} UTC`);
    const open = num(row.open);
    const high = num(row.high);
    const low = num(row.low);
    const close = num(row.close);
    if (!Number.isFinite(time) || open == null || high == null || low == null || close == null) return null;
    return { time, open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, volume: num(row.volume) || 0 };
  }).filter(Boolean) as Candle[]);
  const source = "twelvedata:XAU/USD";
  const quote = quoteFromCandles(candles, "XAUUSD", source);
  return { quote, candles, source };
}

async function fetchYahooChart(symbols: string[], displaySymbol: string, interval = "15m", range = "5d", resampleMs = 0): Promise<MarketBundle> {
  let lastError: unknown = null;
  for (const symbol of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=true&_=${Date.now()}`;
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "User-Agent": "Mozilla/5.0 GoldAnalyzerPro/LegacySpotFallback"
        }
      });
      if (!response.ok) throw new Error(`Yahoo returned ${response.status} for ${symbol}`);
      const json: any = await response.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp ?? [];
      const quoteData = result?.indicators?.quote?.[0];
      if (!timestamps.length || !quoteData) throw new Error(`Yahoo returned empty data for ${symbol}`);
      let candles = cleanCandles(timestamps.map((t, i) => {
        const open = num(quoteData.open?.[i]);
        const high = num(quoteData.high?.[i]);
        const low = num(quoteData.low?.[i]);
        const close = num(quoteData.close?.[i]);
        const volume = num(quoteData.volume?.[i]) ?? 0;
        if (open == null || high == null || low == null || close == null) return null;
        return { time: t * 1000, open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, volume };
      }).filter(Boolean) as Candle[]);
      if (resampleMs) candles = resampleCandles(candles, resampleMs);
      candles = cleanCandles(candles);
      const source = displaySymbol === "XAUUSD" ? `yahoo-spot-legacy:${symbol}` : `yahoo:${symbol}`;
      const quote = quoteFromCandles(candles, displaySymbol, source);
      if (displaySymbol === "XAUUSD") quote.feedConfidence = Math.min(quote.feedConfidence ?? 60, 60);
      return { quote, candles, source };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${displaySymbol} data unavailable`);
}

async function fetchMetalsLiveSpot(): Promise<{ price: number; source: string } | null> {
  try {
    const response = await fetch("https://api.metals.live/v1/spot/gold", {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 GoldAnalyzerPro/SpotValidator" }
    });
    if (!response.ok) return null;
    const json: any = await response.json();
    const row = Array.isArray(json) ? json.find((x) => x && typeof x === "object" && ("gold" in x || "price" in x)) : json;
    const price = num(row?.gold ?? row?.price ?? row?.value);
    if (price == null) return null;
    validateSpotPrice(price);
    return { price, source: "metals.live:spot-gold" };
  } catch {
    return null;
  }
}

async function fetchGoldApiSpot(): Promise<{ price: number; source: string; raw?: any } | null> {
  const key = getGoldApiKey();
  if (!key) return null;
  try {
    const response = await fetch("https://www.goldapi.io/api/XAU/USD", {
      headers: { "Accept": "application/json", "x-access-token": key, "User-Agent": "Mozilla/5.0 GoldAnalyzerPro/GoldAPI" }
    });
    if (!response.ok) return null;
    const json: any = await response.json();
    const price = num(json?.price);
    if (price == null) return null;
    validateSpotPrice(price);
    return { price, source: "goldapi:XAU/USD", raw: json };
  } catch {
    return null;
  }
}

function goldApiTimestamp(raw: any) {
  const ts = num(raw?.timestamp ?? raw?.time ?? raw?.ts);
  if (ts && ts > 1_000_000_000_000) return ts;
  if (ts && ts > 1_000_000_000) return ts * 1000;
  return Date.now();
}

function goldApiQuoteFromRaw(raw: any, price: number): Quote {
  const open = num(raw?.open_price ?? raw?.open ?? raw?.price_open) ?? price;
  const high = num(raw?.high_price ?? raw?.high ?? raw?.price_high) ?? Math.max(price, open);
  const low = num(raw?.low_price ?? raw?.low ?? raw?.price_low) ?? Math.min(price, open);
  const prevClose = num(raw?.prev_close_price ?? raw?.previous_close_price ?? raw?.prev_close ?? raw?.close_yesterday) ?? open;
  const change = num(raw?.ch ?? raw?.change) ?? (price - prevClose);
  const changePercent = num(raw?.chp ?? raw?.change_percent) ?? (prevClose ? (change / prevClose) * 100 : 0);
  const timestamp = goldApiTimestamp(raw);
  const quote: Quote = {
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(3)),
    dayHigh: Number(Math.max(high, price).toFixed(2)),
    dayLow: Number(Math.min(low, price).toFixed(2)),
    symbol: "XAUUSD",
    timestamp,
    source: "goldapi:XAU/USD",
    dataAgeSeconds: Math.max(0, Math.round((Date.now() - timestamp) / 1000)),
    feedStatus: "LIVE",
    feedConfidence: 95,
    verifiedSources: ["goldapi:XAU/USD"]
  };
  rememberGoodQuote(quote);
  return quote;
}

async function fetchGoldApiBundle(interval = "15m", range = "5d", resampleMs = 0): Promise<MarketBundle> {
  const spot = await fetchGoldApiSpot();
  if (!spot?.raw) throw new Error("GOLDAPI_KEY missing/invalid or GoldAPI quote unavailable");
  const price = spot.price;
  const raw = spot.raw;
  const quote = goldApiQuoteFromRaw(raw, price);
  const step = resampleMs || intervalMs(interval);
  const candleTime = Math.floor(quote.timestamp / step) * step;
  const open = num(raw?.open_price ?? raw?.open ?? raw?.prev_close_price) ?? quote.price;
  const high = Math.max(num(raw?.high_price ?? raw?.high) ?? quote.price, quote.price, open);
  const low = Math.min(num(raw?.low_price ?? raw?.low) ?? quote.price, quote.price, open);
  const candle: Candle = {
    time: candleTime,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: quote.price,
    volume: 0
  };
  const previousClose = num(raw?.prev_close_price ?? raw?.previous_close_price ?? raw?.close_yesterday) ?? open;
  const prevCandle: Candle = {
    time: candleTime - step,
    open: Number(previousClose.toFixed(2)),
    high: Number(Math.max(previousClose, candle.open).toFixed(2)),
    low: Number(Math.min(previousClose, candle.open).toFixed(2)),
    close: Number(candle.open.toFixed(2)),
    volume: 0
  };
  const existing = candleCache.get(cacheKeyFor(interval, resampleMs))?.candles || [];
  const candles = cleanCandles([...existing, prevCandle, candle]);
  const source = "goldapi:XAU/USD+quote-ohlc";
  return { quote: { ...quote, source }, candles, source };
}

async function fetchAlphaVantageXauUsd(): Promise<{ price: number; source: string } | null> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
    url.searchParams.set("from_currency", "XAU");
    url.searchParams.set("to_currency", "USD");
    url.searchParams.set("apikey", key);
    const response = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
    if (!response.ok) return null;
    const json: any = await response.json();
    const row = json?.["Realtime Currency Exchange Rate"];
    const price = num(row?.["5. Exchange Rate"]);
    if (price == null) return null;
    validateSpotPrice(price);
    return { price, source: "alphavantage:XAU/USD" };
  } catch {
    return null;
  }
}

async function fetchSpotReferences() {
  const refs = await Promise.all([fetchGoldApiSpot(), fetchAlphaVantageXauUsd(), fetchMetalsLiveSpot()]);
  return refs.filter(Boolean) as Array<{ price: number; source: string }>;
}

async function validateGoldAgainstSpotReferences(primary: MarketBundle): Promise<MarketBundle> {
  const references = [{ price: primary.quote.price, source: primary.source }, ...(await fetchSpotReferences())];
  const refMedian = median(references.map(r => r.price));
  if (refMedian == null) return primary;
  const maxDeviation = Number(process.env.XAUUSD_MAX_FEED_DEVIATION_PCT || 1.0);
  const valid = references.filter(r => deviationPct(r.price, refMedian) <= maxDeviation);
  if (!valid.some(r => r.source === primary.source)) {
    throw new Error(`Primary XAUUSD feed rejected. Price ${primary.quote.price} differs from spot consensus ${refMedian.toFixed(2)}.`);
  }
  const confidence = valid.length >= 2 ? 98 : Math.min(primary.quote.feedConfidence ?? 85, primary.source.startsWith("twelvedata") ? 90 : 60);
  const source = valid.length >= 2 ? `${primary.source}+validated` : primary.source;
  const quote = { ...primary.quote, feedConfidence: confidence, verifiedSources: valid.map(r => r.source), source };
  rememberGoodQuote(quote);
  return { ...primary, quote, source };
}

export async function fetchSpotGold(interval = "15m", range = "5d", resampleMs = 0): Promise<MarketBundle> {
  const cacheKey = cacheKeyFor(interval, resampleMs);
  const errors: string[] = [];

  // 0) MT5 bridge / Supabase-only mode. The Windows MT5 bridge writes real broker
  // XAUUSD candles into Supabase. Render reads Supabase only and never calls
  // limited external providers. This is the production mode for MT5-backed web app.
  if (shouldUseSupabaseOnly()) {
    const persistentCached = await loadSupabaseCandleCache(cacheKey, interval);
    if (persistentCached?.candles?.length) {
      persistentCached.quote.source = `${persistentCached.source}+mt5-bridge`;
      persistentCached.quote.verifiedSources = ["supabase:market_candle_cache", "mt5-bridge"];
      persistentCached.quote.fallbackReason = "Loaded real XAUUSD candles uploaded by MT5 bridge";
      return persistentCached;
    }

    const cached = candleCache.get(cacheKey);
    if (cached?.candles?.length) {
      return prepareResponseBundle(cached, interval);
    }

    throw new Error(`Supabase candle cache is empty for ${cacheKey}. Run the Windows MT5 bridge and let it upload candles first.`);
  }

  // 1) GoldAPI-only primary mode. This removes Twelve Data from normal production.
  // GoldAPI supplies real XAU/USD spot quote + daily OHLC. The backend saves each
  // quote snapshot into Supabase, then the app builds its own candle history over time.
  if (!shouldUseTwelveData()) {
    try {
      const goldapi = await fetchGoldApiBundle(interval, range, resampleMs);
      const saved = saveRollingCache(cacheKey, goldapi, interval);
      return prepareResponseBundle(saved, interval);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "GoldAPI failed");
    }

    const persistentCached = await loadSupabaseCandleCache(cacheKey, interval);
    if (persistentCached?.candles?.length) {
      persistentCached.quote.fallbackReason = errors.join(" | ") || persistentCached.quote.fallbackReason;
      persistentCached.quote.marketClosedFallback = true;
      persistentCached.quote.source = `${persistentCached.source}+goldapi-cache-fallback`;
      return persistentCached;
    }

    const cached = candleCache.get(cacheKey);
    if (cached?.candles?.length) {
      return prepareResponseBundle(cached, interval);
    }

    throw new Error(`GoldAPI XAU/USD quote unavailable and Supabase candle cache is empty. ${errors.join(" | ")}`);
  }

  // 1b) Optional Twelve Data mode. Use only when MARKET_DATA_PROVIDER=twelvedata/auto.
  try {
    const primary = await fetchTwelveDataGold(interval, range);
    const validated = await validateGoldAgainstSpotReferences(primary);
    const finalBundle = resampleMs
      ? { ...validated, candles: cleanCandles(resampleCandles(validated.candles, resampleMs)) }
      : validated;
    const saved = saveRollingCache(cacheKey, finalBundle, interval);
    return prepareResponseBundle(saved, interval);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Twelve Data failed");
  }

  // 2) Optional legacy Yahoo XAUUSD=X fallback. Disabled by default because it has caused
  // wrong XAUUSD values in production. Enable only for emergency debugging.
  if (process.env.ALLOW_YAHOO_SPOT_FALLBACK === "true") {
    try {
      const yahoo = await fetchYahooChart(yahooSpotGoldSymbols, "XAUUSD", interval, range, resampleMs);
      const validated = await validateGoldAgainstSpotReferences(yahoo);
      const saved = saveRollingCache(cacheKey, validated, interval);
      return prepareResponseBundle(saved, interval);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Yahoo spot fallback failed");
    }
  }

  // 3) Last completed candles from memory cache. This is the correct behavior when markets
  // are closed or a live API temporarily fails: keep analysis based on last completed candles.
  const cached = candleCache.get(cacheKey);
  if (cached?.candles?.length) {
    const last = cached.candles[cached.candles.length - 1];
    const age = Math.max(0, Math.round((Date.now() - last.time) / 1000));
    return {
      quote: {
        ...cached.quote,
        dataAgeSeconds: age,
        feedStatus: "STALE" as const,
        feedConfidence: 50,
        source: `${cached.source}+last-closed-candle`,
        fallbackReason: errors.join(" | "),
        marketClosedFallback: true
      },
      candles: prepareResponseBundle(cached, interval).candles,
      source: `${cached.source}+last-closed-candle`
    };
  }

  // 4) Last completed candles from Supabase persistent cache. This survives Render
  // restarts/sleeps/redeploys, so weekend analysis can still use real OHLC candles.
  const persistentCached = await loadSupabaseCandleCache(cacheKey, interval);
  if (persistentCached?.candles?.length) {
    persistentCached.quote.fallbackReason = errors.join(" | ") || persistentCached.quote.fallbackReason;
    persistentCached.quote.marketClosedFallback = true;
    persistentCached.quote.source = `${persistentCached.source}+last-closed-candle`;
    return persistentCached;
  }

  // 5) Do not generate fake/smoothed candles by default. Signals, levels, and analysis
  // must be based on real OHLC candles from Twelve Data or on a real cached last
  // completed candle cache from the same feed. Synthetic fallback candles caused
  // incorrect levels/signals and are intentionally disabled unless explicitly enabled.
  if (process.env.ALLOW_SYNTHETIC_CANDLE_FALLBACK === "true") {
    const refs = await fetchSpotReferences();
    const referencePrice = median(refs.map(r => r.price)) || lastGoodSpotQuote.current?.quote.price || DEFAULT_SPOT_PRICE;
    const fallback = makeFallbackCandles(referencePrice, interval, range, errors.join(" | ") || "Twelve Data candle feed unavailable");
    fallback.quote.verifiedSources = refs.length ? refs.map(r => r.source) : fallback.quote.verifiedSources;
    fallback.quote.source = refs.length ? `spot-reference-fallback:${refs.map(r => r.source).join("+")}` : fallback.quote.source;
    fallback.source = fallback.quote.source;
    return fallback;
  }

  throw new Error(`Real XAUUSD candle feed unavailable. ${errors.join(" | ") || "No source returned candles"}`);
}

// Backward-compatible export name used by older routes/components in this project.
export const fetchYahooGold = fetchSpotGold;

export function fetchYahooDxy(interval = "15m", range = "5d", resampleMs = 0) {
  return fetchYahooChart(yahooDxySymbols, "DXY", interval, range, resampleMs);
}
