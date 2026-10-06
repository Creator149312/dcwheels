import Link from "next/link";
import QuickSaveButton from "@components/QuickSaveButton";
import { Sparkles } from "lucide-react";

export default function CategorySpotlightRail({ title = "Trending This Week", items = [], type = "movie" }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles size={14} className="text-primary" />
        <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {items.slice(0, 4).map((item, idx) => {
          const rank = idx + 1;
          const targetUrl = item.url || `/${type}/${item.slug}`;

          return (
            <div
              key={item.id || item.slug}
              className="group relative flex flex-col bg-background/80 hover:bg-muted/40 rounded-xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
            >
              {/* Entire Card Clickable Link */}
              <Link
                href={targetUrl}
                aria-label={item.title}
                className="flex flex-col flex-1"
              >
                <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.title}
                      loading={idx < 2 ? "eager" : "lazy"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-medium">
                      No Cover
                    </div>
                  )}

                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-black/80 backdrop-blur-md text-white text-[11px] font-black flex items-center justify-center shadow">
                    #{rank}
                  </div>

                  {/* Score / Rating if present */}
                  {item.rating && (
                    <div className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-md text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      ★ {item.rating}
                    </div>
                  )}

                  {/* Genre Tag Overlay */}
                  {item.genre && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                      <span className="text-[9px] font-semibold tracking-wider uppercase bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded">
                        {item.genre}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Info */}
                <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Quick Save Action (positioned outside the <Link> with z-20 to prevent event conflicts) */}
              <div className="relative z-20">
                <QuickSaveButton
                  entityType={type}
                  entityId={String(item.id)}
                  itemTitle={item.title}
                  itemSlug={item.slug}
                  itemImage={item.image}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
