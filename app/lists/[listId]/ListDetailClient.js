"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiTrash2, FiEdit2, FiPlus } from "react-icons/fi";
import { FiZap } from "react-icons/fi";
import SharePopup from "@components/SharePopup";
import { createSegment } from "@utils/segmentUtils";
import AddListItemModal from "@components/lists/AddListItemModal";
import EditListModal from "@components/lists/EditListModal";

export default function ListDetailClient({ initialList, listId, isOwner: isOwnerProp }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isContentMode = searchParams.get("mode") === "content";
  const { data: session } = useSession();

  const [list, setList] = useState(initialList);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const listMenuRef = useRef(null);

  // Owner check runs client-side via the session so the server page can be
  // CDN-cached regardless of who requests it. `isOwnerProp` is accepted for
  // back-compat / SSR fallback during initial hydration.
  const isOwner = useMemo(() => {
    if (typeof isOwnerProp === "boolean") return isOwnerProp;
    const uid = session?.user?.id;
    return !!uid && list?.userId && uid === list.userId;
  }, [isOwnerProp, session?.user?.id, list?.userId]);


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
    setList(data.list); // API returns updated list
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
            entityType: i.entityType || null,
            slug: i.slug || null,
          });
        }
        return i.word ? createSegment(i.word) : null;
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

  // ✅ Add new item
  async function addItem(payload) {
    const res = await fetch(`/api/unifiedlist/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setList(data.list);
    setModalOpen(false);
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
    <div className="px-4 py-4 md:px-6 bg-gray-50 dark:bg-gray-900 relative">

      {/* ✅ Actions Menu (Owner Only) */}
      {isOwner && (
        <div className="absolute top-6 right-6" ref={listMenuRef}>
          <button
            onClick={() => setListMenuOpen((prev) => !prev)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            ⋮
          </button>

          {listMenuOpen && (
            <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg w-40 z-50">
              <SharePopup url={`/lists/${listId}`} variant="simple" />

              <button
                onClick={() => {
                  setEditModalOpen(true);
                  setListMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiEdit2 /> Edit
              </button>

              <button
                onClick={deleteList}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content Mode Banner */}
      {isContentMode && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <FiZap size={18} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium flex-1">You&apos;re in Content Wheel mode. Click <strong>Spin this List</strong> below to load it into the wheel.</span>
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-full shadow transition-all active:scale-95"
          >
            <FiZap size={14} /> Spin Now
          </button>
        </div>
      )}

      {/* ✅ Header */}
      <div className="flex items-center mb-4">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-4 rounded-lg overflow-hidden">
          {coverImage ? (
            <img src={coverImage} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-3xl font-bold">
              {list.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {list.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {list.items.length} items
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            {list.description}
          </p>
          <button
            onClick={spinList}
            disabled={list.items.length === 0}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full shadow transition-all active:scale-95"
          >
            <FiZap size={15} />
            Spin this List
          </button>
        </div>
      </div>

      {/* ✅ Items */}
      <div className="space-y-2 overflow-y-auto pr-2">
        {list.items.map((item, index) => {
          const isEntity = item.type === "entity";
          const isWord = item.type === "word";
          const safeId = item._id || `missing-id-${index}`;

          const thumbnail = isEntity
            ? item.image
            : isWord && item.wordData?.startsWith("data:image")
            ? item.wordData
            : null;

          return (
            <div
              key={safeId}
              className="group flex items-center justify-between bg-white dark:bg-gray-800 shadow rounded-lg p-2"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded mr-3 overflow-hidden flex-shrink-0">
                  {thumbnail ? (
                    <img src={thumbnail} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-xl font-bold">
                      {isWord
                        ? item.word?.charAt(0).toUpperCase()
                        : item.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  {isEntity ? (
                    <>
                      <a
                        href={`/${item.entityType}/${item.slug}`}
                        className="font-semibold text-sm hover:underline text-gray-900 dark:text-gray-100"
                      >
                        {item.name}
                      </a>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {item.entityType}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {item.word}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.wordData?.startsWith("data:image")
                          ? "Image"
                          : item.wordData || ""}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* ✅ Delete Item (Owner Only) */}
              {isOwner && (
                <button
                  onClick={() => deleteItem(item._id)}
                  className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 className="text-red-600 dark:text-red-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ Add Item Button (Owner Only) */}
      {isOwner && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
        >
          <FiPlus /> Add Item
        </button>
      )}

      {/* ✅ Modals */}
      <AddListItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addItem}
      />

      <EditListModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        list={list}
        onSave={saveListEdits}
      />
    </div>
  );
}
