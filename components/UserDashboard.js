"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowRight, Plus, Layers, BookMarked, Zap } from "lucide-react";
import apiConfig from "@utils/ApiUrlConfig";

// ── Small row card shared by all sections ─────────────────────────────────
function RowCard({ href, title, meta }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
      </div>
      <ArrowRight size={14} className="flex-shrink-0 ml-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
    </a>
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

// ── Wheels section ─────────────────────────────────────────────────────────
function WheelsSection({ email }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiConfig.apiUrl}/wheel/user/${email}`)
      .then((r) => r.json())
      .then((d) => setItems((d.lists || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  return (
    <Section
      icon={Layers}
      title="My Wheels"
      action={
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus size={12} /> New
          </a>
          <a href="/dashboard/wheels" className="text-xs text-blue-500 hover:underline">View all</a>
        </div>
      }
    >
      {loading ? (
        <RowSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No wheels yet. <a href="/" className="text-blue-500 hover:underline">Create one!</a></p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RowCard key={item._id} href={`/uwheels/${item._id}`} title={item.title} meta={`${item.data?.length ?? 0} segments`} />
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Lists section ──────────────────────────────────────────────────────────
function ListsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/unifiedlist")
      .then((r) => r.json())
      .then((d) => setItems((d.lists || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Section
      icon={BookMarked}
      title="My Lists"
      action={
        <a href="/lists" className="text-xs text-blue-500 hover:underline">View all</a>
      }
    >
      {loading ? (
        <RowSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No lists yet. Add items from any anime, movie or game page.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RowCard key={item.id} href={`/lists/${item.id}`} title={item.name} meta={`${item.items?.length ?? 0} items`} />
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Decisions section ──────────────────────────────────────────────────────
function DecisionsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/decision-log")
      .then((r) => r.json())
      .then((d) => setItems((d.decisions || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Section
      icon={Zap}
      title="My Decisions"
      action={null}
    >
      {loading ? (
        <RowSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No decisions yet. Spin a wheel and commit to it!</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RowCard
              key={item._id}
              href={item.wheelId ? `/uwheels/${item.wheelId}` : "#"}
              title={item.result}
              meta={`${item.wheelTitle}${item.note ? ` · ${item.note}` : ""}`}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.email === "gauravsingh9314@gmail.com";

  if (status === "loading") {
    return (
      <div className="w-full px-4 py-10 space-y-8">
        <RowSkeleton count={6} />
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">You need to be logged in to view your dashboard.</p>
        <a href="/login" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Log in
        </a>
      </div>
    );
  }

  const name = session.user.name || session.user.email.split("@")[0];

  return (
    <div className="w-full px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Stacked sections */}
      <div className="space-y-10">
        <WheelsSection email={session.user.email} />
        <ListsSection />
        <DecisionsSection />
      </div>
    </div>
  );
}
