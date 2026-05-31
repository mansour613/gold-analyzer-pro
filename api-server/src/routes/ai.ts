import { Router } from "express";

const router = Router();

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type AiRequest = {
  strategy?: string;
  strategyLabel?: string;
  importance?: string;
  goldOnly?: boolean;
  language?: "en" | "ar";
  timeframe?: string;
  events?: Array<{
    title: string;
    impact: string;
    currency: string;
    time: string;
  }>;
  headlines?: Array<{
    title: string;
    source: string;
    impact: string;
    goldRelevant: boolean;
    tags?: string[];
    time: string;
  }>;
  quote?: {
    price?: number;
    change?: number;
    changePercent?: number;
    dayHigh?: number;
    dayLow?: number;
  };
  signal?: {
    direction?: string;
    timeframe?: string;
    entry?: number;
    stopLoss?: number;
    takeProfit1?: number;
    takeProfit2?: number;
    takeProfit3?: number;
    riskReward?: number;
    confluence?: number;
    confidence?: string;
    reasons?: string[];
  };
  recentCandles?: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
};

function fallback(body: AiRequest, message?: string) {
  const isArabic = body.language === "ar";
  const direction = body.signal?.direction || "NONE";

  return {
    provider: "local-fallback",
    bias: direction === "LONG" ? "BULLISH" : direction === "SHORT" ? "BEARISH" : "NEUTRAL",
    confidence: Number(body.signal?.confluence ?? 0),
    summary:
      message ||
      (isArabic
        ? "التحليل يعمل بوضع احتياطي. تأكد من مفتاح OpenRouter أو جرّب نموذجاً آخر."
        : "Analysis is running in fallback mode. Check your OpenRouter key or try another model."),
    points: isArabic
      ? ["تأكد من OPENROUTER_API_KEY", "جرّب OPENROUTER_MODEL=openrouter/free", "أعد تشغيل الباكند"]
      : ["Check OPENROUTER_API_KEY", "Try OPENROUTER_MODEL=openrouter/free", "Restart backend"],
    riskNote: isArabic ? "هذا تحليل مساعد وليس توصية مالية." : "Assistant analysis only, not financial advice.",
    timestamp: Date.now()
  };
}

function buildMessages(body: AiRequest): ChatMessage[] {
  const lang = body.language === "ar" ? "Arabic" : "English";
  const strategy = body.strategyLabel || body.strategy || "AI News Analyst";
  const recent = (body.recentCandles || []).slice(-12).map((c) => ({
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close
  }));

  const userPrompt = [
    `Selected strategy: ${strategy}`,
    `Strategy id: ${body.strategy || "ict"}`,
    `Importance: ${body.importance || "medium"}`,
    `Gold relevant only: ${body.goldOnly !== false}`,
    `Language: ${lang}`,
    `Timeframe: ${body.timeframe || body.signal?.timeframe || "unknown"}`,
    "",
    "Quote:",
    `Price: ${body.quote?.price ?? "unknown"}`,
    `Change: ${body.quote?.change ?? "unknown"}`,
    `Change Percent: ${body.quote?.changePercent ?? "unknown"}`,
    `Day High: ${body.quote?.dayHigh ?? "unknown"}`,
    `Day Low: ${body.quote?.dayLow ?? "unknown"}`,
    "",
    "Signal:",
    `Direction: ${body.signal?.direction ?? "NONE"}`,
    `Entry: ${body.signal?.entry ?? "unknown"}`,
    `Stop Loss: ${body.signal?.stopLoss ?? "unknown"}`,
    `TP1: ${body.signal?.takeProfit1 ?? "unknown"}`,
    `TP2: ${body.signal?.takeProfit2 ?? "unknown"}`,
    `TP3: ${body.signal?.takeProfit3 ?? "unknown"}`,
    `Risk Reward: ${body.signal?.riskReward ?? "unknown"}`,
    `Confluence: ${body.signal?.confluence ?? 0}`,
    `Confidence: ${body.signal?.confidence ?? "NONE"}`,
    `Reasons: ${(body.signal?.reasons ?? []).join("; ")}`,
    "",
    "Upcoming gold-relevant events JSON:",
    JSON.stringify(body.events || []),
    "",
    "Online gold/USD news headlines JSON:",
    JSON.stringify(body.headlines || []),
    "",
    "Recent candles OHLC JSON:",
    JSON.stringify(recent),
    "",
    "Instructions:",
    "- Focus on today’s gold market, DXY / U.S. dollar impact, USD economic events, and XAU/USD outlook.",
    "- Mention liquidity, order blocks, FVG, or support/resistance only if supported by candle context.",
    "- For Swing Trading: focus on bigger bias and levels.",
    "- For Trend Following: focus on momentum, EMA structure, and invalidation.",
    "- If signal is NONE, say NO TRADE and explain what confirmation is needed.",
    "",
    "Return JSON only with this exact shape:",
    '{"bias":"BULLISH|BEARISH|NEUTRAL","confidence":number,"summary":"string","points":["string"],"riskNote":"string"}'
  ].join("\n");

  return [
    {
      role: "system",
      content: `You are Gold Analyzer AI, a concise XAU/USD trading analyst. Reply in ${lang}. Use the selected strategy. Return JSON only.`
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
}

function parseJsonish(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function callOpenRouter(key: string, model: string, body: AiRequest) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://gold-analyzer-pro.vercel.app",
      "X-Title": "Gold Analyzer Pro"
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(body),
      temperature: 0.25,
      max_tokens: 900
    })
  });

  const data: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `OpenRouter HTTP ${response.status}`);
  }

  const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
  if (!text) throw new Error("OpenRouter returned no text");

  return { text, model };
}

router.post("/analysis", async (req, res) => {
  const body = (req.body ?? {}) as AiRequest;
  const key = process.env.OPENROUTER_API_KEY;

  if (!key || key.includes("your_openrouter_key_here")) {
    return res.json(fallback(body, "OPENROUTER_API_KEY missing in api-server/.env or Render environment variables"));
  }

  const requested = process.env.OPENROUTER_MODEL || "openrouter/free";
  const candidates = Array.from(
    new Set([requested, "openrouter/free", "google/gemma-3-27b-it:free", "qwen/qwen3-32b:free"])
  );

  let lastError = "";

  for (const model of candidates) {
    try {
      const { text, model: usedModel } = await callOpenRouter(key, model, body);
      const parsed = parseJsonish(text);

      if (!parsed) {
        return res.json({
          provider: `openrouter:${usedModel}`,
          bias: "NEUTRAL",
          confidence: Number(body.signal?.confluence ?? 0),
          summary: text,
          points: [],
          riskNote: "",
          timestamp: Date.now()
        });
      }

      return res.json({
        provider: `openrouter:${usedModel}`,
        bias: parsed.bias || "NEUTRAL",
        confidence: Number(parsed.confidence ?? body.signal?.confluence ?? 0),
        summary: String(parsed.summary || ""),
        points: Array.isArray(parsed.points) ? parsed.points.map(String) : [],
        riskNote: String(parsed.riskNote || ""),
        timestamp: Date.now()
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown OpenRouter error";
      if (!lastError.toLowerCase().includes("no endpoints")) break;
    }
  }

  return res.json(fallback(body, lastError || "OpenRouter unavailable. Showing local Gold + DXY news summary fallback."));
});

export default router;
