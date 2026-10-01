"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

export default function CreateAnimeCharacterListClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [listName, setListName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backUrl = session?.user?.name
    ? `/u/${encodeURIComponent(session.user.name.toLowerCase())}`
    : "/lists/create";

  // Debounced anime search against existing topic pages + external fallback
  useEffect(() => {
    if (!query || query.trim().length < MIN_QUERY) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search/topics?type=anime&q=${encodeURIComponent(query.trim())}&limit=8`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (e) {
        console.error("Anime search failed:", e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const selectAnime = useCallback((anime) => {
    setSelectedAnime(anime);
    setQuery("");
    setResults([]);
    const animeName = anime.title?.default || anime.title?.english || "Anime";
    setListName(`${animeName} Characters — Complete List & Tier Ranking`);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAnime) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unifiedlist/anime-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId: selectedAnime.id || selectedAnime.relatedId,
          animeName: selectedAnime.title?.default || selectedAnime.title?.english || "Anime",
          animeSlug: selectedAnime.slug,
          isPublic,
          listName: listName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to the new list; the owner can immediately add/remove/reorder
      router.push(data.url);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 md:py-12 min-h-screen">
      <Link
        href={backUrl}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-xl">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-black text-foreground">Anime Character List</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Pick an anime and instantly create a list seeded with its characters.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Anime Search */}
          <div className="relative">
            <label htmlFor="anime-search" className="block text-sm font-semibold text-foreground mb-1.5">
              Select Anime
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="anime-search"
                type="text"
                value={selectedAnime ? selectedAnime.title?.default || selectedAnime.title?.english : query}
                onChange={(e) => {
                  if (selectedAnime) {
                    setSelectedAnime(null);
                    setListName("");
                  }
                  setQuery(e.target.value);
                }}
                placeholder="Search anime e.g. Naruto, One Piece..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                disabled={loading}
              />
              {searching && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </div>

            {/* Dropdown results */}
            {!selectedAnime && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                {results.map((anime) => (
                  <button
                    key={anime.slug}
                    type="button"
                    onClick={() => selectAnime(anime)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors"
                  >
                    {anime.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={anime.cover}
                        alt=""
                        className="w-10 h-14 object-cover rounded-md bg-muted shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-md bg-muted flex items-center justify-center shrink-0 text-xs font-black text-muted-foreground">
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {anime.title?.default || anime.title?.english || anime.slug}
                      </p>
                      {anime.title?.english && anime.title?.default !== anime.title?.english && (
                        <p className="text-xs text-muted-foreground truncate">
                          {anime.title.english}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!selectedAnime && !searching && query.length >= MIN_QUERY && results.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">No anime found. Try a different title.</p>
            )}
          </div>

          {/* Selected anime preview */}
          {selectedAnime && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-pink-200 dark:border-pink-900/40 bg-pink-50/40 dark:bg-pink-950/20">
              {selectedAnime.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAnime.cover}
                  alt=""
                  className="w-12 h-16 object-cover rounded-lg bg-muted shrink-0"
                />
              ) : (
                <div className="w-12 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg font-black text-muted-foreground">
                  {selectedAnime.title?.default?.charAt(0) || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">
                  {selectedAnime.title?.default || selectedAnime.title?.english}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Users size={12} />
                  Characters will be imported from AniList
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAnime(null);
                  setListName("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
              >
                Change
              </button>
            </div>
          )}

          {/* List Title — Editable with SEO default */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">
              List Title
            </label>
            <input
              id="name"
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Naruto Characters — Complete List & Tier Ranking"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pre-filled with an SEO-friendly default. Edit if needed. The Tier Board toggle will be available on the list page.
            </p>
          </div>

          {/* Public Visibility */}
          <div className="pt-1">
            <label htmlFor="isPublic" className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-pink-600 focus:ring-pink-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Publish publicly (Recommended for SEO & discovery)
                </span>
                <span className="text-muted-foreground block mt-0.5">
                  Uncheck to keep as a private draft. You can publish it to the community when ready.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedAnime || !listName.trim() || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-pink-600/20"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Creating...</>
              ) : (
                <>Create Character List</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
