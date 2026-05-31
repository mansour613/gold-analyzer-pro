import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import ar from "../locales/ar.json";
import type { Language } from "../types/market";

type Dictionary = typeof en;
const dictionaries: Record<Language, Dictionary> = { en, ar };

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Dictionary) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("gold-language");
    return stored === "ar" ? "ar" : "en";
  });

  const dir: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = (next: Language) => {
    localStorage.setItem("gold-language", next);
    setLanguageState(next);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    dir,
    t: (key: keyof Dictionary) => dictionaries[language][key] || en[key] || String(key)
  }), [language, dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
