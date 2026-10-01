"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Gamepad2,
  Wand2,
} from "lucide-react";

const PROMPT_EXAMPLES = [
  "Best open-world RPGs of all time",
  "Cozy games like Stardew Valley",
  "Hardest souls-like games ranked",
  "Best story-driven PS5 exclusives",
];

export default function CreateGameListClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [prompt, setPrompt] = useState("");
  const [listName, setListName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backUrl = session?.user?.name
    ? `/u/${encodeURIComponent(session.user.name.toLowerCase())}`
    : "/lists/create";

  async function handleSubmit(e) {
    e.preventDefault();
    if (prompt.trim().length < 5) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unifiedlist/game-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          isPublic,
          listName: listName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to the new list; the owner can immediately edit/reorder
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
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Gamepad2 size={24} />
          </div>
          <h1 className="text-2xl font-black text-foreground">AI Game List</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Describe the kind of game list you want. AI picks the games and matches
          them to real RAWG entries with cover art.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Prompt */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-semibold text-foreground mb-1.5">
              Describe Your List
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Best co-op games to play with friends in 2025"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none min-h-[90px]"
              required
              minLength={5}
              disabled={loading}
            />

            {/* Quick prompt examples */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PROMPT_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  disabled={loading}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Optional custom title */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">
              List Title <span className="text-muted-foreground font-normal">(Optional — AI will suggest one)</span>
            </label>
            <input
              id="name"
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Leave blank to let AI pick a title"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          {/* Public Visibility */}
          <div className="pt-1">
            <label htmlFor="isPublic" className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
              disabled={prompt.trim().length < 5 || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-600/20"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Generating Games...</>
              ) : (
                <><Wand2 size={18} /> Generate Game List</>
              )}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2.5 flex items-center justify-center gap-1">
              <Sparkles size={12} />
              AI picks 7–40 games and resolves them against RAWG. This takes ~10–20 seconds.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
