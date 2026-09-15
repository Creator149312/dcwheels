import Image from "next/image";
import Link from "next/link";
import { Star, Heart } from "lucide-react";

export default function SearchResultCard({
  href,
  image,
  alt,
  title,
  badge = null,
  badgeType = "star",
  subtitle,
}) {
  const BadgeIcon = badgeType === "heart" ? Heart : Star;

  return (
    <Link
      href={href}
      className="group block touch-manipulation"
      aria-label={title}
    >
      <div className="rounded-lg md:rounded-xl overflow-hidden bg-muted aspect-[3/4] mb-1.5 md:mb-2 group-hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-sm relative border border-border/10">
        {image ? (
          <Image
            src={image}
            alt={alt || title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted text-xs md:text-sm">
            No Image
          </div>
        )}

        {badge && badge !== "0.0" && (
          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-black/70 backdrop-blur-md text-yellow-400 text-xs font-black px-1.5 py-0.5 rounded-md md:rounded-lg flex items-center gap-0.5 shadow-lg border border-white/10">
            <BadgeIcon size={10} className={`${badgeType === "heart" ? "text-pink-400" : ""}`} fill="currentColor" /> {badge}
          </div>
        )}
      </div>

      <p className="text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors px-0.5 line-clamp-2 leading-tight">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 font-medium px-0.5 line-clamp-1">
          {subtitle}
        </p>
      )}
    </Link>
  );
}
