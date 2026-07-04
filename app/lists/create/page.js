"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { List, ArrowLeft, Loader2 } from "lucide-react";

export default function CreateListPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backUrl = session?.user?.name 
    ? `/u/${encodeURIComponent(session.user.name.toLowerCase())}`
    : "/";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unifiedlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      router.push(`/lists/${data.list.id}`);
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
        Back to Profile
      </Link>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl">
            <List size={24} />
          </div>
          <h1 className="text-2xl font-black text-foreground">Create a List</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Organize items, favorites, or anything you want to track or spin.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">
              List Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Anime Watchlist"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of what this list is for."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none min-h-[100px]"
              disabled={loading}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-600/20"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Creating...</>
              ) : (
                "Create List"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}