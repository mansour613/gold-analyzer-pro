import type { Direction, Signal, Timeframe } from "../types/market";

export type SignalHistoryStatus = "ACTIVE" | "TRIGGERED" | "TP1_HIT" | "TP2_HIT" | "SL_HIT" | "EXPIRED" | "NONE";

export interface SignalHistoryRecord {
  id: string;
  date: string;
  timestamp: number;
  timeframe: Timeframe;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  confidence: number;
  grade: string;
  status: SignalHistoryStatus;
  points: number;
  reason: string;
  source: "local" | "supabase";
}

export interface SignalHistorySummary {
  total: number;
  wins: number;
  losses: number;
  active: number;
  expired: number;
  winRate: number;
  points: number;
}

const STORAGE_KEY = "gold-analyzer-signal-history-v1";

function localDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundPrice(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export function signalGrade(confidence: number) {
  if (confidence >= 90) return "A+";
  if (confidence >= 80) return "A";
  if (confidence >= 70) return "B";
  if (confidence >= 60) return "C";
  return "D";
}

function makeSignalId(signal: Signal, timestamp = Date.now()) {
  const bucket = Math.floor(timestamp / (10 * 60 * 1000));
  return [
    localDateKey(timestamp),
    signal.timeframe,
    signal.direction,
    roundPrice(signal.entry),
    roundPrice(signal.stopLoss),
    roundPrice(signal.takeProfit1),
    bucket
  ].join("-");
}

export function calculateSignalStatus(record: SignalHistoryRecord, currentPrice?: number | null): Pick<SignalHistoryRecord, "status" | "points"> {
  if (record.direction === "NONE") return { status: "NONE", points: 0 };
  if (!currentPrice || !Number.isFinite(currentPrice)) return { status: record.status || "ACTIVE", points: record.points || 0 };

  const price = currentPrice;
  const tp1Points = Math.abs(record.takeProfit1 - record.entry);
  const tp2Points = Math.abs(record.takeProfit2 - record.entry);
  const slPoints = Math.abs(record.entry - record.stopLoss);

  if (record.direction === "LONG") {
    if (price >= record.takeProfit2) return { status: "TP2_HIT", points: roundPrice(tp2Points) };
    if (price >= record.takeProfit1) return { status: "TP1_HIT", points: roundPrice(tp1Points) };
    if (price <= record.stopLoss) return { status: "SL_HIT", points: -roundPrice(slPoints) };
    if (price >= record.entry) return { status: "TRIGGERED", points: 0 };
    return { status: "ACTIVE", points: 0 };
  }

  if (price <= record.takeProfit2) return { status: "TP2_HIT", points: roundPrice(tp2Points) };
  if (price <= record.takeProfit1) return { status: "TP1_HIT", points: roundPrice(tp1Points) };
  if (price >= record.stopLoss) return { status: "SL_HIT", points: -roundPrice(slPoints) };
  if (price <= record.entry) return { status: "TRIGGERED", points: 0 };
  return { status: "ACTIVE", points: 0 };
}

export function readSignalHistory(): SignalHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSignalHistory(records: SignalHistoryRecord[]) {
  const trimmed = records
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent("gold-signal-history-updated"));
}

export function upsertSignalHistory(signal: Signal, currentPrice?: number | null) {
  if (signal.direction === "NONE" || !signal.entry || !signal.stopLoss || !signal.takeProfit1) return null;

  const timestamp = Date.now();
  const id = makeSignalId(signal, timestamp);
  const records = readSignalHistory();
  const existingIndex = records.findIndex(item => item.id === id);
  const baseRecord: SignalHistoryRecord = {
    id,
    date: localDateKey(timestamp),
    timestamp,
    timeframe: signal.timeframe,
    direction: signal.direction,
    entry: roundPrice(signal.entry),
    stopLoss: roundPrice(signal.stopLoss),
    takeProfit1: roundPrice(signal.takeProfit1),
    takeProfit2: roundPrice(signal.takeProfit2),
    confidence: Math.round(signal.confluence),
    grade: signalGrade(signal.confluence),
    status: "ACTIVE",
    points: 0,
    reason: signal.reasons[0] || "Live candle setup",
    source: "local"
  };
  const outcome = calculateSignalStatus(baseRecord, currentPrice);
  const nextRecord = { ...baseRecord, ...outcome };

  if (existingIndex >= 0) {
    records[existingIndex] = { ...records[existingIndex], ...nextRecord, timestamp: records[existingIndex].timestamp };
  } else {
    records.unshift(nextRecord);
  }

  writeSignalHistory(records);
  syncSignalToSupabase(nextRecord);
  return nextRecord;
}

export function getTodaySignalHistory(timeframe: Timeframe, currentPrice?: number | null) {
  const today = localDateKey();
  const records = readSignalHistory()
    .filter(item => item.date === today && item.timeframe === timeframe)
    .map(item => ({ ...item, ...calculateSignalStatus(item, currentPrice) }))
    .sort((a, b) => b.timestamp - a.timestamp);

  return records;
}

export function summarizeSignalHistory(records: SignalHistoryRecord[]): SignalHistorySummary {
  const wins = records.filter(item => item.status === "TP1_HIT" || item.status === "TP2_HIT").length;
  const losses = records.filter(item => item.status === "SL_HIT").length;
  const expired = records.filter(item => item.status === "EXPIRED").length;
  const active = records.filter(item => item.status === "ACTIVE" || item.status === "TRIGGERED").length;
  const completed = wins + losses;
  const points = roundPrice(records.reduce((sum, item) => sum + (item.points || 0), 0));
  return {
    total: records.length,
    wins,
    losses,
    active,
    expired,
    winRate: completed ? Math.round((wins / completed) * 100) : 0,
    points
  };
}

export function formatHistoryTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

async function syncSignalToSupabase(record: SignalHistoryRecord) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return;

  try {
    await fetch(`${String(supabaseUrl).replace(/\/$/, "")}/rest/v1/signal_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: record.id,
        signal_date: record.date,
        generated_at: new Date(record.timestamp).toISOString(),
        timeframe: record.timeframe,
        direction: record.direction,
        entry: record.entry,
        stop_loss: record.stopLoss,
        take_profit_1: record.takeProfit1,
        take_profit_2: record.takeProfit2,
        confidence: record.confidence,
        grade: record.grade,
        status: record.status,
        points: record.points,
        reason: record.reason
      })
    });
  } catch {
    // Supabase sync is optional. Local history remains the offline-first source.
  }
}
