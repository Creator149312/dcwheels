"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, LayoutGrid } from "lucide-react";

export default function CategoryNavTabs({ type, activeTab = "community" }) {
  const searchParams = useSearchParams();

  // Helper to preserve or strip tab parameter cleanly
  const createTabHref = (targetTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetTab === "community") {
      params.delete("tab");
    } else {
      params.set("tab", targetTab);
    }
    const query = params.toString();
    return query ? `/${type}?${query}` : `/${type}`;
  };

  return (
    <div className="flex items-center gap-2 border-b border-border mb-6">
      <Link
        href={createTabHref("community")}
        scroll={false}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
          activeTab === "community"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageSquare size={16} />
        <span>Community</span>
      </Link>

      <Link
        href={createTabHref("browse")}
        scroll={false}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
          activeTab === "browse"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid size={16} />
        <span>Browse Catalog</span>
      </Link>
    </div>
  );
}
