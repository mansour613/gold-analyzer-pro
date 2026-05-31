export type StrategyId = "ict" | "news_scalping" | "swing" | "trend";
export type ImportanceId = "low" | "medium" | "high";
export type SignalFilter = "all" | "bullish" | "bearish" | "strong";

export const STRATEGY_LABELS: Record<StrategyId, { en: string; ar: string }> = {
  ict: { en: "ICT / Smart Money", ar: "ICT / المال الذكي" },
  news_scalping: { en: "News Scalping", ar: "سكالبينج الأخبار" },
  swing: { en: "Swing Trading", ar: "تداول سوينغ" },
  trend: { en: "Trend Following", ar: "تتبع الاتجاه" }
};

export function strategyLabel(id: StrategyId, language: "en" | "ar") {
  return STRATEGY_LABELS[id][language];
}
