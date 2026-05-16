"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Pencil, Plus, Zap, X, Image as ImageIcon, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { createSegment } from "@utils/segmentUtils";

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
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const listMenuRef = useRef(null);

  // ✅ Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) {
        setListMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Delete entire list
  async function deleteList() {
    await fetch(`/api/unifiedlist/${listId}`, { method: "DELETE" });
    router.push("/lists");
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
    window.location.href = "/";
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
    <div className="px-4 py-4 md:px-6 relative">

      {/* ✅ Actions Menu (Owner Only) */}
      {isOwner && (
        <div className="absolute top-6 right-6 flex items-center gap-1" ref={listMenuRef}>
          <button
            onClick={() => setEditModalOpen(true)}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit List Details"
          >
            <Pencil size={18} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setListMenuOpen((prev) => !prev)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-bold"
            >
              ⋮
            </button>

            {listMenuOpen && (
              <div className="absolute right-0 mt-2 bg-popover shadow-lg border border-border rounded-lg w-40 z-50 overflow-hidden">
                <SharePopup url={`/lists/${listId}`} variant="simple" />

                <button
                  onClick={deleteList}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm transition-colors border-t border-border"
                >
                  <Trash2 className="h-4 w-4" /> Delete List
                </button>
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
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-muted flex items-center justify-center mr-4 rounded-2xl overflow-hidden border border-border shadow-sm shrink-0">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt={`${list.name} cover`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-3xl md:text-4xl font-black">
              {list.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-xl md:text-2xl font-black text-foreground truncate">
            {list.name}
          </h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {list.items.length} item{list.items.length !== 1 ? 's' : ''}
          </p>
          {list.description && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
              {list.description}
            </p>
          )}
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold rounded-full shadow-sm transition-all active:scale-95"
          >
            <Zap size={14} className="fill-current" />
            Spin this List
          </button>
        </div>
      </div>

      {/* ✅ Add Item Panel (Owner Only) */}
      {isOwner && (
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
            {list.items.map((item, index) => {
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
                          href={`/${item.entityType}/${item.slug}`}
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
        onSave={saveListEdits}
      />
    </div>
  );
}
