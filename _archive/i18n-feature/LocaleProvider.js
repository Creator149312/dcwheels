"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate } from "@/lib/i18n";

const STORAGE_KEY = "spinpapa-locale";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
  locales: SUPPORTED_LOCALES,
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    const supported = SUPPORTED_LOCALES.some(({ code }) => code === storedLocale);
    const nextLocale = supported ? storedLocale : DEFAULT_LOCALE;

    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const setLocale = (nextLocale) => {
    const supported = SUPPORTED_LOCALES.some(({ code }) => code === nextLocale);
    const resolvedLocale = supported ? nextLocale : DEFAULT_LOCALE;

    setLocaleState(resolvedLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, resolvedLocale);
    }
    document.documentElement.lang = resolvedLocale;
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
      locales: SUPPORTED_LOCALES,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}