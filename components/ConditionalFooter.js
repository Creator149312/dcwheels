"use client";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Footer is always below the LCP element. Splitting it into its own chunk
// removes it from the initial JS parse path without affecting its HTML
// output (SSR is preserved so footer links stay crawlable).
const Footer = dynamic(() => import("@components/Footer"));

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed/")) return null;
  return <Footer />;
}
