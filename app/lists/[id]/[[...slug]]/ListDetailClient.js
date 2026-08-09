"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Pencil, Zap, X, Image as ImageIcon, Eye, EyeOff, ArrowUpDown, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { createSegment } from "@utils/segmentUtils";
import { getListUrl } from "@utils/UrlHandler";

import AddItemPanel from "./components/AddItemPanel";
import ListItems from "./components/ListItems";

// Lazy-loaded — EditListModal is only needed when owner clicks the pencil icon.
const EditListModal = dynamic(() => import("@components/lists/EditListModal"), { ssr: false });

// Lazy-loaded — SharePopup is only rendered inside the ⋮ dropdown (owner only,
// click-triggered). Keeps BrandIcons SVGs + react-hot-toast out of the initial chunk.
const SharePopup = dynamic(() => import("@components/SharePopup"), { ssr: false });

import UniversalCommentsSection from "@components/UniversalCommentsSection";
import StatsBar from "@app/(content)/[type]/StatsBar";

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
  const [sortBy, setSortBy] = useState("recently-saved");
  const [isPublic, setIsPublic] = useState(initialList?.isPublic ?? true);
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

  // ✅ Update sort order (local UI preference — not persisted to the list)
  function updateSort(newSortBy) {
    setSortBy(newSortBy);
  }

  // ✅ Update visibility setting
  async function updateVisibility(newIsPublic) {
    setIsPublic(newIsPublic);
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/unifiedlist/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedList = data.list || list;
        // Update local list state with full server response
        setList(prev => ({
          ...prev,
          ...updatedList,
          isPublic: newIsPublic,
        }));
        // Generate share link if going public
        if (newIsPublic) {
          if (typeof window !== 'undefined') {
            setShareLink(`${window.location.origin}${getListUrl(updatedList)}`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update visibility:", err);
      setIsPublic(isPublic); // revert
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
    setList(prev => ({ ...prev, ...data.list }));
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
    <div className={`relative ${initialList?.systemKey === "SYS_SAVED" ? "" : "px-4 py-4 md:px-6"}`}>

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

            {/* Title + Meta + Actions */}
            <div className="flex-1 min-w-0">
              {/* Top row: title + owner actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
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
                </div>

                {/* Owner actions — inline on mobile, absolute-like on desktop */}
                {isOwner && !isSystemList && (
                  <div className="flex items-center gap-1 shrink-0" ref={listMenuRef}>
                    <button
                      onClick={() => setEditModalOpen(true)}
                      title="Edit List Details"
                      className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
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
                          <SharePopup url={getListUrl(list)} variant="simple" />
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
                        </div>
                      )}
                    </div>
                  </div>
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

              <div className="mt-4">
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
        </div>
      )}

          {/* ✅ Controls Bar */}
      <div className={`mb-6 pb-4 ${isSystemList ? "" : "border-b border-border"}`}>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-muted-foreground" />
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => updateSort(e.target.value)}
              disabled={settingsSaving}
              title="Choose how to sort items"
              className="px-3 py-2 text-sm font-medium rounded-lg border bg-card border-border text-foreground hover:border-primary/50 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="recently-saved">Recently Saved</option>
              <option value="alphabetical">Alphabetical (A→Z)</option>
              <option value="status">Status (Want → Done)</option>
              <option value="entity-type">By Type</option>
            </select>
          </div>

          {/* Visibility + Share Controls (Owner Only) - Hidden for system lists */}
          {isOwner && !isSystemList && (
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => updateVisibility(!isPublic)}
                disabled={settingsSaving}
                title={`Click to make ${isPublic ? "private" : "public"}`}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border transition-all ${
                  isPublic
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                    : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                }`}
              >
                {isPublic ? (
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
              {isPublic && (
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}${getListUrl(list)}`);
                      alert("Share link copied!");
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-all"
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

      {/* ✅ Items */}
      <ListItems
        list={list}
        sortBy={sortBy}
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

      {/* ✅ Edit List Modal (lazy-loaded) */}
      <EditListModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        list={list}
        isSystem={isSystemList}
        onSave={saveListEdits}
      />

      <UniversalCommentsSection
        entityId={listId}
        entityType="list"
        initialCount={initialList?.commentCount || 0}
        onCountChange={setCommentCount}
      />
    </div>
  );
}
