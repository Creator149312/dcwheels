"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  List,
  ArrowLeft,
  Loader2,
  Layers,
  Trophy,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Hash,
  GitFork,
} from "lucide-react";
import { getListUrl } from "@utils/UrlHandler";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import CreateItemPanel from "./components/CreateItemPanel";
import DraftItemsEditor from "./components/DraftItemsEditor";

const LS_DRAFT_KEY = "SpinpapaListDraft";

const DEFAULT_TIERS = [
  { key: "S", label: "S", color: "#EF4444" },
  { key: "A", label: "A", color: "#F97316" },
  { key: "B", label: "B", color: "#EAB308" },
  { key: "C", label: "C", color: "#10B981" },
  { key: "D", label: "D", color: "#3B82F6" },
];

export default function CreateListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("standard"); // "standard" | "tiered"
  const [tierConfig, setTierConfig] = useState(DEFAULT_TIERS);
  const [isPublic, setIsPublic] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [forkedFrom, setForkedFrom] = useState(null); // { listId, name, username }

  // 1. Restore from localStorage on mount (including drafts sent from wheels or previously saved)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(LS_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          if (parsed.name) setName(parsed.name);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.format && ["standard", "tiered"].includes(parsed.format)) {
            setFormat(parsed.format);
          }
          if (Array.isArray(parsed.tierConfig) && parsed.tierConfig.length > 0) {
            setTierConfig(parsed.tierConfig);
          }
          if (typeof parsed.isPublic === "boolean") {
            setIsPublic(parsed.isPublic);
          }
          if (parsed.forkedFrom?.listId) {
            setForkedFrom(parsed.forkedFrom);
          }
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            // Ensure every item has a unique draftId for stable keying
            const hydrated = parsed.items.map((it, idx) => ({
              ...it,
              draftId: it.draftId || `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            }));
            setItems(hydrated);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load draft list from localStorage:", e);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  // 2. Auto-save draft changes to localStorage (debounced)
  useEffect(() => {
    if (!hasLoadedDraft || typeof window === "undefined") return;

    const timer = setTimeout(() => {
      try {
        // If everything is completely empty, clean up
        if (!name.trim() && !description.trim() && items.length === 0) {
          localStorage.removeItem(LS_DRAFT_KEY);
          return;
        }

        const draftObj = {
          name,
          description,
          format,
          tierConfig,
          isPublic,
          items,
          forkedFrom,
          updatedAt: Date.now(),
        };
        localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draftObj));
      } catch (e) {
        console.warn("Failed to save draft to localStorage:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name, description, format, tierConfig, isPublic, items, forkedFrom, hasLoadedDraft]);

  // Back URL
  const backUrl = session?.user?.name
    ? `/u/${encodeURIComponent(session.user.name.toLowerCase())}`
    : "/lists";

  // Item additions & manipulations
  const handleAddItem = useCallback((newItem) => {
    setItems((prev) => [
      ...prev,
      {
        ...newItem,
        draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
    ]);
  }, []);

  const handleAddBulkItems = useCallback((words) => {
    const newItems = words.map((word, idx) => ({
      type: "word",
      word,
      wordData: "",
      draftId: `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleUpdateItems = useCallback((updatedItems) => {
    setItems(updatedItems);
  }, []);

  const handleRemoveItem = useCallback((draftId) => {
    setItems((prev) => prev.filter((i) => i.draftId !== draftId));
  }, []);

  const handleResetDraft = () => {
    setName("");
    setDescription("");
    setFormat("standard");
    setTierConfig(DEFAULT_TIERS);
    setIsPublic(true);
    setItems([]);
    setForkedFrom(null);
    setError("");
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_DRAFT_KEY);
    }
    setShowClearConfirm(false);
  };

  // Submit to API
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for your list.");
      return;
    }

    // Auth gate: if user is not logged in, prompt login
    if (!session?.user) {
      if (openLoginPrompt) {
        openLoginPrompt();
      } else {
        router.push("/login?callbackUrl=/lists/create");
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unifiedlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isPublic,
          format,
          tierConfig: format === "tiered" ? tierConfig : undefined,
          forkedFromListId: forkedFrom?.listId || undefined,
          items: items.map((it, idx) => ({
            type: it.type || "word",
            word: it.word || it.name,
            wordData: it.wordData || it.image,
            entityType: it.entityType,
            entityId: it.entityId,
            name: it.name,
            slug: it.slug,
            image: it.image,
            status: it.status || "want",
            tier: it.tier || null,
            rank: idx + 1,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create list");
      }

      // Success! Clear the draft from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(LS_DRAFT_KEY);
      }

      const targetUrl = data.url || getListUrl(data.list);
      router.push(targetUrl);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 min-h-screen">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Action Bar (Reset / Save buttons) */}
        <div className="flex items-center gap-2">
          {(name || items.length > 0) && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors border border-border"
            >
              <RotateCcw size={13} />
              <span>Clear Draft</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-violet-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save List</span>
              </>
            )}
          </button>
        </div>
      </div>

      {forkedFrom?.listId && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-foreground">
          <GitFork size={14} className="text-violet-500 shrink-0" />
          <span className="flex-1 min-w-0 truncate">
            Remixing <strong>{forkedFrom.name || "a list"}</strong>
            {forkedFrom.username && <> by @{forkedFrom.username}</>}. Your changes won&apos;t affect the original.
          </span>
        </div>
      )}

      {/* Clear Draft Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-foreground mb-2">Clear draft list?</h3>
            <p className="text-xs text-muted-foreground mb-5">
              This will remove all entered titles, items, and rankings from your browser storage.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800/50 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="space-y-6">
        {/* Section 1: List Metadata & Format Settings */}
        <div className="bg-card border border-border shadow-xs rounded-2xl p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl">
                <List size={22} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-foreground">List Builder</h1>
              </div>
            </div>

            {items.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* List Title */}
            <div>
              <label htmlFor="listName" className="block text-xs font-bold text-foreground mb-1.5">
                List Name <span className="text-red-500">*</span>
              </label>
              <input
                id="listName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Best Sci-Fi Movies of All Time"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="listDesc" className="block text-xs font-bold text-foreground">
                  Description <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {description.length}/300
                </span>
              </div>
              <textarea
                id="listDesc"
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes, context, or why you ranked these items this way..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-y min-h-[80px]"
              />
            </div>
          </div>

          {/* Quick Options Row: Tier List Checkbox & Public Visibility */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/60">
            {/* Tier List Checkbox */}
            <label htmlFor="isTiered" className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                id="isTiered"
                type="checkbox"
                checked={format === "tiered"}
                onChange={(e) => setFormat(e.target.checked ? "tiered" : "standard")}
                className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 text-xs">
                <Trophy size={14} className="text-amber-500 shrink-0" />
                <span className="font-bold text-foreground">Tier List Board</span>
              </div>
            </label>

            {/* Visibility Toggle */}
            <label htmlFor="isPublic" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span className="text-xs text-foreground font-semibold">
                Make public
              </span>
            </label>
          </div>
        </div>

        {/* Section 2: Interactive Item Adder (Omnibox + Bulk + Image) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
              <span>Add Items</span>
            </h3>
          </div>

          <CreateItemPanel onAddItem={handleAddItem} onAddBulkItems={handleAddBulkItems} />
        </div>

        {/* Section 3: Draft Items Preview & Interactive Ordering / Tiering */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers size={16} className="text-violet-600 dark:text-violet-400" />
              <span>Items ({items.length})</span>
            </h3>
          </div>

          <DraftItemsEditor
            items={items}
            format={format}
            tierConfig={tierConfig}
            onUpdateItems={handleUpdateItems}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* Bottom Save Action Bar */}
        <div className="pt-4 flex items-center justify-between border-t border-border">
          <Link
            href={backUrl}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            Cancel & Return
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-violet-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving to Account...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save List ({items.length} {items.length === 1 ? "Item" : "Items"})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
