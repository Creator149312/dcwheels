"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { timeAgo } from "@utils/HelperFunctions";
import { Pin, Send, Check, Trophy } from "lucide-react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

// ── Feature 1: Expiry urgency pill ────────────────────────────────────────
function TimeLeft({ expiresAt }) {
  const compute = () => {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return { label: "Closed", urgency: "closed" };
    const h = diff / 3_600_000;
    const d = h / 24;
    if (h < 1) return { label: `Closes in ${Math.ceil(diff / 60_000)}m`, urgency: "critical" };
    if (h < 24) return { label: `Closes in ${Math.floor(h)}h`, urgency: "urgent" };
    if (d < 3) return { label: `Closes in ${Math.floor(d)}d`, urgency: "warning" };
    return {
      label: `Closes ${new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      urgency: "normal",
    };
  };

  const [state, setState] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setState(compute()), 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const cls = {
    closed:   "bg-muted text-muted-foreground",
    critical: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse",
    urgent:   "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    warning:  "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    normal:   "bg-muted text-muted-foreground",
  }[state.urgency];

  return (
    <span className={`inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 ${cls}`}>
      {state.label}
    </span>
  );
}

// ── Main AskCard ──────────────────────────────────────────────────────────
/**
 * AskCard — renders a single Ask dilemma in feed or detail contexts.
 *
 * Props:
 *  ask     — serialized AskDilemma object from askStories.js
 *  compact — true = feed teaser (vote inline, truncated text)
 *            false = detail page (full text, rationale input)
 */
export default function AskCard({ ask, compact = true }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const isLoggedIn = !!session?.user;

  const isClosed =
    ask.status !== "active" || (ask.expiresAt && new Date(ask.expiresAt) <= new Date());

  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voteCounts, setVoteCounts] = useState(
    Object.fromEntries(ask.options.map((o) => [o.id, o.voteCount]))
  );
  // Feature 4: pending confirm + rationale state
  const [pendingOptionId, setPendingOptionId] = useState(null);
  const [rationale, setRationale] = useState("");
  const [myRationale, setMyRationale] = useState("");

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  // The option with the highest vote count
  const leadingOptionId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Feature 5: resolve finalDecision optionId → option text
  const finalDecisionOption = ask.finalDecision
    ? ask.options.find((o) => o.id === ask.finalDecision)
    : null;

  const showResults = voted || isClosed;

  // Step 1: clicking an option opens the confirm + rationale UI
  const handleOptionClick = (optionId) => {
    if (!isLoggedIn) return openLoginPrompt?.();
    if (voted || loading || isClosed) return;
    setPendingOptionId(optionId);
  };

  // Step 2: submitting the vote
  const submitVote = async () => {
    if (!pendingOptionId || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ask/${ask.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: pendingOptionId, rationale: rationale.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to vote");
        return;
      }
      setVoteCounts(data.voteCounts);
      setVoted(true);
      setMyRationale(rationale.trim());
      setPendingOptionId(null);
      setRationale("");
      toast.success("Thanks for voting!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b sm:border border-border bg-card p-4 sm:p-5 sm:rounded-xl transition-colors sm:hover:border-primary/20">

      {/* ── Feature 5: Final Decision banner ────────────────────────── */}
      {finalDecisionOption && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs font-semibold text-green-700 dark:text-green-300">
            Decision made · Author chose{" "}
            <span className="font-extrabold">{finalDecisionOption.text}</span>
          </p>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
              Ask Papa
            </span>

            {/* Feature 6: Pinned badge */}
            {ask.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}

            {/* Feature 1: Expiry urgency pill */}
            {ask.expiresAt && <TimeLeft expiresAt={ask.expiresAt} />}
          </div>

          {compact ? (
            <Link href={`/ask/${ask.id}`} className="group">
              <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {ask.question}
              </h3>
            </Link>
          ) : (
            <h3 className="text-base sm:text-xl font-bold text-foreground">
              {ask.question}
            </h3>
          )}

          <p className="text-xs text-muted-foreground mt-1.5">
            Asked by{" "}
            <Link href={`/profile/${encodeURIComponent(ask.authorName.toLowerCase())}`} className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              {ask.authorName}
            </Link>
            {" · "}
            {timeAgo(ask.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Options ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {ask.options.map((option) => {
          const count = voteCounts[option.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isLeading = showResults && totalVotes > 0 && option.id === leadingOptionId;
          const isAuthorChoice = option.id === ask.finalDecision;
          const isPending = option.id === pendingOptionId;

          // Feature 3: leading option styling
          let borderCls = "border-border cursor-default";
          let barCls = "bg-purple-100 dark:bg-purple-900/30";
          if (isLeading && showResults) {
            borderCls = "border-green-400 dark:border-green-600 cursor-default";
            barCls = "bg-green-100 dark:bg-green-900/30";
          }
          if (!showResults && !isClosed) {
            borderCls = isPending
              ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20 cursor-pointer"
              : "border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              disabled={voted || loading || isClosed}
              className={`relative w-full text-left rounded-lg border px-4 py-3 text-sm font-medium transition-colors duration-200 overflow-hidden ${borderCls} text-foreground`}
            >
              {/* Progress fill (Feature 3) */}
              {showResults && totalVotes > 0 && (
                <span
                  className={`absolute inset-y-0 left-0 ${barCls} transition-[width] duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  {/* Feature 3: winner crown on leading option */}
                  {isLeading && showResults && (
                    <Trophy className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                  {/* Feature 5: star for author's choice */}
                  {isAuthorChoice && (
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                  {/* Catalog poster thumbnail */}
                  {option.catalogRef?.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.catalogRef.posterUrl}
                      alt={option.text}
                      className="h-9 w-6 object-cover rounded shadow-sm shrink-0"
                    />
                  )}
                  <span className="truncate">{option.text}</span>
                </span>

                {showResults && totalVotes > 0 && (
                  <span className={`text-xs font-bold tabular-nums shrink-0 ${isLeading ? "text-green-700 dark:text-green-400" : "text-purple-600 dark:text-purple-400"}`}>
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Feature 4: Rationale confirm panel ───────────────────────── */}
      {pendingOptionId && !voted && (
        <div className="mt-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
            Voting for: <span className="font-extrabold">{ask.options.find(o => o.id === pendingOptionId)?.text}</span>
          </p>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value.slice(0, 280))}
            placeholder="Tell them why… (optional)"
            rows={2}
            className="w-full text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">{rationale.length}/280</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPendingOptionId(null); setRationale(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitVote}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Voting…" : "Submit vote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature 4: My rationale (shown after voting) */}
      {voted && myRationale && (
        <div className="mt-3 text-xs text-muted-foreground border-l-[3px] border-purple-300/70 pl-3 py-1 italic">
          Your reason: &quot;{myRationale}&quot;
        </div>
      )}

      {/* ── Feature 3: "Community chose" banner (closed, no author pick) ── */}
      {isClosed && !finalDecisionOption && totalVotes > 0 && leadingOptionId && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-foreground">
            Community chose:{" "}
            <span className="font-extrabold text-gray-900 dark:text-white">
              {ask.options.find((o) => o.id === leadingOptionId)?.text}
            </span>
          </p>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
        {/* Feature 2: Prominent vote count */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground">
            {totalVotes.toLocaleString()} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          {ask.tags?.length > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {ask.tags.map((t) => `#${t}`).join(" ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {compact && (
            <Link
              href={`/ask/${ask.id}`}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              View discussion →
            </Link>
          )}
          {voted && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
              <Check className="h-3.5 w-3.5" />
              Voted!
            </span>
          )}
        </div>
      </div>

      {/* ── Task 9: Reverse links — content page chips ───────────────────
           When any option has a catalogRef with a slug, show clickable
           chips that link back to the content slug page. Useful in the
           global ask feed so users can discover content pages from debates. */}
      {ask.options.some((o) => o.catalogRef?.canonicalSlug && o.catalogRef?.type) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            About:
          </span>
          {ask.options
            .filter((o) => o.catalogRef?.canonicalSlug && o.catalogRef?.type)
            .map((o) => (
              <Link
                key={o.id}
                href={`/${o.catalogRef.type}/${o.catalogRef.canonicalSlug}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold
                           text-purple-600 dark:text-purple-400 hover:underline
                           bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                {o.catalogRef.type === "anime"     && "📺"}
                {o.catalogRef.type === "movie"     && "🎬"}
                {o.catalogRef.type === "game"      && "🎮"}
                {o.catalogRef.type === "character" && "👤"}
                {o.text}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
