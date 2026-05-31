import { Activity, BarChart3, Gauge, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { Signal, Timeframe } from "../types/market";
import { TimeframeSelector, timeframeLabel } from "../components/TimeframeSelector";
import { useLanguage } from "../context/LanguageContext";
import { useMarket } from "../context/MarketContext";
import { detectSmartLevels } from "../services/levelsEngine";
import { detectWaves } from "../services/waveEngine";
import { fetchBackendAnalysis, type BackendAnalysisResult } from "../services/api";
import { money } from "../utils/format";

function dirClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("bull") || lower.includes("buy") || lower.includes("long")) return "green";
  if (lower.includes("bear") || lower.includes("sell") || lower.includes("short")) return "red";
  return "neutral-text";
}

function percent(n: number) {
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

export function AnalysisPage() {
  const { candles, quote, dxyQuote, signal, timeframe, setTimeframe, refresh, loading, lastUpdated } = useMarket();
  const [mtfSignals, setMtfSignals] = useState<Signal[]>([]);
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "done">("idle");
  const [backendAnalysis, setBackendAnalysis] = useState<BackendAnalysisResult | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const { t } = useLanguage();
  useEffect(() => {
    let cancelled = false;
    fetchBackendAnalysis(timeframe).then(data => {
      if (!cancelled) { setBackendAnalysis(data); setBackendError(null); }
    }).catch(err => { if (!cancelled) setBackendError(err instanceof Error ? err.message : "Analysis unavailable"); });
    // Lightweight MTF cards are loaded only when requested by backend/refresh; avoid all-frame prefetch on page open.
    setMtfSignals([]);
    return () => { cancelled = true; };
  }, [timeframe, lastUpdated]);

  const wave = detectWaves(candles);
  const price = backendAnalysis?.price || quote?.price || candles[candles.length - 1]?.close || 0;
  const isBullish = backendAnalysis ? backendAnalysis.summary.bias === "BULLISH" : (signal.direction === "LONG" || wave.trend === "BULLISH");
  const isBearish = backendAnalysis ? backendAnalysis.summary.bias === "BEARISH" : (signal.direction === "SHORT" || wave.trend === "BEARISH");
  const bias = isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NEUTRAL";
  const biasLabel = isBullish ? t("bullish") : isBearish ? t("bearish") : t("neutral");
  const confidence = backendAnalysis?.summary.confidence ?? Math.max(signal.confluence || 0, wave.confidence || 0);
  const currentWave = backendAnalysis?.summary.currentWave || (wave.currentWave && wave.currentWave !== "-" ? `W${wave.currentWave}` : "W3");
  const target = wave.projection || (signal.direction === "LONG" ? signal.takeProfit1 : signal.direction === "SHORT" ? signal.takeProfit1 : 0);
  const dxyBias = dxyQuote ? (dxyQuote.changePercent > 0.03 ? "BULLISH" : dxyQuote.changePercent < -0.03 ? "BEARISH" : "NEUTRAL") : "NEUTRAL";
  const smartLevels = detectSmartLevels(candles, price);
  const resistance = backendAnalysis?.levels.resistance || smartLevels.find(l => l.kind === "RESISTANCE")?.price || price + 12;
  const support = backendAnalysis?.levels.support || smartLevels.find(l => l.kind === "SUPPORT")?.price || price - 12;

  const recent = candles.slice(-20);
  const avgRange = recent.length ? recent.reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / recent.length : 0;
  const lastRange = candles.length ? Math.abs(candles[candles.length - 1].high - candles[candles.length - 1].low) : 0;
  const marketState = backendAnalysis ? (backendAnalysis.summary.marketState === "TRENDING" ? t("trending") : backendAnalysis.summary.marketState === "BREAKOUT" ? t("breakout") : t("ranging")) : (confidence >= 70 && avgRange > 0 ? t("trending") : lastRange > avgRange * 1.6 && avgRange > 0 ? t("breakout") : t("ranging"));
  const analysisAgeSeconds = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;
  const now = new Date();
  const isWeekendClosed = now.getDay() === 6 || (now.getDay() === 0 && now.getHours() < 23);
  const lastClosed = candles[candles.length - 1];
  const reopenText = backendAnalysis?.reopenOutlook || (isBullish ? t("reopenBullish") : isBearish ? t("reopenBearish") : t("reopenNeutral"));

  async function handleRefresh() {
    setRefreshState("refreshing");
    await refresh();
    await fetchBackendAnalysis(timeframe).then(data => { setBackendAnalysis(data); setBackendError(null); }).catch(err => setBackendError(err instanceof Error ? err.message : "Analysis unavailable"));
    setMtfSignals([]);
    setRefreshState("done");
    window.setTimeout(() => setRefreshState("idle"), 1400);
  }

  const components = [
    [t("trend"), isBullish ? t("bullish") : isBearish ? t("bearish") : t("wait")],
    [t("marketStructure"), isBullish ? "HH → HL" : isBearish ? "LH → LL" : t("wait")],
    [t("smartMoney"), signal.reasons.find(r => /liquidity|order|fvg|support|resistance/i.test(r)) || t("watch")],
    [t("momentum"), signal.indicators.macdPositive ? t("bullish") : t("bearish")],
    [t("supportResistance"), `${money(support)} / ${money(resistance)}`]
  ];

  const mtfOrder: Timeframe[] = ["1wk", "1d", "4h", "1h", "30m", "15m", "5m", "1m"];
  const mtf = mtfOrder.map((tf) => {
    const item = mtfSignals.find(s => s.timeframe === tf) || (tf === timeframe ? signal : null);
    const tfBias = item?.direction === "LONG" ? t("buy") : item?.direction === "SHORT" ? t("sell") : t("wait");
    return { tf, bias: tfBias, confidence: item?.confluence || 0, item };
  });

  return (
    <main className="page compact-page analysis-page mobile-fit-page">
      <div className="page-title-row compact-title">
        <div>
          <h2>{t("analysis")}</h2>
          <p>{t("analysisSub")}</p>
        </div>
        <strong className="price-badge neutral">XAUUSD<br /><span>{price > 0 ? money(price) : "--"}</span></strong>
      </div>

      <label className="section-label">{t("timeframe")}</label>
      <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      <button className="primary-btn compact-action" onClick={handleRefresh} disabled={loading || refreshState === "refreshing"}><RefreshCw className={refreshState === "refreshing" ? "spin" : ""} /> {refreshState === "refreshing" ? t("refreshing") : refreshState === "done" ? t("updatedOk") : t("refresh")}</button>
      {backendError && <div className="empty-state compact-empty">{backendError}</div>}
      {backendAnalysis?.debug && <small className="data-footnote">{backendAnalysis.source} · {backendAnalysis.debug.candlesUsed} candles · {backendAnalysis.debug.cacheStatus}</small>}

      <section className="market-state-card compact-card">
        <span>{t("marketState")}</span>
        <strong className={marketState === t("trending") || marketState === t("breakout") ? "green" : "neutral-text"}>{marketState}</strong>
        <small>{t("marketStateText")} {analysisAgeSeconds == null ? "" : `· ${t("updatedAt")} ${analysisAgeSeconds < 60 ? `${analysisAgeSeconds}s` : `${Math.round(analysisAgeSeconds / 60)}m`}`}</small>
      </section>

      <section className="market-state-card compact-card reopen-outlook-card">
        <span>{t("marketReopenOutlook")}</span>
        <strong className={dirClass(bias)}>{t("expectedBeforeOpen")}: {biasLabel}</strong>
        <small>{isWeekendClosed ? t("closedCandleMode") : t("weeklyDailyView")} {lastClosed ? `· ${t("lastClosedCandle")}: ${new Date(lastClosed.time).toLocaleString()}` : ""}</small>
        <p>{reopenText}</p>
      </section>

      <section className="analysis-summary-card compact-card">
        <div>
          <span>{timeframeLabel(timeframe)} {t("analysisSummary")}</span>
          <h3 className={dirClass(bias)}>{biasLabel}</h3>
        </div>
        <div className="summary-grid">
          <div><span>{t("confidence")}</span><strong>{percent(confidence)}</strong></div>
          <div><span>{t("currentWave")}</span><strong>{currentWave}</strong></div>
          <div><span>{t("momentum")}</span><strong className={signal.indicators.macdPositive ? "green" : "red"}>{signal.indicators.macdPositive ? t("strongWord") : t("weak")}</strong></div>
          <div><span>{t("structure")}</span><strong className={dirClass(bias)}>{isBullish ? t("bullish") : isBearish ? t("bearish") : t("wait")}</strong></div>
        </div>
        <div className="confidence-meter"><i style={{ width: percent(confidence) }} /></div>
      </section>

      <section className="market-state-card compact-card">
        <span>{t("priceAction")}</span>
        <strong className={dirClass(bias)}>{biasLabel}</strong>
        <small>{backendAnalysis?.priceAction || signal.priceActionSummary || reopenText}</small>
      </section>

      <section className="analysis-mini-grid">
        <div className="mini-analysis-card">
          <Gauge />
          <span>{t("confluence")}</span>
          <strong>{percent(confidence)}</strong>
          <small>{t("trend")} · {t("smc")} · {t("momentum")} · {t("wave")} · S/R</small>
        </div>
        <div className="mini-analysis-card">
          <BarChart3 />
          <span>{t("goldVsDxy")}</span>
          <strong><b className={dirClass(bias)}>XAUUSD {biasLabel}</b></strong>
          <small>DXY <b className={dxyBias === "BULLISH" ? "red" : dxyBias === "BEARISH" ? "green" : ""}>{dxyBias === "BULLISH" ? t("bullish") : dxyBias === "BEARISH" ? t("bearish") : t("neutral")}</b>{dxyQuote ? ` ${dxyQuote.changePercent > 0 ? "+" : ""}${dxyQuote.changePercent}%` : ""} · {dxyBias === "BEARISH" ? t("supportsGold") : dxyBias === "BULLISH" ? t("pressuresGold") : t("mixed")}</small>
        </div>
      </section>

      <section className="wave-visual-card compact-card">
        <div className="analysis-card-head"><TrendingUp /><div><span>{t("elliottWaves")}</span><h3 className={dirClass(bias)}>{currentWave} {t("impulse")}</h3></div><b>{percent(wave.confidence || confidence)}</b></div>
        <div className="wave-path five">
          {["W1", "W2", "W3", "W4", "W5"].map((w, i) => <div key={w} className={w === currentWave ? "active" : i < 2 ? "done" : ""}>{w}</div>)}
        </div>
        <div className="target-zone"><span>{t("projection")}</span><strong>{target ? `${money(target - Math.abs(target - price) * 0.15)} – ${money(target + Math.abs(target - price) * 0.15)}` : t("wait")}</strong></div>
      </section>

      <section className="wave-visual-card compact-card">
        <div className="analysis-card-head"><Activity /><div><span>{t("abcCorrection")}</span><h3>{t("correctionStatus")}</h3></div><b>{t("watch")}</b></div>
        <div className="wave-path abc">
          {["A", "B", "C"].map((w, i) => <div key={w} className={i === 0 && isBearish ? "active" : ""}>{w}</div>)}
        </div>
      </section>

      <section className="wave-card compact-card">
        <h3 className="section-heading compact-section-heading">● {t("multiTimeframeBias")}</h3>
        <div className="mtf-grid">
          {mtf.map(row => (
            <div className="mtf-card" key={row.tf}>
              <strong>{timeframeLabel(row.tf as any)}</strong>
              <span className={dirClass(row.bias)}>{row.bias}</span>
              <small>{percent(row.confidence)}</small>
              <em>EMA {row.item?.indicators.ema20 ? "✓" : "○"}</em>
              <em>MACD {row.item?.indicators.macdPositive ? "✓" : "○"}</em>
              <em>RSI {row.item?.indicators.rsi ? Math.round(row.item.indicators.rsi) : "○"}</em>
              <em>S&R {row.item?.reasons.some(r => /support|resistance|liquidity|order|gap/i.test(r)) ? "✓" : "○"}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="wave-card compact-card">
        <h3 className="section-heading compact-section-heading">● {t("analysisComponents")}</h3>
        <div className="strategy-grid component-grid">
          {components.map(([name, value]) => (
            <div className="strategy-tile" key={name}>
              <strong>{name}</strong>
              <span className={dirClass(value)}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="analysis-mini-grid">
        <div className="mini-analysis-card">
          <Zap />
          <span>{t("sessionContext")}</span>
          <strong>{t("activeSession")}</strong>
          <small>{t("sessionContextText")}</small>
        </div>
        <div className="mini-analysis-card">
          {isBearish ? <TrendingDown /> : <TrendingUp />}
          <span>{t("newsImpact")}</span>
          <strong className={dirClass(bias)}>{isBullish ? t("bullish") : isBearish ? t("bearish") : t("wait")}</strong>
          <small>{isBullish ? t("newsBullishReason") : isBearish ? t("newsBearishReason") : t("newsNeutralReason")}</small>
        </div>
      </section>
    </main>
  );
}
