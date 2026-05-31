import { Router } from "express";
import { fetchYahooDxy, fetchSpotGold } from "../services/marketData.js";
import { buildLevelResult, buildAnalysisResult, buildSignalResult, trendBias, referenceOhlc, type BackendSignalDirection } from "../services/strategy.js";

const router = Router();

const intervals: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "60m",
  "4h": "60m",
  "1d": "1d",
  "1wk": "1wk"
};

// Safe request windows. The API server keeps a rolling memory cache per timeframe,
// so the frontend does not need to request huge 2-month intraday payloads at once.
const ranges: Record<string, string> = {
  "1m": "5d",
  "5m": "1mo",
  "15m": "2mo",
  "30m": "2mo",
  "1h": "3mo",
  "4h": "6mo",
  "1d": "1y",
  "1wk": "5y"
};

const resampleMs: Record<string, number> = {
  "4h": 4 * 60 * 60 * 1000
};


function higherFrames(frame: string): string[] {
  if (["1m", "5m"].includes(frame)) return ["15m", "1h", "4h"];
  if (["15m", "30m"].includes(frame)) return ["1h", "4h", "1d"];
  if (frame === "1h") return ["4h", "1d", "1wk"];
  if (frame === "4h") return ["1d", "1wk"];
  if (frame === "1d") return ["1wk"];
  return [];
}

function dominantBias(biases: BackendSignalDirection[]): BackendSignalDirection {
  const longs = biases.filter(b => b === "LONG").length;
  const shorts = biases.filter(b => b === "SHORT").length;
  if (longs > shorts) return "LONG";
  if (shorts > longs) return "SHORT";
  return "NONE";
}

function alignmentFor(direction: BackendSignalDirection, biases: BackendSignalDirection[]) {
  const directional = biases.filter(b => b !== "NONE");
  if (!directional.length || direction === "NONE") return 0;
  return Math.round((directional.filter(b => b === direction).length / directional.length) * 100);
}

async function getSignalContext(requestedInterval: string) {
  const higher = higherFrames(requestedInterval);
  const higherBundles = await Promise.all(higher.map(frame => {
    const mapped = intervals[frame] || frame;
    return fetchSpotGold(mapped, ranges[frame] || "5d", resampleMs[frame] || 0).catch(() => null);
  }));
  const htfBiases = higherBundles.map(bundle => bundle ? trendBias(bundle.candles) : "NONE").filter(Boolean) as BackendSignalDirection[];
  const htfBias = dominantBias(htfBiases);
  const dxy = await fetchYahooDxy("15m", "5d").then(x => x.quote).catch(() => null);
  return { higherTimeframeBias: htfBias, dxyChangePercent: dxy?.changePercent };
}

function noStore(res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

router.get("/quote", async (_req, res) => {
  noStore(res);
  try {
    const { quote } = await fetchSpotGold("15m", "5d");

    // Chart/Home daily range should reflect the latest completed daily candle.
    // This is especially important while the market is closed: intraday candles
    // may stop updating, but the last daily OHLC remains the correct Day High/Low.
    const dailyBundle = await fetchSpotGold("1d", "1mo").catch(() => null);
    const dailyRef = dailyBundle?.candles?.length ? referenceOhlc(dailyBundle.candles, "1d", quote, "latest") : null;

    res.json(dailyRef ? {
      ...quote,
      dayHigh: Number(dailyRef.high.toFixed(2)),
      dayLow: Number(dailyRef.low.toFixed(2)),
      dailyRangeSource: dailyBundle?.source || quote.source,
      dailyCandleTime: dailyRef.time || dailyBundle?.candles?.slice(-2)[0]?.time || dailyBundle?.candles?.slice(-1)[0]?.time
    } : quote);
  } catch (error) {
    res.status(503).json({
      error: "Live gold quote unavailable",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/dxy", async (_req, res) => {
  noStore(res);
  try {
    const { quote } = await fetchYahooDxy("15m", "5d");
    res.json(quote);
  } catch (error) {
    res.status(503).json({
      error: "Live DXY quote unavailable",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/candles", async (req, res) => {
  noStore(res);
  try {
    const requestedInterval = String(req.query.interval || "15m");
    const requestedRange = String(req.query.range || ranges[requestedInterval] || "5d");
    const interval = intervals[requestedInterval] || requestedInterval;
    const { candles, source } = await fetchSpotGold(interval, requestedRange, resampleMs[requestedInterval] || 0);
    const lastCandleTime = candles[candles.length - 1]?.time || null;
    const dataAgeSeconds = lastCandleTime ? Math.max(0, Math.round((Date.now() - lastCandleTime) / 1000)) : null;
    res.json({ candles, source, interval: requestedInterval, timestamp: Date.now(), lastCandleTime, dataAgeSeconds, usableLastCompletedCandle: Boolean(lastCandleTime) });
  } catch (error) {
    res.status(503).json({
      error: "Live gold candles unavailable",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});


router.get("/signal", async (req, res) => {
  noStore(res);
  try {
    const requestedInterval = String(req.query.interval || "15m");
    const requestedRange = String(req.query.range || ranges[requestedInterval] || "5d");
    const interval = intervals[requestedInterval] || requestedInterval;
    const { quote, candles } = await fetchSpotGold(interval, requestedRange, resampleMs[requestedInterval] || 0);
    const context = await getSignalContext(requestedInterval);
    const baseBias = trendBias(candles);
    const htfBiases = [context.higherTimeframeBias || "NONE"] as BackendSignalDirection[];
    const signal = buildSignalResult(candles, quote, requestedInterval, { ...context, alignmentScore: alignmentFor(baseBias, htfBiases) });
    res.json(signal);
  } catch (error) {
    res.status(503).json({ error: "Gold signal unavailable", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.get("/signals/scan", async (_req, res) => {
  noStore(res);
  try {
    const frames = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk"];
    const bundles = await Promise.all(frames.map(frame => fetchSpotGold(intervals[frame] || frame, ranges[frame] || "5d", resampleMs[frame] || 0).catch(() => null)));
    const biasByFrame: Record<string, BackendSignalDirection> = {};
    bundles.forEach((bundle, i) => { biasByFrame[frames[i]] = bundle ? trendBias(bundle.candles) : "NONE"; });
    const allBiases = frames.map(frame => biasByFrame[frame]);
    const dxy = await fetchYahooDxy("15m", "5d").then(x => x.quote).catch(() => null);
    const results = frames.map((frame, i) => {
      const bundle = bundles[i];
      if (!bundle) return null;
      const htfBias = dominantBias(higherFrames(frame).map(h => biasByFrame[h] || "NONE"));
      return buildSignalResult(bundle.candles, bundle.quote, frame, { higherTimeframeBias: htfBias, alignmentScore: alignmentFor(biasByFrame[frame], allBiases), dxyChangePercent: dxy?.changePercent });
    }).filter(Boolean);
    res.json({ signals: results, timestamp: Date.now() });
  } catch (error) {
    res.status(503).json({ error: "Gold signal scan unavailable", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.get("/levels", async (req, res) => {
  noStore(res);
  try {
    const requestedInterval = String(req.query.interval || "15m");
    const requestedRange = String(req.query.range || ranges[requestedInterval] || "5d");
    const interval = intervals[requestedInterval] || requestedInterval;
    const [{ quote, candles }, dailyBundle, weeklyBundle] = await Promise.all([
      fetchSpotGold(interval, requestedRange, resampleMs[requestedInterval] || 0),
      fetchSpotGold("1d", "1y").catch(() => null),
      fetchSpotGold("1wk", "5y").catch(() => null)
    ]);
    res.json(buildLevelResult(candles, quote, requestedInterval, {
      dailyCandles: dailyBundle?.candles,
      weeklyCandles: weeklyBundle?.candles
    }));
  } catch (error) {
    res.status(503).json({ error: "Gold levels unavailable", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.get("/analysis", async (req, res) => {
  noStore(res);
  try {
    const requestedInterval = String(req.query.interval || "15m");
    const requestedRange = String(req.query.range || ranges[requestedInterval] || "5d");
    const interval = intervals[requestedInterval] || requestedInterval;
    const [{ quote, candles }, dxy] = await Promise.all([
      fetchSpotGold(interval, requestedRange, resampleMs[requestedInterval] || 0),
      fetchYahooDxy("15m", "5d").then(x => x.quote).catch(() => null)
    ]);
    res.json(buildAnalysisResult(candles, quote, requestedInterval, dxy));
  } catch (error) {
    res.status(503).json({ error: "Gold analysis unavailable", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
