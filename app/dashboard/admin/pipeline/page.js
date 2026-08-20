"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API = "/api/admin/pipeline";
const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

export default function AdminPipelinePage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    title: "",
    description: "",
    context: "",
    tags: "ai-curated, movies, tmdb-verified",
    dryRun: false,
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const isAdmin =
    status === "authenticated" &&
    (session?.user?.role === "admin" || session?.user?.email === ADMIN_EMAIL);

  async function fetchRecent() {
    setRecentLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setRecent(data.lists || []);
    } catch (err) {
      console.error("Failed to load recent lists:", err);
    } finally {
      setRecentLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchRecent();
  }, [isAdmin]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("Curating movie candidates…");
    setResult(null);
    setError(null);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          context: form.context,
          tags: form.tags,
          dryRun: form.dryRun,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Pipeline failed (${res.status})`);
      }

      setResult(data.list);
      setStatusMsg(
        data.dryRun
          ? `Dry run complete — ${data.list.itemCount} verified movies found.`
          : `Saved "${data.list.name}" with ${data.list.itemCount} movies.`
      );

      if (!data.dryRun) {
        fetchRecent();
      }
    } catch (err) {
      setError(err.message);
      setStatusMsg(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setStatusMsg(null);
    setError(null);
    setForm({
      title: "",
      description: "",
      context: "",
      tags: "ai-curated, movies, tmdb-verified",
      dryRun: false,
    });
  }

  if (status === "loading") {
    return <main className="p-8 max-w-5xl mx-auto">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="p-8 max-w-5xl mx-auto text-destructive">
        Access denied. Admin only.
      </main>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Pipeline — Stage 2+</h1>
      <p className="text-muted-foreground mb-6">
        Enter a list title. The pipeline will curate movies, verify each one against TMDB, save the
        result to a UnifiedList, and give you a shareable slug URL.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-6 bg-card">
        <div>
          <label className="block text-sm font-medium mb-1">List title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Hidden Gems: Indian Horror Films of the 2010s"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            rows={3}
            placeholder="Optional. Helps the curator understand the theme."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Creative context</label>
          <input
            type="text"
            placeholder="Optional constraint, e.g. stick to Indian folklore"
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.dryRun}
            onChange={(e) => setForm({ ...form, dryRun: e.target.checked })}
            className="rounded"
          />
          Dry run (verify movies but do not create a list)
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Running pipeline…" : form.dryRun ? "Dry run" : "Generate & save list"}
          </button>
        </div>
      </form>

      {loading && statusMsg && (
        <div className="mt-6 p-4 border rounded-md bg-muted text-sm animate-pulse">{statusMsg}</div>
      )}

      {error && (
        <div className="mt-6 p-4 border rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="mt-6 border rounded-lg p-6 bg-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {result.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({result.itemCount} verified items)
                </span>
              </h2>
              {result.description && (
                <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.url && (
                <Link
                  href={result.url}
                  target="_blank"
                  className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  View list
                </Link>
              )}
              <button
                type="button"
                onClick={reset}
                className="border rounded-md px-4 py-2 text-sm hover:bg-muted"
              >
                Create another
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {result.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {result.items?.map((movie) => (
              <div key={movie.tmdbId} className="border rounded-md p-3 flex gap-3 bg-background">
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-16 h-24 object-cover rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-24 bg-muted rounded-md flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <Link
                    href={`/movie/${movie.itemSlug || movie.slug || movie.tmdbId}`}
                    target="_blank"
                    className="font-medium text-sm truncate hover:underline"
                  >
                    {movie.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{movie.year}</p>
                  {movie.director && (
                    <p className="text-xs text-muted-foreground truncate">{movie.director}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {movie.overview || movie.description || "No overview"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4">Recently generated lists</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((list) => (
              <Link
                key={list.id}
                href={list.url}
                className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-sm">{list.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {list.itemCount} items ·{" "}
                      {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : "recent"}
                    </p>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    {list.tags?.[0] || "list"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
