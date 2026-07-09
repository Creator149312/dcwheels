"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Pencil, Plus, Zap, X, Image as ImageIcon, Check, Eye, EyeOff, ArrowUpDown, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { createSegment } from "@utils/segmentUtils";
import { sortListItems, getSortLabel, getVisibilityLabel } from "@lib/listSorting";

// Lazy-loaded — EditListModal is only needed when owner clicks the pencil icon.
const EditListModal = dynamic(() => import("@components/lists/EditListModal"), { ssr: false });

// Lazy-loaded — SharePopup is only rendered inside the ⋮ dropdown (owner only,
// click-triggered). Keeps BrandIcons SVGs + react-hot-toast out of the initial chunk.
const SharePopup = dynamic(() => import("@components/SharePopup"), { ssr: false });

export default function ListDetailClient({ initialList, listId, listOwnerId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isContentMode = searchParams.get("mode") === "content";
  const { data: session, status } = useSession();

  const [list, setList] = useState(initialList);
  // System list if either isSystem flag is true OR systemKey exists (for legacy backward compat/SYS_SAVED)
  const isSystemList = (initialList?.isSystem ?? false) || !!initialList?.systemKey || initialList?.systemKey === "SYS_SAVED";
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Settings state (sort and visibility)
  const [sortBy, setSortBy] = useState(initialList?.settings?.sortBy || "recently-saved");
  const [visibility, setVisibility] = useState(initialList?.settings?.visibility || "private");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");

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

  // null = panel closed, "text" | "bulk" | "image" = panel open on that tab
  const [addPanelMode, setAddPanelMode] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

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
    if (res.ok && data.list) setList(data.list);
  }

  // ✅ Save list edits
  async function saveListEdits(updated) {
    const res = await fetch(`/api/unifiedlist/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const data = await res.json();
    setList(data.list);
    setEditModalOpen(false);
  }

  // ✅ Update sort setting
  async function updateSort(newSortBy) {
    setSortBy(newSortBy);
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortBy: newSortBy }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local list settings
        setList(prev => ({
          ...prev,
          settings: { ...prev.settings, sortBy: newSortBy }
        }));
      }
    } catch (err) {
      console.error("Failed to update sort:", err);
      setSortBy(sortBy); // revert
    } finally {
      setSettingsSaving(false);
    }
  }

  // ✅ Update visibility setting
  async function updateVisibility(newVis) {
    setVisibility(newVis);
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVis }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local list settings
        setList(prev => ({
          ...prev,
          settings: { ...prev.settings, visibility: newVis }
        }));
        // Generate share link if going public
        if (newVis === "public") {
          setShareLink(`${window.location.origin}/lists/${listId}`);
        }
      }
    } catch (err) {
      console.error("Failed to update visibility:", err);
      setVisibility(visibility); // revert
    } finally {
      setSettingsSaving(false);
    }
  }

  // ✅ Spin this list on the home wheel
  function spinList() {
    const segments = list.items
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
          ? createSegment(i.word, { image: i.wordData || null })
          : null;
      })
      .filter(Boolean);

    if (segments.length === 0) return;

    const wheelObject = {
      title: list.name,
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

  // ✅ Add new item(s)
  async function addItem(payload) {
    const res = await fetch(`/api/unifiedlist/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.list) {
      console.error("addItem failed:", data?.error);
      return;
    }
    setList(data.list);
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
    if (res.ok && data.list) setList(data.list);
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
    <div className={`relative ${initialList?.systemKey === "SYS_SAVED" ? "" : "px-4 py-4 md:px-6"}`}>

      {/* ✅ Actions Menu (Owner Only) */}
      {isOwner && !isSystemList && (
        <div className="absolute top-6 right-6 flex items-center gap-1" ref={listMenuRef}>
          {/* Edit button - disabled for system lists */}
          <button
            onClick={() => setEditModalOpen(true)}
            disabled={isSystemList}
            title={isSystemList ? "This is a system list and cannot be edited" : "Edit List Details"}
            className={`p-2 rounded-full transition-colors ${
              isSystemList
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil size={18} />
          </button>
          
          {/* Menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setListMenuOpen((prev) => !prev)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-bold"
              title="More options"
            >
              ⋮
            </button>

            {listMenuOpen && (
              <div className="absolute right-0 mt-2 bg-popover shadow-lg border border-border rounded-lg w-40 z-50 overflow-hidden">
                <SharePopup url={`/lists/${listId}`} variant="simple" />

                {!isSystemList && (
                  <button
                    onClick={deleteList}
                    disabled={deleteSubmitting}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors border-t border-border ${
                      deleteConfirm 
                        ? "bg-red-50 text-red-600 hover:bg-red-100 font-bold" 
                        : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    }`}
                    title={deleteConfirm ? "Click again to confirm deletion" : "Delete this list"}
                  >
                    {deleteSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : deleteConfirm ? (
                      "Confirm Delete?"
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" /> Delete List
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Mode Banner */}
      {isContentMode && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Zap size={18} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium flex-1">You&apos;re in Content Wheel mode. Click <strong>Spin this List</strong> below to load it into the wheel.</span>
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-full shadow transition-all active:scale-95"
          >
            <Zap size={14} /> Spin Now
          </button>
        </div>
      )}

      {/* ✅ Header */}
      {isSystemList ? (
        <div className="mb-8">
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-base font-black rounded-2xl shadow-lg transition-all active:scale-95 group"
          >
            <Zap size={20} className="fill-current group-hover:scale-110 transition-transform" />
            Spin to Pick
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex items-start gap-4 md:gap-6">
            {/* Cover Image */}
            <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center rounded-2xl overflow-hidden border border-border shadow-md shrink-0">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt={`${list.name} cover`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl md:text-6xl font-black text-primary/40">
                  {list.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Title + Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-foreground">
                  {list.name}
                </h1>
                {isSystemList && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                    🔒 Locked
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-muted-foreground">
                  {list.items.length} {list.items.length === 1 ? "item" : "items"}
                </p>
                {list.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                    {list.description}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={spinList}
                disabled={list.items.length === 0}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Zap size={16} className="fill-current" />
                Spin this List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Controls Bar */}
      <div className={`mb-6 pb-4 ${isSystemList ? "" : "border-b border-border"}`}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Sort Control */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-muted-foreground" />
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort</label>
            </div>
            <select
              value={sortBy}
              onChange={(e) => updateSort(e.target.value)}
              disabled={settingsSaving}
              title="Choose how to sort items"
              className="px-3 py-2 text-sm font-medium rounded-lg border bg-card border-border text-foreground hover:border-primary/50 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="recently-saved">Recently Saved</option>
              <option value="alphabetical">Alphabetical (A→Z)</option>
              {/* Only show status/type sorting if there's diversity or it's not a minimal system view */}
              <option value="status">Status (Want → Done)</option>
              <option value="entity-type">By Type</option>
            </select>
          </div>

          {/* Visibility + Share Controls (Owner Only) - Hidden for system lists */}
          {isOwner && !isSystemList && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
              <button
                onClick={() => updateVisibility(visibility === "private" ? "public" : "private")}
                disabled={settingsSaving}
                title={`Click to make ${visibility === "public" ? "private" : "public"}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                  visibility === "public"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                    : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                }`}
              >
                {visibility === "public" ? (
                  <>
                    <Eye size={16} /> Public
                  </>
                ) : (
                  <>
                    <EyeOff size={16} /> Private
                  </>
                )}
              </button>

              {/* Share Link / Copied Feedback */}
              {visibility === "public" && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/lists/${listId}`);
                    alert("Share link copied!");
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-all"
                  title="Copy share link"
                >
                  🔗 Copy Link
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Add Item Panel (Owner Only) - Hidden for system lists */}
      {isOwner && !isSystemList && (
        <div className="mb-6">
          {addPanelMode === null ? (
            // ── Collapsed: single button ───────────────────────────────────
            <button
              onClick={() => setAddPanelMode("text")}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus size={16} /> Add Item
            </button>
          ) : (
            // ── Expanded panel ─────────────────────────────────────────────
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center border-b border-border">
                {["text", "bulk", "image"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAddPanelMode(mode)}
                    className={`px-4 py-2.5 text-xs font-bold capitalize transition-colors ${
                      addPanelMode === mode
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "text" ? "Quick Add" : mode === "bulk" ? "Bulk Import" : "Image"}
                  </button>
                ))}
                <button
                  onClick={() => setAddPanelMode(null)}
                  className="ml-auto p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Add */}
              {addPanelMode === "text" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const txt = new FormData(e.target).get("quickAdd")?.trim();
                    if (!txt) return;
                    addItem({ type: "word", word: txt, wordData: "" });
                    e.target.reset();
                  }}
                  className="flex gap-2 items-center p-3"
                >
                  <input
                    type="text"
                    name="quickAdd"
                    placeholder="Type an item and press Enter..."
                    autoFocus
                    autoComplete="off"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform shrink-0"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* Bulk Import */}
              {addPanelMode === "bulk" && (
                <form onSubmit={handleBulkSubmit} className="p-3 space-y-2">
                  <textarea
                    name="bulkText"
                    rows={5}
                    autoFocus
                    placeholder={"One item per line:\nMario\nLuigi\nBowser"}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    disabled={bulkLoading}
                  />
                  <button
                    type="submit"
                    disabled={bulkLoading}
                    className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform"
                  >
                    {bulkLoading ? "Importing..." : "Import All"}
                  </button>
                </form>
              )}

              {/* Image Upload */}
              {addPanelMode === "image" && (
                <form onSubmit={handleImageSubmit} className="p-3 space-y-3">
                  <input
                    type="text"
                    placeholder="Item name (e.g. Mario, Pizza...)"
                    value={imgWord}
                    onChange={(e) => setImgWord(e.target.value)}
                    autoFocus
                    disabled={imgUploading}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  {imgPreview ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden border border-border group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImgPreview(""); if (imgFileRef.current) imgFileRef.current.value = ""; }}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => imgFileRef.current?.click()}
                      className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex items-center justify-center gap-2 text-muted-foreground transition-colors"
                    >
                      <ImageIcon size={18} className="opacity-50" />
                      <span className="text-sm">Click to upload image</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={imgFileRef} onChange={handleImageSelect} />

                  <button
                    type="submit"
                    disabled={!imgWord.trim() || !imgPreview || imgUploading}
                    className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform"
                  >
                    {imgUploading ? "Uploading..." : "Add Image Item"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✅ Items */}
      {list.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Plus size={24} className="text-muted-foreground" />
          </div>
          <p className="font-bold text-foreground">No items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner ? "Click \"Add Item\" above to get started." : "This list is empty."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {list.items.length} item{list.items.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2 pb-10">
            {sortListItems(list.items, sortBy).map((item, index) => {
              const isEntity = item.type === "entity";
              const isWord = item.type === "word";
              const safeId = item._id || `missing-id-${index}`;
              const isEditing = editingItemId === safeId;

              const thumbnail = isEntity
                ? item.image
                : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
                ? item.wordData
                : null;

              // ── Editing mode: expand into a mini-form card ─────────────
              if (isEditing) {
                return (
                  <div
                    key={safeId}
                    className="border border-primary/40 ring-2 ring-primary/20 bg-muted/40 rounded-xl p-3 space-y-2.5 shadow-sm"
                  >
                    {/* Row: image picker + name input */}
                    <div className="flex items-start gap-3">
                      {/* Clickable thumbnail / image picker */}
                      <button
                        type="button"
                        onClick={() => editingImgFileRef.current?.click()}
                      className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary shrink-0 group/imgpick transition-colors"
                        title="Change image"
                      >
                        {editingImgPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={editingImgPreview} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center bg-muted text-xl font-black uppercase text-muted-foreground select-none">
                            {editingItemValue.charAt(0) || "?"}
                          </span>
                        )}
                        {/* Hover overlay */}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/imgpick:opacity-100 transition-opacity">
                          <ImageIcon size={14} className="text-white" />
                        </span>
                      </button>
                      <input type="file" accept="image/*" className="hidden" ref={editingImgFileRef} onChange={handleEditImageSelect} />

                      {/* Name input */}
                      <input
                        ref={editInputRef}
                        value={editingItemValue}
                        onChange={(e) => setEditingItemValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveItemEdit(safeId);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        disabled={editingSaving}
                        placeholder="Item name"
                        className="flex-1 bg-background border border-primary/50 rounded-lg px-2 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:font-normal placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Image hint */}
                    <p className="text-[11px] text-muted-foreground pl-0.5">
                      {editingImgPreview ? "Tap the thumbnail to replace the image." : "Tap the thumbnail to add a cover image."}
                    </p>

                    {/* Save / Cancel buttons */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        disabled={editingSaving}
                        className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveItemEdit(safeId)}
                        disabled={editingSaving || !editingItemValue.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-colors"
                      >
                        {editingSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                );
              }

              // ── Normal (view) mode ──────────────────────────────────────
              return (
                <div
                  key={safeId}
                  className="group flex items-center justify-between bg-card hover:bg-muted/30 border border-border shadow-sm rounded-2xl p-2 md:p-2.5 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-muted flex items-center justify-center rounded-xl mr-3 overflow-hidden shrink-0">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt={isWord ? item.word : item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-xl md:text-2xl font-black uppercase select-none">
                        {(isWord ? item.word : item.name)?.charAt(0) ?? "?"}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1 pr-2">
                    {isEntity ? (
                      <>
                      <a
                          href={
                            item.entityType === "wheel" ? `/wheels/${item.slug}` :
                            item.entityType === "uwheel" ? `/uwheels/${item.slug}` :
                            `/${item.entityType}/${item.slug}`
                          }
                          className="font-bold text-sm md:text-base hover:underline text-foreground truncate block"
                        >
                          {item.name}
                        </a>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                          {item.entityType}
                        </span>
                      </>
                    ) : (
                      <p className="font-bold text-sm md:text-base text-foreground truncate">
                        {item.word}
                      </p>
                    )}
                  </div>

                  {/* Action buttons (owner only) */}
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {isWord && (
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteItem(item._id)}
                        className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 text-muted-foreground transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ✅ Edit List Modal (lazy-loaded) */}
      <EditListModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        list={list}
        isSystem={isSystemList}
        onSave={saveListEdits}
      />
    </div>
  );
}
