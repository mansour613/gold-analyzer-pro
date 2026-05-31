import type { Candle } from "../types/market";

export function ema(values: number[], period: number) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const output = [values[0]];
  for (let i = 1; i < values.length; i++) {
    output.push(values[i] * k + output[i - 1] * (1 - k));
  }
  return output;
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  const sample = values.slice(-period - 1);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < sample.length; i++) {
    const diff = sample[i] - sample[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0;
  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }

  const sample = trs.slice(-period);
  return sample.reduce((a, b) => a + b, 0) / sample.length;
}
