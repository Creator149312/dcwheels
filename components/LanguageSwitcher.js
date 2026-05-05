"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@components/providers/LocaleProvider";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ className, compact = false }) {
  const { locale, setLocale, locales, t } = useLocale();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200",
        compact && "gap-1.5 px-2.5 py-1.5 text-xs",
        className
      )}
    >
      <Languages size={compact ? 14 : 16} className="text-blue-600 dark:text-blue-400" />
      {!compact ? <span className="font-medium">{t("common.language")}</span> : null}
      <select
        aria-label={t("common.language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="bg-transparent outline-none text-inherit"
      >
        {locales.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}