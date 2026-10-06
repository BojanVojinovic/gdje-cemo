"use client";

import { normalizeLocale, translate, type Locale } from "@/lib/i18n";
import { createContext, useContext, useMemo } from "react";

type I18nValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18nValue>(() => ({
    locale: normalizeLocale(locale),
    t: (key, vars) => translate(normalizeLocale(locale), key, vars),
    setLocale: (next) => {
      document.cookie = `gdje-locale=${next};path=/;max-age=31536000;samesite=lax`;
      window.location.reload();
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "en",
      t: (key, vars) => translate("en", key, vars),
      setLocale: () => undefined,
    };
  }
  return context;
}
