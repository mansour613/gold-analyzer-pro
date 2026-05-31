import { Router } from "express";

const router = Router();

type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  time: string;
  impact: "low" | "medium" | "high";
  goldRelevant: boolean;
  tags: string[];
};

function nextEventDate(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString();
}

function escapeXml(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function tagImpact(title: string): { impact: "low" | "medium" | "high"; goldRelevant: boolean; tags: string[] } {
  const lower = title.toLowerCase();
  const tags: string[] = [];

  const highWords = ["fed", "fomc", "powell", "cpi", "inflation", "nfp", "payroll", "jobs", "rate cut", "rate hike", "interest rate", "pce"];
  const mediumWords = ["dollar", "usd", "treasury", "yields", "bond", "geopolitical", "china", "recession", "gdp", "ppi"];
  const goldWords = ["gold", "xau", "bullion", "precious metal", "safe haven", "dollar", "fed", "inflation", "treasury", "yield", "rates"];

  for (const word of [...highWords, ...mediumWords, "gold", "bullion"]) {
    if (lower.includes(word)) tags.push(word);
  }

  const high = highWords.some(w => lower.includes(w));
  const medium = mediumWords.some(w => lower.includes(w));
  const goldRelevant = goldWords.some(w => lower.includes(w));

  return {
    impact: high ? "high" : medium ? "medium" : "low",
    goldRelevant,
    tags: Array.from(new Set(tags)).slice(0, 6)
  };
}

async function fetchRss(url: string, source: string): Promise<NewsItem[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 GoldAnalyzerPro/6.0",
      "Accept": "application/rss+xml, application/xml, text/xml"
    }
  });

  if (!response.ok) throw new Error(`${source} returned ${response.status}`);

  const xml = await response.text();
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemBlocks.slice(0, 20).map((block, index) => {
    const title = escapeXml((block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] || block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim());
    const link = escapeXml((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim());
    const pubDate = escapeXml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim());
    const classified = tagImpact(title);

    return {
      id: `${source}-${index}-${Buffer.from(title).toString("base64").slice(0, 10)}`,
      title: title || "Untitled",
      source,
      url: link,
      time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      ...classified
    };
  }).filter(item => item.title !== "Untitled");
}

router.get("/calendar", (_req, res) => {
  res.json({
    source: "built-in-economic-calendar",
    events: [
      { id: "us-cpi", title: "US CPI Inflation", country: "US", currency: "USD", impact: "high", goldRelevant: true, time: nextEventDate(18) },
      { id: "fomc", title: "FOMC Statement", country: "US", currency: "USD", impact: "high", goldRelevant: true, time: nextEventDate(42) },
      { id: "nfp", title: "Non-Farm Payrolls", country: "US", currency: "USD", impact: "high", goldRelevant: true, time: nextEventDate(72) },
      { id: "jobless", title: "Initial Jobless Claims", country: "US", currency: "USD", impact: "medium", goldRelevant: true, time: nextEventDate(28) }
    ],
    note: "Built-in fallback calendar."
  });
});

router.get("/headlines", async (_req, res) => {
  const sources = [
    ["Yahoo Finance Gold", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US"],
    ["Yahoo Finance USD", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=DX-Y.NYB&region=US&lang=en-US"],
    ["MarketWatch Markets", "https://feeds.marketwatch.com/marketwatch/marketpulse/"]
  ] as const;

  const all: NewsItem[] = [];
  const errors: string[] = [];

  for (const [source, url] of sources) {
    try {
      all.push(...await fetchRss(url, source));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${source} failed`);
    }
  }

  const unique = Array.from(new Map(all.map(item => [item.title, item])).values())
    .sort((a, b) => Number(b.goldRelevant) - Number(a.goldRelevant) || new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 25);

  res.json({
    source: "online-rss-news",
    headlines: unique,
    errors
  });
});

export default router;
