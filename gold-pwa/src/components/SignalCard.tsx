import { Shield, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { Signal } from "../types/market";
import { money } from "../utils/format";
import { timeframeLabel } from "./TimeframeSelector";

function grade(score: number, wait: string) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return wait;
}

function duration(frame: string, expiryMinutes?: number) {
  if (expiryMinutes) {
    if (expiryMinutes < 60) return `${expiryMinutes}m`;
    if (expiryMinutes < 1440) return `${Math.round(expiryMinutes / 60)}h`;
    return `${Math.round(expiryMinutes / 1440)}d`;
  }
  if (["1m", "5m", "15m"].includes(frame)) return "30m–3h";
  if (["30m", "1h"].includes(frame)) return "2–8h";
  if (frame === "4h") return "1–2 days";
  return "2–7 days";
}

function reasonText(reason: string, language: string) {
  if (language !== "ar") return reason;
  const lower = reason.toLowerCase();
  if (lower.includes("not enough")) return "لا توجد بيانات شموع كافية";
  if (lower.includes("ema trend bullish")) return "اتجاه المتوسطات صاعد";
  if (lower.includes("ema trend bearish")) return "اتجاه المتوسطات هابط";
  if (lower.includes("above long-term")) return "السعر أعلى من المتوسط طويل المدى";
  if (lower.includes("below long-term")) return "السعر أسفل المتوسط طويل المدى";
  if (lower.includes("rsi bullish")) return "زخم RSI صاعد";
  if (lower.includes("rsi bearish")) return "ضغط RSI هابط";
  if (lower.includes("bullish candle")) return "شمعة صاعدة قوية";
  if (lower.includes("bearish candle")) return "شمعة هابطة قوية";
  if (lower.includes("structure bullish")) return "هيكل السوق صاعد";
  if (lower.includes("structure bearish")) return "هيكل السوق هابط";
  if (lower.includes("break of structure")) return "تم رصد كسر هيكل";
  if (lower.includes("change of character")) return "تم رصد تغير في السلوك";
  if (lower.includes("fair value gap")) return "تم رصد فجوة قيمة عادلة";
  if (lower.includes("order block")) return "منطقة أوردر بلوك قريبة";
  if (lower.includes("liquidity swept")) return "تم سحب السيولة";
  if (lower.includes("no high-probability")) return "لا توجد فرصة عالية الاحتمال";
  return reason;
}

export function SignalCard({ signal, currentPrice }: { signal: Signal; currentPrice?: number }) {
  const { t, language } = useLanguage();
  const [saved, setSaved] = useState(false);
  const isLong = signal.direction === "LONG";
  const isShort = signal.direction === "SHORT";
  const setup = isLong ? t("longSetup") : isShort ? t("shortSetup") : t("noSetup");
  const colorClass = isLong ? "long" : isShort ? "short" : "none";
  const distance = currentPrice && signal.entry ? Math.abs(currentPrice - signal.entry) : 0;
  const status = signal.direction === "NONE" ? t("wait") : distance <= 1.5 ? t("statusTriggered") : t("statusActive");
  const Icon = isShort ? TrendingDown : TrendingUp;
  const score = Math.max(0, Math.min(100, signal.confluence));

  function saveTrade() {
    const record = {
      id: `${Date.now()}-${signal.timeframe}-${signal.direction}`,
      timestamp: Date.now(),
      timeframe: signal.timeframe,
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      confidence: signal.confluence,
      status: "PLANNED"
    };
    try {
      const key = "gold-analyzer-trade-journal-v1";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([record, ...(Array.isArray(existing) ? existing : [])].slice(0, 250)));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
    }
  }

  const breakdown = [
    [t("trend"), Math.round(score * 0.20), 20],
    [t("structure"), Math.round(score * 0.20), 20],
    ["SMC", Math.round(score * 0.20), 20],
    [t("momentum"), Math.round(score * 0.15), 15],
    [t("elliottWave"), Math.round(score * 0.15), 15],
    ["News/DXY", Math.round(score * 0.10), 10]
  ];

  return (
    <section className={`signal-card compact-signal-card ${colorClass}`}>
      <div className="signal-head compact-signal-head">
        <div className="icon-box"><Icon /></div>
        <div>
          <span>{t("bestSignal")} · {timeframeLabel(signal.timeframe)}</span>
          <h2>{setup}</h2>
        </div>
        <div className="confidence signal-grade">
          <strong>{grade(score, t("wait"))}</strong>
          <small>{score}%</small>
        </div>
      </div>

      <div className="signal-meta-grid">
        <div><span>{t("status")}</span><strong>{status}</strong></div>
        <div><span>{t("duration")}</span><strong>{duration(signal.timeframe, signal.expiryMinutes)}</strong></div>
        <div><span>{t("riskReward")}</span><strong>1:{signal.riskReward ? signal.riskReward.toFixed(1) : "--"}</strong></div>
        <div><span>{t("distanceToEntry")}</span><strong>{distance ? `${distance.toFixed(1)} pts` : "--"}</strong></div>
      </div>

      <div className="progress"><i style={{ width: `${score}%` }} /></div>

      <div className="trade-grid compact-trade-grid">
        <div><span>{t("entry")}</span><strong>{money(signal.entry)}</strong></div>
        <div className="danger"><span><Shield size={14} /> {t("stopLoss")}</span><strong>{money(signal.stopLoss)}</strong></div>
        <div><span><Target size={14} /> {t("tp1")}</span><strong>{money(signal.takeProfit1)}</strong></div>
        <div><span><Target size={14} /> {t("tp2")}</span><strong>{money(signal.takeProfit2)}</strong></div>
      </div>

      <div className="indicator-line">
        <span>RSI <b>{signal.indicators.rsi.toFixed(0)}</b></span>
        <span>MACD <b className={signal.indicators.macdPositive ? "green" : "red"}>{signal.indicators.macdPositive ? t("bullish") : t("bearish")}</b></span>
        <span>EMA <b className={isLong ? "green" : isShort ? "red" : ""}>{isLong ? t("bullish") : isShort ? t("bearish") : t("wait")}</b></span>
      </div>

      <div className="signal-explain">
        <h4>{t("whySignal")}</h4>
        {signal.priceActionSummary && <p>◇ {reasonText(signal.priceActionSummary, language)}</p>}
        {(signal.reasons.length ? signal.reasons : [t("waitingMoreCandles")]).slice(0, 5).map((reason, index) => (
          <p key={index}>✓ {reasonText(reason, language)}</p>
        ))}
        {signal.backtestLite && signal.backtestLite.samples > 4 && (
          <p>✓ Similar setups: {signal.backtestLite.samples} · Win rate: {signal.backtestLite.winRate}%</p>
        )}
      </div>

      <div className="breakdown-grid">
        {breakdown.map(([name, value, max]) => (
          <div key={name as string}><span>{name}</span><strong>{value}/{max}</strong></div>
        ))}
      </div>

      <button className="journal-save-btn" onClick={saveTrade} disabled={signal.direction === "NONE"}>
        {saved ? t("tradeSaved") : t("saveTrade")}
      </button>
    </section>
  );
}
