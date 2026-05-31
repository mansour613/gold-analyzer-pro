import { useEffect, useRef } from "react";
import type { Timeframe } from "../types/market";

const intervalMap: Record<Timeframe, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1d": "D",
  "1wk": "W"
};

export function TradingViewChart({ timeframe }: { timeframe: Timeframe }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "FUSIONMARKETS:XAUUSD",
      interval: intervalMap[timeframe],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_side_toolbar: true,
      hide_top_toolbar: true,
      hide_legend: true,
      disabled_features: ["left_toolbar", "header_widget", "header_symbol_search", "header_compare", "header_indicators", "header_screenshot", "header_settings", "timeframes_toolbar", "edit_buttons_in_legend"],
      withdateranges: false,
      save_image: false,
      details: false,
      hotlist: false,
      hide_volume: true,
      studies: []
    });

    container.appendChild(widgetContainer);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [timeframe]);

  return (
    <div className="tv-chart-shell clean-tv">
      <div ref={containerRef} className="tradingview-widget-container tv-widget" />
    </div>
  );
}
