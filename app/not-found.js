import Link from "next/link";
import { Home, Compass, Search, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Page Not Found",
};

const POPULAR_TAGS = [
  { label: "Anime", href: "/tags/anime" },
  { label: "Movies", href: "/tags/movies" },
  { label: "Food", href: "/tags/food" },
  { label: "Games", href: "/tags/games" },
  { label: "Music", href: "/tags/music" },
];

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background text-foreground">
      <div className="w-full max-w-lg text-center">
        {/* Brand mark */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-6 font-black text-xl">
          S
        </div>

        {/* Big 404 with gradient */}
        <p className="text-7xl sm:text-8xl font-black text-primary leading-none mb-4 select-none">
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or is temporarily unavailable.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Home size={16} />
            Go Home
          </Link>
          <Link
            href="/tags"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-card border border-border text-foreground text-sm font-semibold rounded-xl hover:bg-muted transition-colors"
          >
            <Compass size={16} />
            Explore Spaces
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-card border border-border text-foreground text-sm font-semibold rounded-xl hover:bg-muted transition-colors"
          >
            <Search size={16} />
            Search
          </Link>
        </div>

        {/* Popular tags */}
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Or explore a popular space
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_TAGS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-muted/60 text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/40"
              >
                {t.label}
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
