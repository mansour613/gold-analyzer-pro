import type { Timeframe } from "../types/market";

const frames: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk"];
const labels: Record<Timeframe, string> = {
  "1m": "1M",
  "5m": "5M",
  "15m": "15M",
  "30m": "30M",
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
  "1wk": "W"
};

export function timeframeLabel(frame: Timeframe) {
  return labels[frame];
}

export function TimeframeSelector({ value, onChange }: { value: Timeframe; onChange: (timeframe: Timeframe) => void }) {
  return (
    <div className="timeframes compact-timeframes">
      {frames.map(frame => (
        <button key={frame} className={value === frame ? "active" : ""} onClick={() => onChange(frame)}>
          {labels[frame]}
        </button>
      ))}
    </div>
  );
}
