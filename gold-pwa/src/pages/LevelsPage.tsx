import { RefreshCw } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { TimeframeSelector } from "../components/TimeframeSelector";
import { useLanguage } from "../context/LanguageContext";
import { useMarket } from "../context/MarketContext";
import { detectSmartLevels, pivots } from "../services/levelsEngine";
import { fetchBackendLevels, type BackendLevelResult } from "../services/api";
import { money, timeAgo } from "../utils/format";

function strengthText(value: number, t: (key: any) => string) {
  if (value >= 70) return t("strongWord");
  if (value >= 40) return t("mediumWord");
  return t("weak");
}

function riskText(distance: number, t: (key: any) => string) {
  if (distance <= 5) return t("highWord");
  if (distance <= 15) return t("mediumWord");
  return t("lowWord");
}

function previousDayOHLC(candles: any[], fallbackPrice: number) {
  if (!candles.length) return { high: fallbackPrice, low: fallbackPrice, close: fallbackPrice };
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const lastDay = new Date(sorted[sorted.length - 1].time).toISOString().slice(0, 10);
  const previous = sorted.filter(c => new Date(c.time).toISOString().slice(0, 10) < lastDay);
  const source = previous.length >= 3 ? previous.filter(c => new Date(c.time).toISOString().slice(0, 10) === new Date(previous[previous.length - 1].time).toISOString().slice(0, 10)) : sorted.slice(-96);
  return {
    high: Math.max(...source.map(c => c.high)),
    low: Math.min(...source.map(c => c.low)),
    close: source[source.length - 1]?.close ?? fallbackPrice
  };
}

function getSessionLevels(candles: any[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayCandles = candles.filter(c => new Date(c.time).toISOString().slice(0, 10) === today);
  const session = (start: number, end: number) => {
    const rows = todayCandles.filter(c => {
      const h = new Date(c.time).getUTCHours();
      return start <= end ? h >= start && h < end : h >= start || h < end;
    });
    if (!rows.length) return null;
    return { high: Math.max(...rows.map(c => c.high)), low: Math.min(...rows.map(c => c.low)) };
  };
  return {
    asia: session(0, 8),
    london: session(7, 16),
    ny: session(13, 22)
  };
}

export function LevelsPage() {
  const { quote, candles, timeframe, setTimeframe, refresh, lastUpdated, loading } = useMarket();
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "done">("idle");
  const [backendLevels, setBackendLevels] = useState<BackendLevelResult | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const { t } = useLanguage();
  const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
  const price = isPositive(backendLevels?.price) ? backendLevels.price : isPositive(quote?.price) ? quote.price : isPositive(candles[candles.length - 1]?.close) ? candles[candles.length - 1].close : 0;
  const hasBackendLevels = Boolean(backendLevels && isPositive(backendLevels.price) && backendLevels.pivots?.every(level => isPositive(level.value)));

  useEffect(() => {
    let cancelled = false;
    fetchBackendLevels(timeframe).then(data => {
      if (!cancelled) { setBackendLevels(data); setBackendError(null); }
    }).catch(err => { if (!cancelled) setBackendError(err instanceof Error ? err.message : "Levels unavailable"); });
    return () => { cancelled = true; };
  }, [timeframe, lastUpdated]);
  const ohlc = previousDayOHLC(candles, price);
  const high = isPositive(backendLevels?.reference?.high) ? backendLevels!.reference.high : isPositive(ohlc.high) ? ohlc.high : isPositive(quote?.dayHigh) ? quote!.dayHigh : 0;
  const low = isPositive(backendLevels?.reference?.low) ? backendLevels!.reference.low : isPositive(ohlc.low) ? ohlc.low : isPositive(quote?.dayLow) ? quote!.dayLow : 0;
  const close = isPositive(backendLevels?.reference?.close) ? backendLevels!.reference.close : isPositive(ohlc.close) ? ohlc.close : price;
  const canCalculateLevels = isPositive(price) && isPositive(high) && isPositive(low) && isPositive(close) && high > low;
  const p = canCalculateLevels ? pivots(high, low, close) : { pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  const sessionLevels = getSessionLevels(candles);
  const smartLevels = detectSmartLevels(candles, price);
  const displaySmartLevels = backendLevels?.smartLevels?.map(l => ({ kind: l.kind as any, price: l.price, strength: l.strength, touches: l.touches })) || smartLevels;
  const resistances = smartLevels.filter(l => l.kind === "RESISTANCE" && l.price > price).sort((a, b) => a.price - b.price);
  const supports = smartLevels.filter(l => l.kind === "SUPPORT" && l.price < price).sort((a, b) => b.price - a.price);
  const nearestResistance = isPositive(backendLevels?.summary.nearestResistance) ? backendLevels!.summary.nearestResistance : isPositive(resistances[0]?.price) ? resistances[0].price : canCalculateLevels ? p.r1 : 0;
  const nearestSupport = isPositive(backendLevels?.summary.nearestSupport) ? backendLevels!.summary.nearestSupport : isPositive(supports[0]?.price) ? supports[0].price : canCalculateLevels ? p.s1 : 0;
  const range = isPositive(backendLevels?.summary.range) ? backendLevels!.summary.range : (isPositive(nearestResistance) && isPositive(nearestSupport) ? nearestResistance - nearestSupport : 0);
  const bias = backendLevels?.summary.bias === "BULLISH" ? t("bullish") : backendLevels?.summary.bias === "BEARISH" ? t("bearish") : canCalculateLevels && price > p.pp ? t("bullish") : canCalculateLevels && price < p.pp ? t("bearish") : t("neutral");

  const levels = hasBackendLevels ? backendLevels!.pivots : canCalculateLevels ? [
    { name: "R3", value: p.r3, type: "resistance", distance: p.r3 - price },
    { name: "R2", value: p.r2, type: "resistance", distance: p.r2 - price },
    { name: "R1", value: p.r1, type: "resistance", distance: p.r1 - price },
    { name: "PP", value: p.pp, type: "pivot", distance: p.pp - price },
    { name: "S1", value: p.s1, type: "support", distance: p.s1 - price },
    { name: "S2", value: p.s2, type: "support", distance: p.s2 - price },
    { name: "S3", value: p.s3, type: "support", distance: p.s3 - price }
  ] : [];

  const nearestAction = backendLevels?.nearestAction
    ? { level: backendLevels.nearestAction.side === "RESISTANCE" ? "R" : "S", distance: backendLevels.nearestAction.distance, text: backendLevels.nearestAction.text, side: backendLevels.nearestAction.side === "RESISTANCE" ? "red" : "green" }
    : !canCalculateLevels || !isPositive(nearestResistance) || !isPositive(nearestSupport)
      ? { level: "--", distance: 0, text: t("levelsUnavailable"), side: "" }
      : Math.abs(nearestResistance - price) <= Math.abs(price - nearestSupport)
        ? { level: "R1", distance: Math.abs(nearestResistance - price), text: t("resistanceAhead"), side: "red" }
        : { level: "S1", distance: Math.abs(price - nearestSupport), text: t("supportHolding"), side: "green" };

  async function handleRefresh() {
    setRefreshState("refreshing");
    await refresh();
    await fetchBackendLevels(timeframe).then(data => { setBackendLevels(data); setBackendError(null); }).catch(err => setBackendError(err instanceof Error ? err.message : "Levels unavailable"));
    setRefreshState("done");
    window.setTimeout(() => setRefreshState("idle"), 1400);
  }

  const sessionAsia = backendLevels?.sessions.asia || sessionLevels.asia;
  const sessionLondon = backendLevels?.sessions.london || sessionLevels.london;
  const sessionNy = backendLevels?.sessions.ny || sessionLevels.ny;

  const fibBaseHigh = high || price + 20;
  const fibBaseLow = low || price - 20;
  const fibRange = fibBaseHigh - fibBaseLow;
  const fibs = backendLevels?.fibonacci.levels || [0.236, 0.382, 0.5, 0.618, 0.786].map(ratio => ({
    ratio,
    price: fibBaseHigh - fibRange * ratio
  }));
  const currentFib = backendLevels?.fibonacci.currentZone || fibs.reduce((best, item) => Math.abs(item.price - price) < Math.abs(best.price - price) ? item : best, fibs[0]);

  return (
    <main className="page levels-page mobile-fit-page">
      <div className="page-title-row compact-title">
        <div>
          <h2>{t("keyLevels")}</h2>
          <p>{lastUpdated ? `${t("updated")} ${timeAgo(lastUpdated, t("notUpdated"))}` : t("notUpdated")}</p>
        </div>
        <strong className="price-badge">XAUUSD<br /><span>{price > 0 ? money(price) : "--"}</span></strong>
      </div>

      <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      <button className="primary-btn compact-action" onClick={handleRefresh} disabled={loading || refreshState === "refreshing"}><RefreshCw className={refreshState === "refreshing" ? "spin" : ""} /> {refreshState === "refreshing" ? t("refreshing") : refreshState === "done" ? t("updatedOk") : t("refresh")}</button>
      {backendError && <div className="empty-state compact-empty">{backendError}</div>}

      <section className="levels-summary-card compact-card">
        <span>{t("levelsSummary")}</span>
        <div className="summary-grid">
          <div><small>{t("current")}</small><strong>{price > 0 ? money(price) : "--"}</strong></div>
          <div><small>{t("nearestResistance")}</small><strong className="red">{isPositive(nearestResistance) ? money(nearestResistance) : "--"}</strong></div>
          <div><small>{t("nearestSupport")}</small><strong className="green">{isPositive(nearestSupport) ? money(nearestSupport) : "--"}</strong></div>
          <div><small>{t("range")}</small><strong>{range ? `${range.toFixed(1)} ${t("points")}` : "--"}</strong></div>
          <div><small>{t("bias")}</small><strong className={bias === t("bullish") ? "green" : bias === t("bearish") ? "red" : ""}>{bias}</strong></div>
        </div>
      </section>

      <section className="nearest-action-card compact-card">
        <span>{t("nearestAction")}</span>
        <strong className={nearestAction.side}>{nearestAction.level === "--" ? "--" : `${nearestAction.level} · ${nearestAction.distance.toFixed(1)} ${t("points")}`}</strong>
        <small>{nearestAction.text}</small>
      </section>

      <h3 className="section-heading compact-section-heading">● {t("pivotLevels")} <span>{isPositive(high) && isPositive(low) ? `${t("highWord")} ${money(high)} · ${t("lowWord")} ${money(low)}` : "--"}</span></h3>
      <div className="level-list compact-level-list pivot-compact-list">
        {!levels.length && <div className="empty-state compact-empty">{t("levelsUnavailable")}</div>}
        {levels.map((level, index) => {
          const next = levels[index + 1];
          const showCurrent = price && next && level.value >= price && next.value <= price;
          return (
            <Fragment key={level.name}>
              <div className={`level-row ${level.type}`}>
                <b className={`tag ${level.name}`}>{level.name}</b>
                <strong>{money(level.value)}</strong>
                <span>{price ? `${level.value >= price ? "+" : "-"}${Math.abs(level.value - price).toFixed(1)} ${t("points")}` : "--"}</span>
              </div>
              {showCurrent && (
                <div className="level-current-marker">
                  <b>● {t("currentMarker")}</b>
                  <strong>{money(price)}</strong>
                  <span>{t("freshData")}</span>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <h3 className="section-heading compact-section-heading red">● {t("smartSr")}</h3>
      <div className="sr-card-grid">
        {displaySmartLevels.length > 0 ? displaySmartLevels.slice(0, 6).map((level, index) => {
          const distance = Math.abs(level.price - price);
          return (
            <div className={`sr-card ${level.kind === "RESISTANCE" ? "resistance" : "support"}`} key={index}>
              <span>{level.kind === "RESISTANCE" ? t("resistance") : t("support")}</span>
              <strong>{money(level.price)}</strong>
              <small>{distance.toFixed(1)} pts</small>
              <div><b>{t("strength")}</b><em>{strengthText(level.strength, t)}</em></div>
              <div><b>{t("touches")}</b><em>{level.touches}</em></div>
              <div><b>{t("breakoutRisk")}</b><em>{riskText(distance, t)}</em></div>
            </div>
          );
        }) : (
          <div className="empty-state compact-empty">{t("waitingMoreCandles")}</div>
        )}
      </div>

      <h3 className="section-heading compact-section-heading">● {t("fibonacciConfluence")}</h3>
      <section className="fibo-card compact-card">
        <div className="target-zone"><span>{t("currentZone")}</span><strong>{currentFib ? `${currentFib.ratio.toFixed(3)} ${t("retracement")}` : t("wait")}</strong></div>
        <div className="fibo-grid">
          {fibs.map(fib => (
            <div key={fib.ratio} className={currentFib?.ratio === fib.ratio ? "active" : ""}>
              <span>{fib.ratio.toFixed(3)}</span>
              <strong>{money(fib.price)}</strong>
            </div>
          ))}
        </div>
      </section>

      <h3 className="section-heading compact-section-heading">● {t("sessionLevels")}</h3>
      <div className="session-level-grid">
        <div><span>{t("asiaHigh")}</span><strong>{sessionAsia ? money(sessionAsia.high) : "--"}</strong></div>
        <div><span>{t("asiaLow")}</span><strong>{sessionAsia ? money(sessionAsia.low) : "--"}</strong></div>
        <div><span>{t("londonHigh")}</span><strong>{sessionLondon ? money(sessionLondon.high) : "--"}</strong></div>
        <div><span>{t("londonLow")}</span><strong>{sessionLondon ? money(sessionLondon.low) : "--"}</strong></div>
        <div><span>{t("nyHigh")}</span><strong>{sessionNy ? money(sessionNy.high) : "--"}</strong></div>
        <div><span>{t("nyLow")}</span><strong>{sessionNy ? money(sessionNy.low) : "--"}</strong></div>
      </div>
    </main>
  );
}
