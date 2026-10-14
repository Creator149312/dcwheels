"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Trash2, Pencil, Zap, X, Image as ImageIcon, Eye, EyeOff, ArrowUpDown, Loader2, Plus, Layers, ListOrdered, Trophy, GitFork } from "lucide-react";
import dynamic from "next/dynamic";
import { createSegment } from "@utils/segmentUtils";
import { getListUrl } from "@utils/UrlHandler";

import AddItemPanel from "./components/AddItemPanel";
import ListItems from "./components/ListItems";

const TierBoard = dynamic(() => import("./components/TierBoard"), { ssr: false });

// Lazy-loaded — EditListModal is only needed when owner clicks the pencil icon.
const EditListModal = dynamic(() => import("@components/lists/EditListModal"), { ssr: false });

// Lazy-loaded — SharePopup is only rendered inside the ⋮ dropdown (owner only,
// click-triggered). Keeps BrandIcons SVGs + react-hot-toast out of the initial chunk.
const SharePopup = dynamic(() => import("@components/SharePopup"), { ssr: false });

// Lazy-loaded — these sections render below the fold and pull in comment/reaction bundles.
const UniversalCommentsSection = dynamic(() => import("@components/UniversalCommentsSection"), { ssr: false });
const StatsBar = dynamic(() => import("@app/(content)/[type]/StatsBar"), { ssr: false });
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });
import { isListAdEligible } from "@/lib/adEligibility";

export default function ListDetailClient({ initialList, listId, listOwnerId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isContentMode = searchParams.get("mode") === "content";
  const { data: session, status } = useSession();

  const [list, setList] = useState(initialList);
  // System list if isSystem flag is true or a systemKey is set (covers SYS_SAVED and legacy lists)
  const isSystemList = (initialList?.isSystem ?? false) || !!initialList?.systemKey;
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialList?.commentCount || 0);

  // Visibility state (sort order is a local UI preference only)
  const [sortBy, setSortBy] = useState("custom");
  const [isPublic, setIsPublic] = useState(initialList?.isPublic ?? true);
  const [activeFormat, setActiveFormat] = useState(() => {
    const viewParam = searchParams.get("view");
    if (viewParam && ["standard", "ranked", "tiered"].includes(viewParam)) {
      return viewParam;
    }
    return initialList?.format || "standard";
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // isOwner starts false (safe default for guests/cached pages).
  // Resolves client-side after session is known — keeps page ISR-cacheable.
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !listOwnerId) return;
    if (session?.user?.id) {
      setIsOwner(session.user.id === listOwnerId);
    } else if (session) {
      // Old JWT without mongoId — fall back to server-side email lookup
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then(({ userId }) => { if (userId) setIsOwner(userId === listOwnerId); })
        .catch(() => {});
    }
  }, [session, status, listOwnerId]);

  // null = panel closed, "search" | "bulk" | "image" = panel open on that tab
  const [addPanelMode, setAddPanelMode] = useState(() => {
    return searchParams.get("action") === "add" ? "search" : null;
  });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Auto-open add panel if routed with ?action=add (e.g. from /lists/create)
  useEffect(() => {
    if (searchParams.get("action") === "add" && isOwner && !isSystemList) {
      setAddPanelMode("search");
    }
  }, [searchParams, isOwner, isSystemList]);

  // Inline item editing (word items only)
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemValue, setEditingItemValue] = useState("");
  const [editingImgPreview, setEditingImgPreview] = useState(""); // data: URL or CDN URL
  const [editingSaving, setEditingSaving] = useState(false);
  const editInputRef = useRef(null);
  const editingImgFileRef = useRef(null);

  // Image-upload state (only used when addPanelMode === "image")
  const [imgWord, setImgWord] = useState("");
  const [imgPreview, setImgPreview] = useState(""); // data: URL for preview only
  const [imgUploading, setImgUploading] = useState(false);
  const imgFileRef = useRef(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const listMenuRef = useRef(null);

  // ✅ Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) {
        setListMenuOpen(false);
        setDeleteConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Auto-reset delete confirmation
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  // ✅ Delete entire list
  async function deleteList() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("List deleted");
        router.push("/lists");
      } else {
        toast.error("Failed to delete list");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setDeleteSubmitting(false);
      setDeleteConfirm(false);
    }
  }

  // ✅ Delete a single item
  async function deleteItem(itemId) {
    const res = await fetch(`/api/unifiedlist/${listId}/items/${itemId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok && data.list) setList((prev) => ({ ...prev, ...data.list }));
  }

  // ✅ Save list edits
  async function saveListEdits(updated) {
    const res = await fetch(`/api/unifiedlist/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save list");
    }
    setList((prev) => ({ ...prev, ...data.list }));
    setEditModalOpen(false);
  }

  // ✅ Update sort order (local UI preference — not persisted to the list)
  function updateSort(newSortBy) {
    setSortBy(newSortBy);
  }

  // ✅ Publish list to public (one-way door: once public, cannot revert to private)
  async function updateVisibility(newIsPublic) {
    if (!newIsPublic) {
      toast.error("Public lists cannot be made private. You can delete the list if you wish to remove it.");
      return;
    }

    setIsPublic(true);
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedList = data.list || list;
        // Update local list state with full server response
        setList(prev => ({
          ...prev,
          ...updatedList,
          isPublic: true,
        }));
        toast.success("List is now published publicly!");
        if (typeof window !== 'undefined') {
          setShareLink(`${window.location.origin}${getListUrl(updatedList)}`);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to publish list");
        setIsPublic(false); // revert
      }
    } catch (err) {
      console.error("Failed to update visibility:", err);
      toast.error("Failed to publish list");
      setIsPublic(false); // revert
    } finally {
      setSettingsSaving(false);
    }
  }

  // ✅ Spin this list on the home wheel
  function spinList(overrideItems = null, customTitle = null) {
    const itemsToSpin = Array.isArray(overrideItems) ? overrideItems : list.items;
    const segments = itemsToSpin
      .map((i) => {
        if (i.type === "entity") {
          return createSegment(i.name, {
            type: "entity",
            image: i.image || null,
            payload: {
              entityType: i.entityType || null,
              entityId: i.entityId || i._id || null,
              slug: i.slug || null,
            },
            // Top-level entityType / slug intentionally omitted — they live
            // in `payload` only. WinnerPopup reads payload.entityType first.
          });
        }
        return i.word
          ? createSegment(i.word, {
              type: i.wordData?.startsWith("data:image") || i.wordData?.startsWith("http") ? "image" : "basic",
              image: i.wordData?.startsWith("data:image") || i.wordData?.startsWith("http") ? i.wordData : null,
            })
          : null;
      })
      .filter(Boolean);

    if (segments.length === 0) return;

    const wheelObject = {
      title: customTitle || list.name,
      description: list.description || "",
      type: "basic",
      data: segments,
      wheelData: {
        segColors: [
          "#EE4040", "#F0CF50", "#815CD1", "#3DA5E0",
          "#34A24F", "#F9AA1F", "#EC3F3F", "#FF9000",
        ],
        spinDuration: 5,
        maxNumberOfOptions: 100,
        innerRadius: 15,
        removeWinnerAfterSpin: false,
        customPopupDisplayMessage: "The Winner is...",
        fontSize: 1,
      },
    };

    localStorage.setItem("SpinpapaWheel", JSON.stringify(wheelObject));
    router.push("/wheels/create");
  }

  // ✅ Copy this list into the create-page draft so anyone can fix/remix it as their own
  function remixList() {
    const LS_DRAFT_KEY = "SpinpapaListDraft";
    try {
      const existing = JSON.parse(localStorage.getItem(LS_DRAFT_KEY) || "null");
      const hasUnsaved = existing && (existing.name?.trim() || existing.items?.length);
      if (hasUnsaved && !window.confirm("You have an unsaved list draft. Replace it with this remix?")) {
        return;
      }

      const ts = Date.now();
      const draft = {
        name: isOwner ? `${list.name} (Copy)` : list.name,
        description: list.description || "",
        format: activeFormat === "tiered" ? "tiered" : "standard",
        tierConfig: list.tierConfig,
        isPublic: true,
        items: (list.items || []).map((it, idx) => ({
          draftId: `remix-${ts}-${idx}`,
          type: it.type,
          word: it.word,
          wordData: it.wordData,
          entityType: it.entityType,
          entityId: it.entityId,
          name: it.name,
          slug: it.slug,
          image: it.image,
          tier: it.tier || null,
        })),
        forkedFrom: {
          listId: String(listId),
          name: list.name,
          username: list.ownerUsername || null,
        },
        updatedAt: ts,
      };
      localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draft));
      router.push("/lists/create");
    } catch (err) {
      console.error("Failed to remix list:", err);
      toast.error("Couldn't open this list for editing");
    }
  }

  // Refs for debouncing item reorder sync (prevents write amplification during rapid drag-and-drop)
  const reorderTimerRef = useRef(null);
  const pendingReorderItemsRef = useRef(null);

  // Flush any pending reorder sync on unmount so changes are never lost on fast navigation
  useEffect(() => {
    return () => {
      if (reorderTimerRef.current) {
        clearTimeout(reorderTimerRef.current);
      }
      if (pendingReorderItemsRef.current) {
        const payload = JSON.stringify({ items: pendingReorderItemsRef.current });
        // Use sendBeacon for guaranteed delivery on unmount/unload, fallback to fetch
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(`/api/unifiedlist/${listId}/items`, blob);
        } else {
          fetch(`/api/unifiedlist/${listId}/items`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
  }, [listId]);

  // ✅ Batch reorder / tier update with 600ms trailing debounce
  async function handleItemsReorder(newItems) {
    // 1. Instant local optimistic update for 60fps responsiveness
    setList((prev) => ({ ...prev, items: newItems }));
    pendingReorderItemsRef.current = newItems;

    // 2. Clear previous pending sync timer
    if (reorderTimerRef.current) {
      clearTimeout(reorderTimerRef.current);
    }

    // 3. Debounce network PUT by 600ms
    reorderTimerRef.current = setTimeout(async () => {
      const itemsToSync = pendingReorderItemsRef.current;
      if (!itemsToSync) return;

      try {
        const res = await fetch(`/api/unifiedlist/${listId}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToSync }),
        });
        if (res.ok) {
          pendingReorderItemsRef.current = null;
        }
      } catch (e) {
        console.error("Failed to reorder items:", e);
      }
    }, 600);
  }

  // ✅ Switch view mode (and persist default format if owner)
  async function updateFormat(newFormat) {
    setActiveFormat(newFormat);
    if (!isOwner) return;

    // Preserve "ranked" format when returning to List View
    const targetFormat = (newFormat === "standard" && list.format === "ranked") ? "ranked" : newFormat;
    if (targetFormat === list.format) return;

    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: targetFormat }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.list) setList((prev) => ({ ...prev, format: targetFormat }));
      }
    } catch (e) {
      console.error("Failed to update format:", e);
    }
  }

  // ✅ Add new item(s) (with optimistic UI update for instant feedback)
  async function addItem(payload) {
    // Generate optimistic item for instant UI responsiveness
    let tempId = `temp-${Date.now()}`;
    let optimisticItem = null;

    if (payload.type === "word") {
      optimisticItem = {
        _id: tempId,
        type: "word",
        word: payload.word,
        wordData: payload.wordData || "",
        addedAt: new Date().toISOString(),
      };
    } else if (payload.type === "entity") {
      optimisticItem = {
        _id: tempId,
        type: "entity",
        entityType: payload.entityType,
        entityId: payload.entityId,
        name: payload.name,
        slug: payload.slug,
        image: payload.image || null,
        status: payload.status || "want",
        addedAt: new Date().toISOString(),
      };
    }

    if (optimisticItem) {
      setList(prev => ({
        ...prev,
        items: [...(prev.items || []), optimisticItem],
      }));
    }

    try {
      const res = await fetch(`/api/unifiedlist/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.list) {
        console.error("addItem failed:", data?.error);
        // Revert on error
        if (optimisticItem) {
          setList(prev => ({
            ...prev,
            items: (prev.items || []).filter(i => i._id !== tempId),
          }));
        }
        return;
      }
      setList(prev => ({ ...prev, ...data.list }));
    } catch (err) {
      console.error("addItem network error:", err);
      if (optimisticItem) {
        setList(prev => ({
          ...prev,
          items: (prev.items || []).filter(i => i._id !== tempId),
        }));
      }
    }
  }

  // ✅ Start inline edit
  function startEdit(item) {
    setEditingItemId(item._id);
    setEditingItemValue(item.word || item.name || "");
    // Pre-fill existing image (CDN URL or data URL) so user can see and optionally replace it
    const existingImg =
      item.wordData?.startsWith("http") || item.wordData?.startsWith("data:")
        ? item.wordData
        : "";
    setEditingImgPreview(existingImg);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  // ✅ Cancel inline edit
  function cancelEdit() {
    setEditingItemId(null);
    setEditingItemValue("");
    setEditingImgPreview("");
    if (editingImgFileRef.current) editingImgFileRef.current.value = "";
  }

  // ✅ Image selected inside the inline edit panel
  function handleEditImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      if (editingImgFileRef.current) editingImgFileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setEditingImgPreview(reader.result);
    reader.readAsDataURL(file);
  }

  // ✅ Save inline edit (name + optional image)
  async function saveItemEdit(itemId) {
    const newVal = editingItemValue.trim();
    if (!newVal) return cancelEdit();
    setEditingSaving(true);

    // Upload new image if user picked a new data: URL
    let resolvedImg = editingImgPreview;
    if (editingImgPreview.startsWith("data:")) {
      try {
        const uploadRes = await fetch("/api/upload-segment-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: editingImgPreview }),
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          if (url) resolvedImg = url;
        }
      } catch {
        // keep data URL as fallback (will be stored in DB — acceptable for single items)
      }
    }

    const patch = { word: newVal, wordData: resolvedImg };
    const res = await fetch(`/api/unifiedlist/${listId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok && data.list) setList(prev => ({ ...prev, ...data.list }));
    setEditingItemId(null);
    setEditingItemValue("");
    setEditingImgPreview("");
    if (editingImgFileRef.current) editingImgFileRef.current.value = "";
    setEditingSaving(false);
  }

  // ✅ Bulk Submit
  async function handleBulkSubmit(e) {
    e.preventDefault();
    const rawText = new FormData(e.target).get("bulkText");
    if (!rawText?.trim()) return;
    setBulkLoading(true);
    const items = rawText
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((word) => ({ type: "word", word, wordData: "" }));
    await addItem({ items });
    setBulkLoading(false);
    setAddPanelMode(null);
    e.target.reset();
  }

  // ✅ Image select → data: URL preview (never stored in DB)
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      if (imgFileRef.current) imgFileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImgPreview(reader.result);
    reader.readAsDataURL(file);
  }

  // ✅ Image Submit → upload to Vercel Blob → store CDN URL
  async function handleImageSubmit(e) {
    e.preventDefault();
    if (!imgWord.trim() || !imgPreview) return;
    setImgUploading(true);
    let resolvedUrl = imgPreview;
    if (imgPreview.startsWith("data:")) {
      try {
        const res = await fetch("/api/upload-segment-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imgPreview }),
        });
        if (res.ok) {
          const { url } = await res.json();
          if (url) resolvedUrl = url;
        }
      } catch (err) {
        console.warn("Image upload failed, falling back to data URL:", err);
      }
    }
    await addItem({ type: "word", word: imgWord.trim(), wordData: resolvedUrl });
    setImgWord("");
    setImgPreview("");
    setImgUploading(false);
    setAddPanelMode(null);
    if (imgFileRef.current) imgFileRef.current.value = "";
  }

  const firstItem = list.items?.[0];
  const coverImage =
    firstItem?.type === "entity" && firstItem?.image
      ? firstItem.image
      : firstItem?.type === "word" &&
        firstItem?.wordData?.startsWith("data:image")
      ? firstItem.wordData
      : null;

  return (
    <div className={`relative max-w-4xl mx-auto ${initialList?.systemKey === "SYS_SAVED" ? "" : "px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6"}`}>

      {/* Content Mode Banner */}
      {isContentMode && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 text-emerald-900 dark:text-emerald-200 backdrop-blur-sm shadow-sm">
          <Zap size={18} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium flex-1">You&apos;re in Content Wheel mode. Click <strong>Spin this List</strong> to load it into the wheel.</span>
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-full shadow transition-all active:scale-95"
          >
            <Zap size={13} /> Spin Now
          </button>
        </div>
      )}

      {/* ✅ Header (Clean, borderless typography design) */}
      {isSystemList ? (
        <div className="mb-4 sm:mb-6">
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold rounded-xl shadow transition-all active:scale-95 group"
          >
            <Zap size={18} className="fill-current group-hover:scale-110 transition-transform" />
            Spin to Pick
          </button>
        </div>
      ) : (
        <div className="mb-6 sm:mb-8 pt-1 sm:pt-2">
          {/* Top row: title + owner actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                  {list.name}
                </h1>
                {isSystemList && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    🔒 System
                  </span>
                )}
                {isOwner && !isSystemList && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isPublic
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
                    <span>{isPublic ? "Public" : "Private"}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                {list.forkedFrom && (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <GitFork size={12} className="shrink-0" />
                    <span>Remixed from</span>
                    {list.forkedFrom.listId ? (
                      <a href={getListUrl({ slug: list.forkedFrom.slug, id: list.forkedFrom.listId })} className="font-semibold text-foreground hover:underline truncate">
                        {list.forkedFrom.name}
                      </a>
                    ) : (
                      <span className="italic">a list that&apos;s no longer available</span>
                    )}
                    {list.forkedFrom.username && (
                      <>
                        <span>by</span>
                        <a href={`/u/${encodeURIComponent(list.forkedFrom.username)}`} className="font-semibold text-foreground hover:underline">
                          @{list.forkedFrom.username}
                        </a>
                      </>
                    )}
                  </p>
                )}
                {list.description && (
                  <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-normal max-w-3xl mt-0.5">
                    {list.description}
                  </p>
                )}
              </div>
            </div>

            {/* Owner actions */}
            {isOwner && !isSystemList && (
              <div className="flex items-center shrink-0 mt-1" ref={listMenuRef}>
                <div className="relative">
                  <button
                    onClick={() => setListMenuOpen((prev) => !prev)}
                    className="p-2 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border font-bold text-base flex items-center justify-center w-8 h-8"
                    title="List options"
                    aria-label="List options"
                  >
                    ⋮
                  </button>

                  {listMenuOpen && (
                    <div className="absolute right-0 mt-2 bg-popover shadow-xl border border-border rounded-xl w-48 z-50 overflow-hidden divide-y divide-border">
                      <div className="p-1">
                        {!isPublic && (
                          <button
                            onClick={() => {
                              updateVisibility(true);
                              setListMenuOpen(false);
                            }}
                            disabled={settingsSaving}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-muted rounded-lg transition-colors text-left"
                          >
                            <Eye size={14} className="shrink-0" />
                            <span>Publish to Public</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditModalOpen(true);
                            setListMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-lg transition-colors text-left"
                        >
                          <Pencil size={14} className="text-muted-foreground shrink-0" />
                          <span>Edit Details</span>
                        </button>
                      </div>

                      <div className="p-1">
                        <button
                          onClick={deleteList}
                          disabled={deleteSubmitting}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                            deleteConfirm
                              ? "bg-red-50 text-red-600 hover:bg-red-100 font-bold dark:bg-red-950/40"
                              : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          }`}
                        >
                          {deleteSubmitting ? (
                            <Loader2 size={13} className="animate-spin shrink-0" />
                          ) : deleteConfirm ? (
                            "Confirm Delete?"
                          ) : (
                            <>
                              <Trash2 size={14} className="shrink-0" />
                              <span>Delete List</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Button & Engagement Bar */}
          <div className="mt-4 pt-3 flex items-center justify-between gap-2.5">
            <button
              onClick={spinList}
              disabled={list.items.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
            >
              <Zap size={15} className="fill-current" />
              <span>Spin this List</span>
            </button>

            <button
              onClick={remixList}
              disabled={list.items.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 shrink-0"
              title={isOwner ? "Duplicate this list as a new draft" : "Make your own version of this list"}
            >
              <GitFork size={15} />
              <span>{isOwner ? "Duplicate" : "Remix"}</span>
              {list.forkCount > 0 && (
                <span className="text-muted-foreground font-semibold">{list.forkCount}</span>
              )}
            </button>

            <div className="flex-1" />

            <div className="shrink-0">
              <StatsBar
                entityType="list"
                entityId={listId}
                session={session}
                show={{ like: true, share: true, save: false, follow: false, comment: true }}
                shareUrl={origin ? `${origin}${getListUrl(list)}` : ""}
                commentCount={commentCount}
                onCommentClick={() => {
                  if (typeof window !== 'undefined') {
                    if (window.innerWidth < 768) {
                      window.dispatchEvent(new CustomEvent("comments:open-drawer", {
                        detail: { entityId: String(listId) }
                      }));
                    } else {
                      const el = document.getElementById("comments-section");
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("comment-form:focus"));
                        }, 300);
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ Controls Bar */}
      <div className={`mb-4 pb-2 ${isSystemList ? "" : "border-b border-border/40"}`}>
        <div className="flex items-center justify-between gap-2">
          {/* View / Format Mode Switcher (Custom lists only) */}
          {!isSystemList ? (
            <div className="flex items-center p-0.5 rounded-xl border border-border bg-muted/40 shadow-2xs">
              <button
                type="button"
                onClick={() => updateFormat("standard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFormat !== "tiered"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Standard collection view"
              >
                <Layers size={14} />
                <span>Collection</span>
              </button>
              <button
                type="button"
                onClick={() => updateFormat("tiered")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFormat === "tiered"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visual S/A/B/C/D tier list board"
              >
                <Trophy size={14} />
                <span>Tier Board</span>
              </button>
            </div>
          ) : <div />}

          {/* Right side controls (Owner Add Item) */}
          {isOwner && !isSystemList && (
            <button
              onClick={() => setAddPanelMode((prev) => (prev === null ? "search" : null))}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 shrink-0"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* ✅ Add Item Panel (Owner Only) - Hidden for system lists */}
      <AddItemPanel
        addPanelMode={addPanelMode}
        isOwner={isOwner}
        isSystemList={isSystemList}
        bulkLoading={bulkLoading}
        imgWord={imgWord}
        imgPreview={imgPreview}
        imgUploading={imgUploading}
        imgFileRef={imgFileRef}
        setAddPanelMode={setAddPanelMode}
        addItem={addItem}
        handleBulkSubmit={handleBulkSubmit}
        handleImageSelect={handleImageSelect}
        handleImageSubmit={handleImageSubmit}
        setImgWord={setImgWord}
        setImgPreview={setImgPreview}
      />

      {/* ✅ Render Items by Selected Format */}
      {activeFormat === "tiered" && !isSystemList ? (
        <TierBoard
          list={list}
          isOwner={isOwner}
          onReorder={handleItemsReorder}
          onSpinTier={spinList}
          deleteItem={deleteItem}
        />
      ) : (
        <ListItems
          list={list}
          sortBy={sortBy}
          onSortChange={updateSort}
          onReorder={handleItemsReorder}
          isOwner={isOwner}
          isSystemList={isSystemList}
          editingItemId={editingItemId}
          editingItemValue={editingItemValue}
          editingImgPreview={editingImgPreview}
          editingSaving={editingSaving}
          editInputRef={editInputRef}
          editingImgFileRef={editingImgFileRef}
          startEdit={startEdit}
          saveItemEdit={saveItemEdit}
          cancelEdit={cancelEdit}
          deleteItem={deleteItem}
          handleEditImageSelect={handleEditImageSelect}
          setEditingItemValue={setEditingItemValue}
        />
      )}

      {/* ✅ Edit List Modal (lazy-loaded) */}
      <EditListModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        list={list}
        isSystem={isSystemList}
        onSave={saveListEdits}
      />

      {isListAdEligible(list) && (
        <div className="min-h-[90px] my-4 px-1">
          <AdsUnit slot="4694567949" />
        </div>
      )}

      <UniversalCommentsSection
        entityId={listId}
        entityType="list"
        initialCount={initialList?.commentCount || 0}
        onCountChange={setCommentCount}
      />
    </div>
  );
}
