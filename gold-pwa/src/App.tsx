import { useEffect, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { Header } from "./components/Header";
import { AppInstall } from "./components/AppInstall";
import { Disclaimer } from "./components/Disclaimer";
import { MarketHero } from "./components/MarketHero";
import { LanguageProvider } from "./context/LanguageContext";
import { MarketProvider } from "./context/MarketContext";
import { AIPage } from "./pages/AIPage";
import { ChartPage } from "./pages/ChartPage";
import { LevelsPage } from "./pages/LevelsPage";
import { SignalsPage } from "./pages/SignalsPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import type { Page } from "./types/market";

function ActivePage({ page }: { page: Page }) {
  if (page === "signals") return <SignalsPage />;
  if (page === "levels") return <LevelsPage />;
  if (page === "waves") return <AnalysisPage />;
  if (page === "ai") return <AIPage />;
  return <ChartPage />;
}

function AppShell() {
  const [page, setPage] = useState<Page>("chart");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [page]);

  function changePage(nextPage: Page) {
    setPage(nextPage);
  }

  return (
    <div className="app-shell">
      <Header />
      <AppInstall />
      {page === "chart" && <MarketHero />}
      <ActivePage page={page} />
      <Disclaimer />
      <BottomNav page={page} onChange={changePage} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MarketProvider>
        <AppShell />
      </MarketProvider>
    </LanguageProvider>
  );
}
