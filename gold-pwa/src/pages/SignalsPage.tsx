import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Signal } from "../types/market";
import { SignalCard } from "../components/SignalCard";
import { TimeframeSelector, timeframeLabel } from "../components/TimeframeSelector";
import { useLanguage } from "../context/LanguageContext";
import { useMarket } from "../context/MarketContext";
import { formatHistoryTime, getTodaySignalHistory, summarizeSignalHistory, upsertSignalHistory } from "../services/signalHistory";

function statusLabel(status: string, t: (key: any) => string) {
  if (status === "TP1_HIT" || status === "TP2_HIT") return "TP Hit";
  if (status === "SL_HIT") return "SL Hit";
  if (status === "EXPIRED") return t("statusExpired");
  if (status === "TRIGGERED") return t("statusTriggered");
  return t("statusActive");
}

export function SignalsPage() {
  const { signal, quote, timeframe, setTimeframe, refresh, scanAllSignals, loading, lastUpdated, isDataStale } = useMarket();
  const { t } = useLanguage();
  const [scanned, setScanned] = useState(false);
  const [scanResults, setScanResults] = useState<Signal[]>([]);
  const [scanning, setScanning] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing" | "done">("idle");
  const [alignmentSignals, setAlignmentSignals] = useState<Signal[]>([]);

  useEffect(() => {
    upsertSignalHistory(signal, quote?.price);
  }, [signal, quote?.price]);

  useEffect(() => {
    const update = () => setHistoryTick(value => value + 1);
    window.addEventListener("gold-signal-history-updated", update);
    return () => window.removeEventListener("gold-signal-history-updated", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    scanAllSignals().then(results => {
      if (!cancelled) setAlignmentSignals(results);
    }).catch(() => {
      if (!cancelled) setAlignmentSignals([]);
    });
    return () => { cancelled = true; };
  }, [scanAllSignals, timeframe, quote?.price]);

  const history = useMemo(() => getTodaySignalHistory(timeframe, quote?.price), [timeframe, quote?.price, historyTick]);
  const historySummary = useMemo(() => summarizeSignalHistory(history), [history]);

  const allSignals = useMemo(() => scanned ? scanResults : [signal], [scanned, scanResults, signal]);
  const sortedSignals = [...allSignals].sort((a, b) => b.confluence - a.confluence);
  const bestSignal = sortedSignals[0] || signal;
  const alignmentBase = alignmentSignals.length ? alignmentSignals : sortedSignals;
  const directional = alignmentBase.filter(item => item.direction !== "NONE");
  const dominant = directional.filter(item => item.direction === bestSignal.direction).length;
  const alignmentScore = directional.length ? Math.round((dominant / directional.length) * 100) : 0;
  const signalAgeSeconds = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;

  async function handleRefreshSelected() {
    setRefreshState("refreshing");
    setScanned(false);
    await refresh();
    setHistoryTick(value => value + 1);
    setRefreshState("done");
    window.setTimeout(() => setRefreshState("idle"), 1400);
  }

  async function handleScanAll() {
    setScanning(true);
    await refresh();
    const results = await scanAllSignals();
    results.forEach(item => upsertSignalHistory(item, quote?.price));
    setHistoryTick(value => value + 1);
    setScanResults(results);
    setAlignmentSignals(results);
    setScanned(true);
    setScanning(false);
  }

  return (
    <main className="page signals-page mobile-fit-page">
      <div className="page-title-row compact-title">
        <div>
          <h2>{t("liveSignals")}</h2>
          <p>{t("signalsSub")}</p>
        </div>
      </div>

      <label className="section-label">{t("timeframe")}</label>
      <TimeframeSelector value={timeframe} onChange={(value) => { setScanned(false); setTimeframe(value); }} />

      <button className="primary-btn compact-action scan-compact secondary-refresh" onClick={handleRefreshSelected} disabled={loading || refreshState === "refreshing"}>
        <RefreshCw className={refreshState === "refreshing" ? "spin" : ""} /> {refreshState === "refreshing" ? t("refreshing") : refreshState === "done" ? t("updatedOk") : `${t("refresh")} ${timeframeLabel(timeframe)}`}
      </button>

      {isDataStale && <div className="feed-lock-warning">{t("feedStalePause")}</div>}

      <button className="primary-btn compact-action scan-compact" onClick={handleScanAll} disabled={scanning}>
        <RefreshCw className={scanning ? "spin" : ""} /> {scanning ? t("scanning") : t("scan")}
      </button>

      <section className="signal-freshness-grid">
        <div><span>{t("timeframeSignal")}</span><strong>{timeframeLabel(timeframe)}</strong></div>
        <div><span>{t("signalAge")}</span><strong>{signalAgeSeconds == null ? "--" : signalAgeSeconds < 60 ? `${signalAgeSeconds}s` : `${Math.round(signalAgeSeconds / 60)}m`}</strong></div>
        <div><span>{t("timeframeAlignment")}</span><strong>{alignmentScore}%</strong></div>
      </section>

      <h3 className="section-heading compact-section-heading">● {t("bestSignal")} <span>· {timeframeLabel(bestSignal.timeframe)} {t("setup")}</span></h3>
      {sortedSignals.length > 0 ? (
        sortedSignals.slice(0, scanned ? 6 : 1).map(item => <SignalCard key={`${item.timeframe}-${item.direction}-${item.entry}`} signal={item} currentPrice={quote?.price} />)
      ) : (
        <div className="empty-state compact-empty">{t("noSignals")}</div>
      )}

      <section className="signal-history-card">
        <div className="history-head">
          <div>
            <span>{t("todayHistoryFor")} {timeframeLabel(timeframe)}</span>
            <h3>{historySummary.total} {t("signalsToday")}</h3>
          </div>
          <strong className={historySummary.points >= 0 ? "green" : "red"}>{historySummary.points >= 0 ? "+" : ""}{historySummary.points.toFixed(1)} {t("points")}</strong>
        </div>

        <div className="history-summary-grid">
          <div><span>{t("wins")}</span><strong className="green">{historySummary.wins}</strong></div>
          <div><span>{t("losses")}</span><strong className="red">{historySummary.losses}</strong></div>
          <div><span>{t("active")}</span><strong>{historySummary.active}</strong></div>
          <div><span>{t("winRate")}</span><strong>{historySummary.winRate}%</strong></div>
        </div>

        <div className="history-list">
          {history.length ? history.slice(0, 8).map(item => (
            <div className={`history-row ${item.direction === "LONG" ? "long" : "short"}`} key={item.id}>
              <span>{formatHistoryTime(item.timestamp)}</span>
              <strong>{item.direction === "LONG" ? t("buy") : t("sell")}</strong>
              <small>{t("entry")}: {item.entry.toFixed(2)} · {statusLabel(item.status, t)} · {item.confidence}%</small>
              <em className={item.points >= 0 ? "green" : "red"}>{item.points >= 0 ? "+" : ""}{item.points.toFixed(1)}</em>
            </div>
          )) : (
            <p className="history-empty">{t("noSignalHistory")}</p>
          )}
        </div>
      </section>
    </main>
  );
}
