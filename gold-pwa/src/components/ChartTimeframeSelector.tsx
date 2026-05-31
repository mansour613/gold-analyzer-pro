import type { Timeframe } from "../types/market";
import { timeframeLabel } from "./TimeframeSelector";

const frames: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk"];

export function ChartTimeframeSelector({ value, onChange }: { value: Timeframe; onChange: (timeframe: Timeframe) => void }) {
  return (
    <div className="chart-timeframes single-line">
      {frames.map(frame => (
        <button key={frame} className={value === frame ? "active" : ""} onClick={() => onChange(frame)}>
          {timeframeLabel(frame)}
        </button>
      ))}
    </div>
  );
}
