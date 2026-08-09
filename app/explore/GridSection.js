import Link from "next/link";
import { Compass } from "lucide-react";
import { fetchExploreGrid } from "@lib/explore";
import { getWheelUrl } from "@utils/UrlHandler";
import EmptyState from "@components/EmptyState";

export default async function GridSection({ mood, sort }) {
  const gridItems = await fetchExploreGrid({ tags: mood.tags, sort });

  if (gridItems.length === 0) {
    return (
      <div className="mt-12">
        <EmptyState
          icon={Compass}
          title="No wheels in this mood yet"
          description="Try a different chip — or be the first to create one."
          action={{ label: "Create a wheel", href: "/" }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {gridItems.map((item) => (
        <Link
          key={item._id}
          href={getWheelUrl(item)}
          className="group flex flex-col bg-muted/40 rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all active:scale-[0.98] hover:shadow-md"
        >
          <div className="relative aspect-[4/3] w-full bg-muted flex items-center justify-center border-b border-border overflow-hidden">
            {item.wheelPreview ? (
              <img
                src={item.wheelPreview}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <span className="text-muted-foreground/40 text-5xl font-black group-hover:scale-110 transition-transform duration-500">
                {item.title?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
              {item.title}
            </h3>
            {item.likeCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                ♥ {item.likeCount}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
