"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowRight, Plus, Layers, BookMarked, Zap, Flame, Trophy, RotateCcw } from "lucide-react";
import { isAdminSession } from "@utils/auth/isAdmin";

// ── Small row card shared by all sections ─────────────────────────────────
function RowCard({ href, title, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
      <a href={href} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
      </a>
      <div className="flex items-center gap-1 flex-shrink-0 ml-3">
        {actions}
        <a href={href}>
          <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
        </a>
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
function StatsCard({ stats, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    );
  }

  if (!stats || stats.decisionsTotal === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-5 py-6 text-center">
        <p className="text-sm text-gray-400">
          Spin a wheel and tap <span className="font-semibold">&quot;I&apos;m doing this!&quot;</span> to start tracking your decisions.
        </p>
      </div>
    );
  }

  const { decisionsThisMonth, mostSpunWheel, streak } = stats;

  return (
    <div className="grid grid-cols-3 gap-3">
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
    </div>
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
        <a href="/login" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Log in
        </a>
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
            <a
              href="/dashboard/admin/preview-generator"
              className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 transition-colors border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5"
            >
              Preview Generator
            </a>
          )}
          <a
            href="/dashboard/account"
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5"
          >
            <Settings size={13} />
            Settings
          </a>
        </div>
      </div>

      {/* Stats Card */}
      <div className="mb-8">
        <StatsCard stats={stats} loading={loading} />
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
                <RowCard key={item._id} href={`/uwheels/${item._id}`} title={item.title} meta={`${item.segmentCount} segments`} />
              )}
            />
          )}
        </Section>

        {/* ── My Lists ──────────────────────────────────────────────── */}
        <Section
          icon={BookMarked}
          title="My Lists"
          action={
            <a href="/lists" className="text-xs text-blue-500 hover:underline">View all</a>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={lists}
              emptyMessage="No lists yet. Add items from any anime, movie or game page."
              renderItem={(item) => (
                <RowCard key={item.id} href={`/lists/${item.id}`} title={item.name} meta={`${item.itemCount} items`} />
              )}
            />
          )}
        </Section>

        {/* ── My Decisions ──────────────────────────────────────────── */}
        <Section
          icon={Zap}
          title="My Decisions"
          action={null}
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={decisions}
              emptyMessage="No decisions yet. Spin a wheel and commit to it!"
              renderItem={(item) => {
                const hasWheel = item.wheelId && item.wheelId !== "home";
                const wheelHref = hasWheel ? `/uwheels/${item.wheelId}` : "/";
                return (
                  <RowCard
                    key={item._id}
                    href={wheelHref}
                    title={item.result}
                    meta={`${item.wheelTitle || "Home Wheel"}${item.note ? ` · ${item.note}` : ""} · ${new Date(item.createdAt).toLocaleDateString()}`}
                    actions={
                      hasWheel ? (
                        <a
                          href={`/uwheels/${item.wheelId}`}
                          title="Spin again"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <RotateCcw size={13} />
                        </a>
                      ) : null
                    }
                  />
                );
              }}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
