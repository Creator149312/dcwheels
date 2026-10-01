"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, BookMarked, Disc3, MessageSquare, Plus } from "lucide-react";
import { getListUrl } from "@utils/UrlHandler";
import ListMenu from "./ListMenu";
import CreatePostTeaser from "./CreatePostTeaser";
import InfiniteFeedStream from "./feed/InfiniteFeedStream";
import WheelFeedCard from "./WheelFeedCard";

export default function ProfileTabs({ 
  userId, 
  username,
  isOwner, 
  wheels = [], 
  wheelsCursor = null,
  lists = [], 
  posts = [], 
  postsCursor = null
}) {
  const [activeTab, setActiveTab] = useState("posts");
  // Track which tabs have been visited so feeds mount lazily — only the
  // active tab's feed fetches/renders; switching tabs mounts on first visit
  // and stays mounted afterward to preserve scroll position and state.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["posts"]));

  const switchTab = (id) => {
    setActiveTab(id);
    setVisitedTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  // Filter out system lists (like 'Saved') from the display
  const filteredLists = lists.filter(l => !l.isSystem && l.systemKey !== "SYS_SAVED");
  const publicListsFiltered = filteredLists.filter(l => l.isPublic);

  const tabList = [
    { id: "posts", label: "Posts", icon: <MessageSquare size={16} /> },
    { id: "lists", label: "Lists", icon: <BookMarked size={16} /> },
    { id: "wheels", label: "Wheels", icon: <Disc3 size={16} /> },
  ];

  return (
    <div className="mt-6">
      {/* ── Tab Bar Navigation ──────────────────────── */}
      <div className="grid grid-cols-3 border-b border-border mb-6 w-full">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`w-full flex items-center justify-center gap-2 py-3 border-b-2 text-sm font-semibold tracking-wide transition whitespace-nowrap -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Feed tabs stay mounted once visited so loaded pages aren't refetched on return */}
        {visitedTabs.has("posts") && (
          <div className={activeTab === "posts" ? undefined : "hidden"}>
            {isOwner && <CreatePostTeaser className="mb-6 mx-4 sm:mx-0" />}
            <InfiniteFeedStream
              userId={userId}
              docType="post"
              initialItems={posts}
              initialNextCursor={postsCursor}
            />
          </div>
        )}

        {visitedTabs.has("wheels") && (
          <div className={activeTab === "wheels" ? undefined : "hidden"}>
            {isOwner && (
              <Link href="/wheels/create" className="group flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary mb-2 mx-4 sm:mx-0">
                <Plus size={18} />
                <span className="font-bold text-sm">Create New Wheel</span>
              </Link>
            )}

            <InfiniteFeedStream
              userId={userId}
              docType="wheel"
              initialItems={wheels}
              initialNextCursor={wheelsCursor}
            />
          </div>
        )}

        {activeTab === "lists" && (
          <div className="space-y-3">
            {isOwner && (
              <Link href="/lists/create" className="group flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 mb-2">
                <Plus size={18} />
                <span className="font-bold text-sm">Create New List</span>
              </Link>
            )}
            
            {(isOwner ? filteredLists : publicListsFiltered).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No lists on display yet</p>
            ) : (
              (isOwner ? filteredLists : publicListsFiltered).map((list) => {
                const listUrl = getListUrl(list);
                return (
                  <div
                    key={list.id}
                    className="relative group p-4 sm:p-5 border border-border rounded-2xl bg-card hover:border-border/80 hover:shadow-xs transition-all flex items-start justify-between gap-3 sm:gap-4"
                  >
                    <Link href={listUrl} className="space-y-1.5 min-w-0 flex-1 block">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-base sm:text-lg group-hover:text-primary transition line-clamp-1">
                          {list.name}
                        </span>
                        {isOwner && !list.isPublic && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60 shrink-0">
                            <Lock size={10} />
                            Private
                          </span>
                        )}
                      </div>
                      {list.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {list.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 pt-0.5">
                        <span className="font-semibold text-foreground">{list.itemCount || 0} items</span>
                        <span>•</span>
                        <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </Link>

                    {isOwner && (
                      <div className="shrink-0 -mr-1">
                        <ListMenu list={list} isOwner={isOwner} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}