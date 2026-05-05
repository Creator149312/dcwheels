"use client";

import Link from "next/link";
import { useLocale } from "@components/providers/LocaleProvider";

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer className="w-full pl-14 mt-auto border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400">
          <div className="font-medium order-2 md:order-1">
            2026 © <span className="text-blue-600 font-bold">SpinPapa</span>. {t("footer.rightsReserved")}
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 order-1 md:order-2">
            <Link href="/faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t("footer.faq")}</Link>
            <Link href="/privacy-policy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t("footer.privacyPolicy")}</Link>
            <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t("footer.terms")}</Link>
            <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t("footer.aboutUs")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}