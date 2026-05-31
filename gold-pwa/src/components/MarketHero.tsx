import { AlertTriangle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useMarket } from "../context/MarketContext";
import { money, pct, timeAgo } from "../utils/format";

function getSessionLabel(now: Date, t: (key: any) => string) {
  const day = now.getDay();
  const hour = now.getHours();

  const isClosed = day === 6 || (day === 0 && hour < 23);
  if (isClosed) return { label: t("marketClosed") || "Market Closed", closed: true };

  if (hour >= 15 && hour < 24) return { label: `US ${t("newYork")}`, closed: false };
  if (hour >= 10 && hour < 18) return { label: `UK ${t("london")}`, closed: false };
  return { label: t("asia"), closed: false };
}

export function MarketHero() {
  const { quote, error, lastUpdated, isDataStale, dataAgeSeconds, dataSource } = useMarket();
  const { t } = useLanguage();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const session = getSessionLabel(now, t);

  return (
    <section className="market-hero compact-hero no-top-session">
      <div className="hero-main">
        <span className="hero-label">〽 {t("liveXau")}</span>
        <div className="hero-price-row">
          <h2>{money(quote?.price)}</h2>
          {quote && (
            <p className={quote.change >= 0 ? "green" : "red"}>
              {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}{pct(quote.changePercent)})
            </p>
          )}
        </div>
        {error && <div className="error-banner"><AlertTriangle size={16} /> {error}</div>}
        {isDataStale && (
          <div className="error-banner stale-warning"><AlertTriangle size={16} /> {t("dataStale")} · {t("dataAge")} {dataAgeSeconds ? Math.round(dataAgeSeconds / 60) : "--"}m</div>
        )}
      </div>

      <div className="hero-compact-grid">
        <div>
          <span>{t("dayHigh")}</span>
          <strong>{money(quote?.dayHigh)}</strong>
        </div>
        <div>
          <span>{t("dayLow")}</span>
          <strong>{money(quote?.dayLow)}</strong>
        </div>
        <div className={`session-card ${session.closed ? "closed" : ""}`}>
          <span>{t("status")}</span>
          <strong className="status-time">
            <Clock size={14} />
            {now.toLocaleTimeString("en-GB", { hour12: false })}
            <em>{t("gmt")}</em>
          </strong>
          <b>{session.label}</b>
          <small>{t("updated")} {timeAgo(lastUpdated, t("notUpdated"))} · {t("backendFeed")}</small>
        </div>
      </div>
    </section>
  );
}
