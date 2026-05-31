import { useLanguage } from "../context/LanguageContext";
import { MarketStatusBadge } from "./MarketStatusBadge";

export function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="app-header">
      <div className="brand-title">
        <h1>{t("appTitle")} <small>{t("by")}</small></h1>
        <MarketStatusBadge />
      </div>

      <div className="lang-switch">
        <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>{t("english")}</button>
        <button className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>{t("arabic")}</button>
      </div>
    </header>
  );
}
