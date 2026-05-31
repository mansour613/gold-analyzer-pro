import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function getSession(now: Date) {
  const day = now.getDay();
  const hour = now.getHours();
  const closed = day === 6 || (day === 0 && hour < 23);
  if (closed) return { label: "Market Closed", closed };
  if (hour >= 15 && hour < 24) return { label: "New York", closed };
  if (hour >= 10 && hour < 18) return { label: "London", closed };
  return { label: "Asia", closed };
}

export function MarketStatusBadge() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const session = useMemo(() => getSession(now), [now]);
  return (
    <span className={`market-status-badge ${session.closed ? "closed" : "open"}`}>
      <Clock size={12} /> {session.closed ? "Closed" : "Open"} · {session.label}
    </span>
  );
}
