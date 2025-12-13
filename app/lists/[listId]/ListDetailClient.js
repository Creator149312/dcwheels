"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiTrash2, FiEdit2, FiPlus } from "react-icons/fi";
import SharePopup from "@components/SharePopup";
import AddListItemModal from "@components/lists/AddListItemModal";
import EditListModal from "@components/lists/EditListModal";

export default function ListDetailClient({ initialList, listId, isOwner }) {
  const router = useRouter();

  const [list, setList] = useState(initialList);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

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
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">

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

      {/* ✅ Header */}
      <div className="flex items-center mb-6">
        <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-6 rounded overflow-hidden">
          {coverImage ? (
            <img src={coverImage} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-3xl font-bold">
              {list.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {list.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {list.items.length} items
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-4">
            {list.description}
          </p>
        </div>
      </div>

      {/* ✅ Items */}
      <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
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
              className="group flex items-center justify-between bg-white dark:bg-gray-800 shadow rounded-lg p-3"
            >
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded mr-4 overflow-hidden">
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
                        className="font-semibold text-lg hover:underline text-gray-900 dark:text-gray-100"
                      >
                        {item.name}
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {item.entityType}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {item.word}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.wordData?.startsWith("data:image")
                          ? "Image"
                          : item.wordData || "No definition available"}
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
