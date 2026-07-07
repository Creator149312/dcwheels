"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import UnifiedListCreationModal from "./UnifiedListCreationModal";
import { Button } from "@components/ui/button";
import EmptyState from "@components/EmptyState";
import { BookMarked } from "lucide-react";

export default function ListDashboardPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session, status } = useSession();

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
      if (status === "authenticated" && session?.user?.username) {
        window.location.href = `/u/${session.user.username}`;
      } else {
        location.reload();
      }
    } else {
      console.log("Unexpected Error Occurred!");
    }
  };

  useEffect(() => {
    // Wait for session resolution; skip the API call entirely for guests so
    // the route doesn't 401 on /lists/dashboard.
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLists([]);
      setLoading(false);
      return;
    }

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
  }, [status]);

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading your lists…
      </div>
    );
  }

  if (!lists || lists.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={BookMarked}
          title="No lists yet"
          description="Create a list to collect ideas, options, or anything you want to spin into a decision."
          action={
            <Button size="lg" onClick={handleNewListClick}>
              Create your first list
            </Button>
          }
        />
        <UnifiedListCreationModal
          isOpen={isModalOpen}
          closeModal={handleModalClose}
          addNewList={addNewList}
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">
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
              className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors block"
            >
              {/* Cover */}
              <div className="h-32 bg-muted flex items-center justify-center">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={list.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground text-3xl font-bold">
                    {list.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg truncate text-foreground">
                  {list.name}
                </h3>
                <p className="text-sm text-muted-foreground">
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
