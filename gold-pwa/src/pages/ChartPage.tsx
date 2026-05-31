import { ChartTimeframeSelector } from "../components/ChartTimeframeSelector";
import { TradingViewChart } from "../components/TradingViewChart";
import { useMarket } from "../context/MarketContext";
import { useLanguage } from "../context/LanguageContext";
import { money } from "../utils/format";

export function ChartPage() {
  const { signal, timeframe, setTimeframe, quote } = useMarket();
  const { t } = useLanguage();
  const hasSignal = signal.direction !== "NONE" && signal.entry > 0;
  const directionLabel = signal.direction === "LONG" ? t("buy") : signal.direction === "SHORT" ? t("sell") : t("wait");
  const stripClass = signal.direction === "LONG" ? "long" : signal.direction === "SHORT" ? "short" : "none";

  return (
    <main className="page chart-page clean-chart-page">
      <ChartTimeframeSelector value={timeframe} onChange={setTimeframe} />

      <section className={`signal-strip ${stripClass}`} aria-label="Active signal summary">
        <span className="signal-direction">{directionLabel}</span>
        <span>{hasSignal ? `${signal.confluence}%` : t("wait")}</span>
        <span>E:{hasSignal ? money(signal.entry) : "--"}</span>
        <span>SL:{hasSignal ? money(signal.stopLoss) : "--"}</span>
        <span>TP:{hasSignal ? money(signal.takeProfit1) : "--"}</span>
      </section>


      <p className="source-note compact-source">{t("feedNote")}</p>

      <TradingViewChart timeframe={timeframe} />
    </main>
  );
}
