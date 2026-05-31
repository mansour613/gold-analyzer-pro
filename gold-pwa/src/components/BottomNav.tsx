import { BarChart3, Layers3, Newspaper, Activity, Zap } from "lucide-react";
import type { Page } from "../types/market";
import { useLanguage } from "../context/LanguageContext";

const items: Array<{ key: Page; label: "chart" | "signals" | "levels" | "waves" | "ai"; icon: React.ElementType }> = [
  { key: "chart", label: "chart", icon: BarChart3 },
  { key: "signals", label: "signals", icon: Zap },
  { key: "levels", label: "levels", icon: Layers3 },
  { key: "waves", label: "waves", icon: Activity },
  { key: "ai", label: "ai", icon: Newspaper }
];

export function BottomNav({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={page === key ? "active" : ""}
          aria-current={page === key ? "page" : undefined}
          onClick={() => onChange(key)}
        >
          <Icon />
          <span>{t(label)}</span>
        </button>
      ))}
    </nav>
  );
}
