"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import UnifiedListCreationModal from "./UnifiedListCreationModal";
import { Button } from "@components/ui/button";

export default function ListDashboardPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNewListClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const addNewList = async (listData) => {
    const res = await fetch("/api/unifiedlist", {
      method: "POST",
      body: JSON.stringify(listData),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (data.error) {
      console.log(data.error);
    } else if (data.list) {
      console.log("List created successfully");
      location.reload();
    } else {
      console.log("Unexpected Error Occurred!");
    }
  };

  useEffect(() => {
    async function fetchLists() {
      try {
        setLoading(true);

        const res = await fetch("/api/unifiedlist", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok && data.lists) {
          setLists(data.lists);
        } else {
          setLists([]);
        }
      } catch (err) {
        console.error("Failed to fetch lists:", err);
        setLists([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLists();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Loading your lists…
      </div>
    );
  }

  if (!lists || lists.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        You don’t have any lists yet.
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Your Lists
        </h2>
        <Button size={"lg"} variant={"default"} onClick={handleNewListClick}>
          Create List +
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {lists.map((list) => {
          const firstItem = list.items?.[0];

          // ✅ Determine cover image:
          // - If entity → use image
          // - If word → no image → fallback
          const coverImage =
            firstItem?.type === "entity" && firstItem?.image
              ? firstItem.image
              : null;

          return (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition block"
            >
              {/* Cover */}
              <div className="h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={list.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-3xl font-bold">
                    {list.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg truncate text-gray-900 dark:text-gray-100">
                  {list.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {list.items.length} items
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      <UnifiedListCreationModal
        isOpen={isModalOpen}
        closeModal={handleModalClose}
        addNewList={addNewList}
      />
    </div>
  );
}
