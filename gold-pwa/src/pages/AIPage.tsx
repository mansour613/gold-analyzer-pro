import { AlertTriangle, Bot, CalendarDays, Newspaper, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useMarket } from "../context/MarketContext";
import { fetchEconomicEvents, fetchNewsHeadlines, runAiNewsAnalysis, type AiAnalysisResult, type EconomicEvent, type NewsHeadline } from "../services/api";
import type { ImportanceId } from "../types/strategy";

type AiResult = AiAnalysisResult;

export function AIPage() {
  const { t, language } = useLanguage();
  const { quote, signal, candles, timeframe } = useMarket();

  const importanceOptions: Array<{ key: ImportanceId; label: string }> = [
    { key: "low", label: t("low") },
    { key: "medium", label: t("medium") },
    { key: "high", label: t("high") }
  ];

  const [importance, setImportance] = useState<ImportanceId>("medium");
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [result, setResult] = useState<AiResult | null>(null);

  async function loadNews() {
    setNewsLoading(true);
    try {
      const [eventData, headlineData] = await Promise.all([
        fetchEconomicEvents().catch(() => []),
        fetchNewsHeadlines().catch(() => [])
      ]);
      setEvents(eventData);
      setHeadlines(headlineData);
    } finally {
      setNewsLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    const timer = window.setInterval(loadNews, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const rank = { low: 1, medium: 2, high: 3 };
    return events.filter(event => {
      return rank[event.impact] >= rank[importance];
    });
  }, [events, importance]);

  const filteredHeadlines = useMemo(() => {
    const rank = { low: 1, medium: 2, high: 3 };
    return headlines.filter(item => {
      return rank[item.impact] >= rank[importance];
    }).slice(0, 8);
  }, [headlines, importance]);

  const highImpactSoon = useMemo(() => {
    const now = Date.now();
    return events
      .filter(event => event.impact === "high")
      .map(event => ({ ...event, deltaMs: new Date(event.time).getTime() - now }))
      .filter(event => event.deltaMs >= 0 && event.deltaMs <= 2 * 60 * 60 * 1000)
      .sort((a, b) => a.deltaMs - b.deltaMs)[0] || null;
  }, [events]);

  function localNewsFallback(error?: unknown): AiResult {
    const isArabic = language === "ar";
    const direction = signal.direction === "LONG" ? (isArabic ? "صاعد" : "BULLISH") : signal.direction === "SHORT" ? (isArabic ? "هابط" : "BEARISH") : (isArabic ? "محايد" : "NEUTRAL");
    const headlineText = filteredHeadlines.slice(0, 3).map(item => item.title).join(" • ");
    const eventText = filteredEvents.slice(0, 3).map(item => `${item.currency}: ${item.title}`).join(" • ");
    return {
      provider: "local-fallback",
      bias: direction,
      confidence: Math.max(35, Math.min(80, signal.confluence || 55)),
      summary: isArabic
        ? `الذكاء الاصطناعي المباشر غير متاح حالياً، لذلك تم إنشاء ملخص محلي من أخبار اليوم. اتجاه الذهب الحالي: ${direction}. راقب الدولار DXY والأخبار الأمريكية قبل الدخول.`
        : `Live AI is unavailable, so this local summary is built from today's headlines. Current gold outlook: ${direction}. Watch DXY and U.S. data before entering.`,
      points: isArabic
        ? [headlineText || "لا توجد عناوين كافية حالياً.", eventText || "لا توجد أحداث أمريكية عالية التأثير حالياً.", "تأكد من قوة الدولار قبل تأكيد إشارة الذهب."]
        : [headlineText || "Not enough headlines loaded yet.", eventText || "No major USD event loaded yet.", "Confirm DXY direction before trusting the gold signal."],
      riskNote: isArabic ? "للتعليم فقط وليس نصيحة مالية." : "Educational only, not financial advice.",
      error: error instanceof Error ? error.message : undefined
    };
  }

  async function runAiAnalysis() {
    setLoading(true);
    setResult(null);

    try {
      const data = await runAiNewsAnalysis({
        strategy: "daily_news_gold_dxy",
        strategyLabel: language === "ar" ? "محلل أخبار الذهب وDXY اليومي" : "AI News Analyst: Gold + DXY Daily Summary",
        importance,
        goldOnly: false,
        language,
        quote,
        signal,
        timeframe,
        recentCandles: candles.slice(-30),
        events: filteredEvents.slice(0, 5),
        headlines: filteredHeadlines.slice(0, 8)
      });
      setResult(data?.summary ? data : localNewsFallback());
    } catch (error) {
      setResult(localNewsFallback(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page ai-page ai-compact-page">
      <div className="ai-title compact">
        <Sparkles />
        <div>
          <h2>{t("news")}</h2>
          <p>{t("aiSub")}</p>
        </div>
      </div>

      <div className="news-controls compact-controls">
        <div className="importance">
          {importanceOptions.map(option => (
            <button key={option.key} className={importance === option.key ? "active" : ""} onClick={() => setImportance(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
        <button className="square" onClick={loadNews} disabled={newsLoading || loading}>
          <RefreshCw className={newsLoading ? "spin" : ""} />
        </button>
      </div>

      {highImpactSoon ? (
        <section className="news-warning-card">
          <strong>⚠ {t("highImpactNews")}</strong>
          <span>{highImpactSoon.title}</span>
          <small>{t("signalRiskElevated")} · {t("inTime")} {Math.max(1, Math.round(highImpactSoon.deltaMs / 60000))}m</small>
        </section>
      ) : (
        <section className="news-warning-card calm">
          <strong>{t("noHighImpactNews")}</strong>
        </section>
      )}

      <button className="primary-btn compact-ai-btn" onClick={runAiAnalysis} disabled={loading}>
        <Sparkles /> {loading ? "..." : t("summarizeToday")}
      </button>

      {result && (
        <section className="ai-result-card compact-result">
          <div className="ai-result-head">
            <Bot />
            <div>
              <span>{result.provider === "local-fallback" ? t("aiFallback") : (result.provider || "AI")} · {t("aiNews")}</span>
              <h3>{`${result.bias || t("neutral")} · ${result.confidence ?? 0}%`}</h3>
            </div>
          </div>

          <p className="ai-summary">{result.summary || t("noAiSummary")}</p>
          {!!result.points?.length && (
            <ul>
              {result.points.map((point, index) => <li key={index}>{point}</li>)}
            </ul>
          )}
          {result.provider === "local-fallback" && result.error && <p className="ai-risk muted-note">{t("aiFallback")}: {result.error}</p>}
          {result.riskNote && <p className="ai-risk">{result.riskNote}</p>}
        </section>
      )}

      <h3 className="section-heading compact-events"><Newspaper size={16} /> {t("todayGoldDxyNews")} ({filteredHeadlines.length})</h3>
      <div className="event-list">
        {filteredHeadlines.length ? filteredHeadlines.map(item => (
          <a className={`event-row ${item.impact}`} key={item.id} href={item.url} target="_blank" rel="noreferrer">
            <strong>{item.title}</strong>
            <span>{item.source} · {t(item.impact)} · {new Date(item.time).toLocaleString()}</span>
          </a>
        )) : (
          <div className="empty-state compact-empty">
            <AlertTriangle />
            <p>{t("noOnlineNews")}</p>
          </div>
        )}
      </div>

      <h3 className="section-heading compact-events"><CalendarDays size={16} /> {t("events")} ({filteredEvents.length})</h3>
      <div className="event-list">
        {filteredEvents.length ? filteredEvents.map(event => (
          <div className={`event-row ${event.impact}`} key={event.id}>
            <strong>{event.title}</strong>
            <span>{event.currency} · {t(event.impact)} · {new Date(event.time).toLocaleString()}</span>
          </div>
        )) : (
          <div className="empty-state compact-empty">
            <AlertTriangle />
            <p>{t("noEvents")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
