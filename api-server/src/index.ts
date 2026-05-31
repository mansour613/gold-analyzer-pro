import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import goldRouter from "./routes/gold.js";
import newsRouter from "./routes/news.js";
import aiRouter from "./routes/ai.js";

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gold-analyzer-pro-api",
    version: "4.1.4-mtf-level-analysis-scan",
    timestamp: Date.now()
  });
});

app.use("/api/gold", goldRouter);
app.use("/api/news", newsRouter);
app.use("/api/ai", aiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(port, () => {
  console.log(`Gold Analyzer Pro API running on http://localhost:${port}`);
});
