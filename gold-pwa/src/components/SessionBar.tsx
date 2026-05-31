import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

function getMarketSession(now: Date, t: (key: any) => string) {
  const day = now.getDay(); // 0 Sunday, 6 Saturday
  const hour = now.getHours();

  // Simple XAUUSD trading-week rule in Kuwait time:
  // closed Saturday and most of Sunday before late open.
  const isClosed =
    day === 6 ||
    (day === 0 && hour < 23) ||
    (day === 5 && hour >= 24);

  if (isClosed) return { label: t("marketClosed"), closed: true };

  if (hour >= 15 && hour < 24) return { label: `US ${t("newYork")}`, closed: false };
  if (hour >= 10 && hour < 18) return { label: `UK ${t("london")}`, closed: false };
  return { label: t("asia"), closed: false };
}

export function SessionBar() {
  const [now, setNow] = useState(new Date());
  const { t } = useLanguage();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const session = getMarketSession(now, t);

  return (
    <section className="session-bar">
      <div className="session-time">
        <Clock size={18} />
        <strong>{now.toLocaleTimeString("en-GB", { hour12: false })}</strong>
        <span>{t("gmt")}</span>
      </div>
      <span className={`session-pill ${session.closed ? "closed" : ""}`}>{session.label}</span>
    </section>
  );
}
