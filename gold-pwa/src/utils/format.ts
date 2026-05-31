export function money(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "--";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "--";
  return `${Number(value).toFixed(3)}%`;
}

export function timeAgo(timestamp: number | null, fallback: string) {
  if (!timestamp) return fallback;
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}
