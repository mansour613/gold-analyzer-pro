import { useEffect, useMemo, useRef } from "react";
import { CandlestickData, ColorType, createChart, IChartApi, IPriceLine, ISeriesApi, LineStyle, Time } from "lightweight-charts";
import { useLanguage } from "../context/LanguageContext";
import type { Candle } from "../types/market";

export type ChartLevelLine = {
  price: number;
  title: string;
  kind: "resistance" | "support" | "current" | "fib" | "pivot";
};

function valid(c: Candle | undefined): c is Candle {
  return Boolean(
    c &&
    Number.isFinite(c.time) &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

function levelColor(kind: ChartLevelLine["kind"]) {
  if (kind === "resistance") return "#ff5b68";
  if (kind === "support") return "#17d68a";
  if (kind === "fib") return "#ffb000";
  if (kind === "pivot") return "#e2e8f0";
  return "#ffffff";
}

export function GoldChart({ candles, levels = [] }: { candles: Candle[]; levels?: ChartLevelLine[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const { t } = useLanguage();

  const data = useMemo<CandlestickData[]>(() => {
    return candles
      .filter(valid)
      .map(c => ({
        time: Math.floor(c.time / 1000) as Time,
        open: c.open,
        high: Math.max(c.high, c.open, c.close),
        low: Math.min(c.low, c.open, c.close),
        close: c.close
      }))
      .sort((a, b) => Number(a.time) - Number(b.time));
  }, [candles]);

  useEffect(() => {
    if (!mountRef.current) return;

    const chart = createChart(mountRef.current, {
      height: mountRef.current.clientHeight || 620,
      layout: {
        background: { type: ColorType.Solid, color: "#070b16" },
        textColor: "#9ca3af"
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,.08)" },
        horzLines: { color: "rgba(148,163,184,.10)" }
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,.16)", scaleMargins: { top: 0.10, bottom: 0.12 } },
      timeScale: { borderColor: "rgba(148,163,184,.16)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#17d68a",
      downColor: "#ff5b68",
      borderUpColor: "#17d68a",
      borderDownColor: "#ff5b68",
      wickUpColor: "#17d68a",
      wickDownColor: "#ff5b68",
      priceLineVisible: true,
      lastValueVisible: true
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      if (!mountRef.current) return;
      chart.applyOptions({ width: mountRef.current.clientWidth, height: mountRef.current.clientHeight || 620 });
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    priceLinesRef.current.forEach(line => series.removePriceLine(line));
    priceLinesRef.current = [];

    levels
      .filter(level => Number.isFinite(level.price) && level.price > 0)
      .forEach(level => {
        const color = levelColor(level.kind);
        priceLinesRef.current.push(series.createPriceLine({
          price: level.price,
          color,
          lineWidth: level.kind === "current" ? 2 : 1,
          lineStyle: level.kind === "fib" ? LineStyle.Dotted : LineStyle.Solid,
          axisLabelVisible: true,
          title: level.title
        }));
      });
  }, [levels]);

  return (
    <div className="chart-panel clean-lw-chart">
      {data.length === 0 && <div className="chart-empty">{t("waitingCandles")}</div>}
      <div ref={mountRef} className="chart-mount" />
    </div>
  );
}
