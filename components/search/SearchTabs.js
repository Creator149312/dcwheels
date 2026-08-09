import Link from "next/link";

const TABS = [
  { key: "wheels",    label: "Wheels",     mobileLabel: "🎡", icon: "🎡" },
  { key: "anime",     label: "Anime",      mobileLabel: "✨", icon: "✨" },
  { key: "movie",     label: "Movies",     mobileLabel: "🎬", icon: "🎬" },
  { key: "game",      label: "Games",      mobileLabel: "🎮", icon: "🎮" },
  { key: "character", label: "Characters", mobileLabel: "👤", icon: "👤" },
];

export default function SearchTabs({ rawTitle, activeType, counts }) {
  return (
    <div className="flex gap-0 overflow-x-auto pb-0 mb-3 md:mb-5 -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 border-b border-border/50 [&::-webkit-scrollbar]:hidden"
         style={{ scrollbarWidth: "none" }}>
      {TABS.map((tab) => {
        const isActive = activeType === tab.key;
        const href = tab.key === "wheels"
          ? `/search/${rawTitle}`
          : `/search/${rawTitle}?type=${tab.key}`;
        const count = counts[tab.key];

        return (
          <Link
            key={tab.key}
            href={href}
            prefetch={true}
            scroll={false}
            className={`group relative flex-shrink-0 px-2 sm:px-2.5 md:px-4 py-2 md:py-2.5 text-[11px] sm:text-xs md:text-sm font-semibold transition-colors min-h-[40px] flex items-center gap-1 touch-manipulation whitespace-nowrap
              ${isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <span className="md:hidden">{tab.mobileLabel}</span>
            <span className="hidden md:inline">{tab.icon}</span>
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`ml-0.5 text-[9px] md:text-xs px-1 py-0.5 rounded-full font-bold
                ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-1 right-1 md:left-2 md:right-2 h-0.5 bg-primary rounded-t-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
