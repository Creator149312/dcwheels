import Link from "next/link";

const TABS = [
  { key: "top",    label: "Top" },
  { key: "wheels", label: "Wheels" },
  { key: "lists",  label: "Lists" },
  { key: "topics", label: "Topics" },
];

const TOPIC_SUBFILTERS = [
  { key: "topics",    label: "All" },
  { key: "anime",     label: "Anime" },
  { key: "movie",     label: "Movies" },
  { key: "game",      label: "Games" },
  { key: "character", label: "Characters" },
];

export default function SearchTabs({ rawTitle, activeType = "top", counts = {} }) {
  const isTopicsFamily = ["topics", "anime", "movie", "game", "character"].includes(activeType);

  return (
    <div className="mb-4 md:mb-6">
      <div
        className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto pb-0 -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 border-b border-border/50 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {TABS.map((tab) => {
          const isActive =
            tab.key === "topics" ? isTopicsFamily : activeType === tab.key;
          const href =
            tab.key === "top"
              ? `/search/${rawTitle}`
              : `/search/${rawTitle}?type=${tab.key}`;
          const count = counts[tab.key];

          return (
            <Link
              key={tab.key}
              href={href}
              prefetch={true}
              scroll={false}
              className={`group relative flex-1 sm:flex-initial text-center justify-center flex-shrink-0 px-3 sm:px-4 md:px-5 py-2.5 text-xs sm:text-sm font-bold transition-colors min-h-[42px] flex items-center gap-1.5 touch-manipulation whitespace-nowrap
                ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>

      {isTopicsFamily && (
        <div
          className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {TOPIC_SUBFILTERS.map((sub) => {
            const isSubActive = activeType === sub.key;
            return (
              <Link
                key={sub.key}
                href={`/search/${rawTitle}?type=${sub.key}`}
                prefetch={true}
                scroll={false}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap border ${
                  isSubActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
