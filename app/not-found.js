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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-lg text-center">
        {/* Brand mark */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 mb-6">
          <span className="text-white font-bold text-xl">S</span>
        </div>

        {/* Big 404 with gradient */}
        <p className="text-7xl sm:text-8xl font-black bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent leading-none mb-4 select-none">
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          This wheel didn&apos;t land here
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or maybe
          was just a really bad spin. Try one of these instead.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Home size={16} />
            Go home
          </Link>
          <Link
            href="/wheels"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Compass size={16} />
            Browse wheels
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Search size={16} />
            Search
          </Link>
        </div>

        {/* Popular tags */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Or explore a popular topic
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_TAGS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
