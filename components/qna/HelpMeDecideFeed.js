"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLoginPrompt } from "@app/LoginPromptProvider";

const SORTS = ["newest", "hot", "unresolved"];

function totalVotes(voteCounts = []) {
  return voteCounts.reduce((sum, c) => sum + c, 0);
}

function hotScore(item) {
  const votes = totalVotes(item.voteCounts || []);
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60)
  );
  return votes / ageHours;
}

function weightedPick(options = [], voteCounts = []) {
  if (!options.length) return null;
  const counts = options.map((_, i) => Math.max(0, voteCounts[i] || 0));
  const total = counts.reduce((sum, c) => sum + c, 0);

  // Before enough votes exist, return a fair random option.
  if (total === 0) {
    const idx = Math.floor(Math.random() * options.length);
    return { index: idx, confidence: null };
  }

  const target = Math.random() * total;
  let cursor = 0;
  for (let i = 0; i < counts.length; i += 1) {
    cursor += counts[i];
    if (target <= cursor) {
      return {
        index: i,
        confidence: Math.round((counts[i] / total) * 100),
      };
    }
  }

  const fallback = counts.length - 1;
  return {
    index: fallback,
    confidence: Math.round((counts[fallback] / total) * 100),
  };
}

function formatVotes(voteCounts = []) {
  const total = totalVotes(voteCounts);
  const percentages = voteCounts.map((c) =>
    total ? Math.round((c / total) * 100) : 0
  );
  return { total, percentages };
}

export default function HelpMeDecideFeed({ isLoggedIn, openLoginPrompt }) {
  const fallbackLoginPrompt = useLoginPrompt();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [spinResults, setSpinResults] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/help-me-decide");
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === "hot") {
      return hotScore(b) - hotScore(a);
    }

    // unresolved: low-vote dilemmas first to encourage participation
    return totalVotes(a.voteCounts || []) - totalVotes(b.voteCounts || []);
  });

  const handleVote = async (itemId, optionIndex) => {
    if (!isLoggedIn) {
      (openLoginPrompt || fallbackLoginPrompt)?.();
      return;
    }
    if (votingId) return;

    setVotingId(itemId);
    try {
      const res = await fetch(`/api/questions/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", optionIndex }),
      });
      if (!res.ok) throw new Error("Vote failed");

      setItems((prev) =>
        prev.map((item) => {
          if (item._id !== itemId) return item;

          const nextCounts = [...(item.voteCounts || [])];
          const previous = item.userVoteIndex;

          if (previous !== null && previous >= 0) {
            nextCounts[previous] = Math.max(0, (nextCounts[previous] || 0) - 1);
          }
          nextCounts[optionIndex] = (nextCounts[optionIndex] || 0) + 1;

          return {
            ...item,
            voteCounts: nextCounts,
            userVoteIndex: optionIndex,
          };
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setVotingId(null);
    }
  };

  const handleCommunitySpin = (item) => {
    const picked = weightedPick(item.options || [], item.voteCounts || []);
    if (!picked) return;

    setSpinResults((prev) => ({
      ...prev,
      [item._id]: {
        option: item.options[picked.index],
        confidence: picked.confidence,
      },
    }));
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dilemmas...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
        No dilemmas published yet. Open a wheel and click Ask the Crowd to post one.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map((key) => {
          const active = sortBy === key;
          const label =
            key === "newest" ? "Newest" : key === "hot" ? "Hot" : "Unresolved";

          return (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                active
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                  : "border-gray-300 text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {sortedItems.map((item) => {
        const { total, percentages } = formatVotes(item.voteCounts || []);
        const spin = spinResults[item._id];

        return (
          <article
            key={item._id}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/uwheels/${item.contentId}`}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  {item.wheel?.title || "View wheel"}
                </Link>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
                  {item.text}
                </p>
              </div>
              <span className="text-xs text-gray-500">{total} vote{total !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-2">
              {(item.options || []).map((opt, idx) => {
                const pct = percentages[idx] || 0;
                const selected = item.userVoteIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleVote(item._id, idx)}
                    disabled={votingId === item._id}
                    className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-blue-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 transition-all ${
                        selected
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-gray-100 dark:bg-gray-800/60"
                      }`}
                      style={{ width: total ? `${pct}%` : "0%" }}
                    />
                    <span className="relative z-10 flex items-center justify-between">
                      <span>{opt}</span>
                      {total > 0 && <span className="text-xs text-gray-500">{pct}%</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCommunitySpin(item)}
                  className="rounded-full border border-blue-300 dark:border-blue-700 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                >
                  Spin Community Wheel
                </button>
                <Link href={`/uwheels/${item.contentId}#comments`} className="hover:underline">
                  Open comments
                </Link>
              </div>
              <Link href={`/uwheels/${item.contentId}`} className="hover:underline">
                Open wheel
              </Link>
            </div>

            {spin && (
              <div className="mt-3 rounded-lg border border-emerald-300/70 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                Community wheel landed on <span className="font-semibold">{spin.option}</span>
                {typeof spin.confidence === "number" && (
                  <span> ({spin.confidence}% vote share)</span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
