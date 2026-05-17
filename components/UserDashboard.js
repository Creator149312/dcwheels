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
  pending: { label: "Pending",  emoji: "⏳", cls: "bg-muted text-muted-foreground hover:border-border" },
  done:    { label: "Done",     emoji: "✅", cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:border-green-400" },
  dropped: { label: "Dropped",  emoji: "❌", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:border-red-400" },
};
const STATUS_CYCLE = { pending: "done", done: "dropped", dropped: "pending" };

// ── Single decision card (timeline style, with status badge) ──────────────
export function DecisionTimelineItem({ item }) {
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
      <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-primary bg-background shadow-sm shadow-primary/20" />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Card header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-primary/10 text-primary">
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
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
        </div>

        {/* Card body */}
        <p className="text-sm text-foreground">
          Spun{" "}
          <Link href={wheelRoute} className="font-medium text-primary hover:underline">
            {item.wheelTitle || "a wheel"}
          </Link>{" "}
          and got{" "}
          <span className="font-bold text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
            {item.result}
          </span>
        </p>

        {item.resultImage && (
          <div className="mt-2.5 w-full h-32 relative rounded-lg overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.resultImage} alt={item.result} className="w-full h-full object-contain" />
          </div>
        )}

        {item.note && (
          <p className="mt-2 text-sm text-muted-foreground border-l-[3px] border-primary/30 pl-3 italic">
            &quot;{item.note}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Decision timeline wrapper (expand/collapse) ────────────────────────────
function DecisionTimeline({ decisions }) {
  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent hidden sm:block" />
      {decisions.map((item) => (
        <DecisionTimelineItem key={item._id} item={item} />
      ))}
    </div>
  );
}

// ── Small row card shared by all sections ─────────────────────────────────
export function RowCard({ href, title, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors group">
      <Link href={href} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {meta && <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>}
      </Link>
      <div className="flex items-center gap-1 flex-shrink-0 ml-3">
        {actions}
        <Link href={href}>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────
export function RowSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse h-12 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, action, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon size={16} className="text-primary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Expandable list helper ─────────────────────────────────────────────────
function ExpandableList({ items, renderItem, emptyMessage }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map(renderItem)}
    </div>
  );
}

// ── Stats summary card ─────────────────────────────────────────────────────
function StatsCard({ stats, decisions = [], loading }) {
  if (loading) {
    return (
      <div className="animate-pulse h-24 rounded-2xl bg-muted" />
    );
  }

  if (!stats) return null;

  const { decisionsTotal, streak, wheelsTotal, listsTotal } = stats;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Decisions Made */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-800/40 px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={13} className="text-blue-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Decisions Made</p>
          </div>
          <p className="text-2xl font-black text-foreground">{decisionsTotal || 0}</p>
        </div>

        {/* Streak */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30 border border-orange-200/50 dark:border-orange-800/40 px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame size={13} className="text-orange-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Streak</p>
          </div>
          <p className="text-2xl font-black text-foreground">
            {streak || 0}<span className="text-base ml-0.5">🔥</span>
          </p>
        </div>

        {/* Wheels Count */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-800/40 px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers size={13} className="text-purple-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Custom Wheels</p>
          </div>
          <p className="text-2xl font-black text-foreground">{wheelsTotal || 0}</p>
        </div>

        {/* Lists Count */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/40 px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <BookMarked size={13} className="text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Saved Lists</p>
          </div>
          <p className="text-2xl font-black text-foreground">{listsTotal || 0}</p>
        </div>
      </div>
    </div>
  );
}

// ── Wheel row with public toggle ───────────────────────────────────────────
export function WheelRowCard({ item, showToggle = true }) {
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
        showToggle ? (
          <button
            onClick={togglePublic}
            disabled={toggling}
            title={isPublic ? "Listed in Explore — click to make private" : "Click to list in Explore"}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-50 ${
              isPublic
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
                : "text-muted-foreground border-border hover:border-purple-300 hover:text-purple-500"
            }`}
          >
            {isPublic ? "Public" : "Private"}
          </button>
        ) : null
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
        <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
        <Link href="/login" className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-primary mb-1">Dashboard</p>
          <h1 className="text-2xl font-black text-foreground">
            Hey, {name} 👋
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAdmin && (
            <>
              <Link
                href="/dashboard/admin/wheels-to-pages"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-1.5"
              >
                AI Wheel Creator
              </Link>
              <Link
                href="/dashboard/admin/preview-generator"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-1.5"
              >
                Preview Generator
              </Link>
            </>
          )}
          <Link
            href="/dashboard/account"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
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
            <div className="flex items-center gap-4">
              <Link href="/dashboard/wheels" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                View all →
              </Link>
              <a href="/" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
                <Plus size={12} /> New
              </a>
            </div>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={wheels}
              emptyMessage={<>No wheels yet. <a href="/" className="text-primary hover:underline">Create one!</a></>}
              renderItem={(item) => (
                <WheelRowCard key={item._id} item={item} showToggle={false} />
              )}
            />
          )}
        </Section>

        {/* ── My Lists ──────────────────────────────────────────────── */}
        <Section
          icon={BookMarked}
          title="My Lists"
          action={
            <div className="flex items-center gap-4">
              <Link href="/dashboard/lists" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                View all →
              </Link>
              <a href="/lists/create" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
                <Plus size={12} /> New
              </a>
            </div>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : (
            <ExpandableList
              items={lists}
              emptyMessage={<>No lists yet. <a href="/lists/create" className="text-primary hover:underline">Create one!</a></>}
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
          action={
            <Link href="/dashboard/decisions" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </Link>
          }
        >
          {loading ? (
            <RowSkeleton />
          ) : decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions yet. Spin a wheel and commit to it!</p>
          ) : (
            <DecisionTimeline decisions={decisions} />
          )}
        </Section>
      </div>
    </div>
  );
}
