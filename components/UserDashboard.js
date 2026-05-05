"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowRight, Plus, Layers, BookMarked, Zap, Flame, Trophy } from "lucide-react";
import { isAdminSession } from "@utils/auth/isAdmin";
import { timeAgo } from "@utils/HelperFunctions";

// ── Decision status config ────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pending",  emoji: "⏳", cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400" },
  done:    { label: "Done",     emoji: "✅", cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:border-green-400" },
  dropped: { label: "Dropped",  emoji: "❌", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:border-red-400" },
};
const STATUS_CYCLE = { pending: "done", done: "dropped", dropped: "pending" };

// ── Single decision card (timeline style, with status badge) ──────────────
function DecisionTimelineItem({ item }) {
  const [status, setStatus] = useState(item.status || "pending");
  const [updating, setUpdating] = useState(false);

  const wheelRoute =
    item.wheelId && item.wheelId !== "home"
      ? item.wheelId.length === 24
        ? `/uwheels/${item.wheelId}`
        : `/wheels/${item.wheelId}`
      : "/";

  async function cycleStatus(e) {
    e.preventDefault();
    if (updating) return;
    const next = STATUS_CYCLE[status] || "pending";
    setStatus(next); // optimistic
    setUpdating(true);
    try {
      const res = await fetch(`/api/decision-log/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) setStatus(status); // rollback
    } catch {
      setStatus(status);
    } finally {
      setUpdating(false);
    }
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="relative sm:pl-10">
      {/* Timeline dot */}
      <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-blue-500 bg-white dark:bg-[#1f1f1f] shadow-sm shadow-blue-500/20" />

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1f1f1f] p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Card header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
              🎯 Spin Result
            </span>
            <button
              onClick={cycleStatus}
              disabled={updating}
              title="Click to cycle status: Pending → Done → Dropped"
              className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 border border-transparent transition-colors disabled:opacity-50 ${cfg.cls}`}
            >
              {cfg.emoji} {cfg.label}
            </button>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(item.createdAt)}</span>
        </div>

        {/* Card body */}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Spun{" "}
          <Link href={wheelRoute} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {item.wheelTitle || "a wheel"}
          </Link>{" "}
          and got{" "}
          <span className="font-bold text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
            {item.result}
          </span>
        </p>

        {item.resultImage && (
          <div className="mt-2.5 w-full h-32 relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.resultImage} alt={item.result} className="w-full h-full object-contain" />
          </div>
        )}

        {item.note && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 border-l-[3px] border-blue-200 dark:border-blue-900/50 pl-3 italic">
            &quot;{item.note}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Decision timeline wrapper (expand/collapse) ────────────────────────────
function DecisionTimeline({ decisions, limit = 4 }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? decisions : decisions.slice(0, limit);
  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/40 via-gray-200 to-transparent dark:from-blue-500/20 dark:via-gray-800 dark:to-transparent hidden sm:block" />
      {visible.map((item) => (
        <DecisionTimelineItem key={item._id} item={item} />
      ))}
      {decisions.length > limit && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-blue-500 hover:underline w-full text-center pt-1"
        >
          {showAll ? "Show less" : `Show all ${decisions.length}`}
        </button>
      )}
    </div>
  );
}

// ── Small row card shared by all sections ─────────────────────────────────
function RowCard({ href, title, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
      <Link href={href} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
      </Link>
      <div className="flex items-center gap-1 flex-shrink-0 ml-3">
        {actions}
        <Link href={href}>
          <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────
function RowSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse h-12 rounded-xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, action, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Icon size={16} className="text-blue-500" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Expandable list helper ─────────────────────────────────────────────────
function ExpandableList({ items, renderItem, emptyMessage, limit = 4 }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, limit);

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {visible.map(renderItem)}
      {items.length > limit && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-500 hover:underline w-full text-center pt-1"
        >
          {showAll ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

// ── Stats summary card ─────────────────────────────────────────────────────
function StatsCard({ stats, decisions = [], loading }) {
  if (loading) {
    return (
      <div className="animate-pulse h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    );
  }

  if (!stats || stats.decisionsTotal === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-5 py-6 text-center">
        <p className="text-sm text-gray-400">
          Spin a wheel and tap <span className="font-semibold">&quot;I&apos;m picking this!&quot;</span> to start tracking your decisions.
        </p>
      </div>
    );
  }

  const { decisionsThisMonth, mostSpunWheel, streak, coins } = stats;

  // Tally top outcomes from the recent decisions window
  const outcomeCounts = {};
  for (const d of decisions) {
    const key = d.result;
    if (key) outcomeCounts[key] = (outcomeCounts[key] || 0) + 1;
  }
  const topOutcomes = Object.entries(outcomeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Decisions this month */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-800/40 px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={13} className="text-blue-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">This Month</p>
        </div>
        <p className="text-2xl font-black text-gray-900 dark:text-white">{decisionsThisMonth}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">decision{decisionsThisMonth !== 1 ? "s" : ""} made</p>
      </div>

      {/* Streak */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30 border border-orange-200/50 dark:border-orange-800/40 px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame size={13} className="text-orange-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Streak</p>
        </div>
        <p className="text-2xl font-black text-gray-900 dark:text-white">
          {streak}<span className="text-base ml-0.5">🔥</span>
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">day{streak !== 1 ? "s" : ""} in a row</p>
      </div>

      {/* Most spun wheel */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-800/40 px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy size={13} className="text-purple-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Top Wheel</p>
        </div>
        {mostSpunWheel ? (
          <>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={mostSpunWheel.name}>
              {mostSpunWheel.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {mostSpunWheel.count} spin{mostSpunWheel.count !== 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </div>

      {/* Coin Balance */}
      <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/40 dark:to-amber-900/30 border border-yellow-200/50 dark:border-yellow-800/40 px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm leading-none">🪙</span>
          <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">Coins</p>
        </div>
        <p className="text-2xl font-black text-gray-900 dark:text-white">{(coins ?? 0).toLocaleString()}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">total earned</p>
      </div>
      </div>{/* end grid */}

      {/* Top Outcomes */}
      {topOutcomes.length > 0 && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
            🏆 Your most chosen outcomes
          </p>
          <div className="flex flex-wrap gap-2">
            {topOutcomes.map(([result, count]) => (
              <span
                key={result}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                {result}
                <span className="text-[10px] text-gray-400 font-normal">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wheel row with public toggle ───────────────────────────────────────────
function WheelRowCard({ item }) {
  const [isPublic, setIsPublic] = useState(item.isPublic ?? false);
  const [toggling, setToggling] = useState(false);

  async function togglePublic(e) {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    const next = !isPublic;
    setIsPublic(next); // optimistic
    try {
      const res = await fetch(`/api/wheel/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) setIsPublic(!next); // rollback
    } catch {
      setIsPublic(!next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <RowCard
      href={`/uwheels/${item._id}`}
      title={item.title}
      meta={`${item.segmentCount} segments`}
      actions={
        <button
          onClick={togglePublic}
          disabled={toggling}
          title={isPublic ? "Listed in Explore — click to make private" : "Click to list in Explore"}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-50 ${
            isPublic
              ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
              : "text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:text-purple-500"
          }`}
        >
          {isPublic ? "Public" : "Private"}
        </button>
      }
    />
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function UserDashboard({ initialData = null }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const isAdmin = isAdminSession(session);

  const [dashData, setDashData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    // Skip the client fetch entirely when SSR already prefetched the data.
    if (initialData) return;
    if (status !== "authenticated") return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setDashData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, initialData]);

  // When SSR prefetched the data, skip the loading skeleton — we already
  // have real content to render on the first paint.
  if (!initialData && status === "loading") {
    return (
      <div className="w-full px-4 py-10 space-y-8">
        <RowSkeleton count={6} />
      </div>
    );
  }

  if (!initialData && !session?.user?.email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">You need to be logged in to view your dashboard.</p>
        <Link href="/login" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Log in
        </Link>
      </div>
    );
  }

  const name =
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "there";
  const wheels = dashData?.wheels || [];
  const lists = dashData?.lists || [];
  const decisions = dashData?.decisions || [];
  const stats = dashData?.stats || null;

  return (
    <div className="w-full px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-blue-500 mb-1">Dashboard</p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Hey, {name} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/dashboard/admin/preview-generator"
              className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 transition-colors border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5"
            >
              Preview Generator
            </Link>
          )}
          <Link
            href="/dashboard/account"
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5"
          >
            <Settings size={13} />
            Settings
          </Link>
        </div>
      </div>

      {/* Stats Card */}
      <div className="mb-8">
        <StatsCard stats={stats} decisions={decisions} loading={loading} />
      </div>

      {/* Stacked sections */}
      <div className="space-y-10">
        {/* ── My Wheels ─────────────────────────────────────────────── */}
        <Section
          icon={Layers}
          title="My Wheels"
          action={
            <a href="/" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Plus size={12} /> New
            </a>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={wheels}
              emptyMessage={<>No wheels yet. <a href="/" className="text-blue-500 hover:underline">Create one!</a></>}
              renderItem={(item) => (
                <WheelRowCard key={item._id} item={item} />
              )}
            />
          )}
        </Section>

        {/* ── My Lists ──────────────────────────────────────────────── */}
        <Section
          icon={BookMarked}
          title="My Lists"
          action={
            <a href="/dashboard?tab=my-lists&action=create" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              <Plus size={12} /> New
            </a>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={lists}
              emptyMessage={<>No lists yet. <a href="/dashboard?tab=my-lists&action=create" className="text-blue-500 hover:underline">Create one!</a></>}
              renderItem={(item) => (
                <RowCard key={item.id} href={`/lists/${item.id}`} title={item.name} meta={`${item.itemCount} items`} />
              )}
            />
          )}
        </Section>

        {/* ── My Decisions ──────────────────────────────────────────── */}
        <Section icon={Zap} title="My Decisions" action={null}>
          {loading ? (
            <RowSkeleton />
          ) : decisions.length === 0 ? (
            <p className="text-sm text-gray-400">No decisions yet. Spin a wheel and commit to it!</p>
          ) : (
            <DecisionTimeline decisions={decisions} />
          )}
        </Section>
      </div>
    </div>
  );
}
