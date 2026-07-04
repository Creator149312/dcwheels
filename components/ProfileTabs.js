"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Edit, Lock, Disc3, BookMarked, Layers, MessageSquare, Plus } from "lucide-react";
import RemoveListBtn from "./RemoveListBtn";
import CreatePostTeaser from "./CreatePostTeaser";
import { DecisionTimeline } from "./DecisionTimeline";
import InfiniteFeedStream from "./feed/InfiniteFeedStream";
import WheelFeedCard from "./WheelFeedCard";

export default function ProfileTabs({ 
  userId, 
  isOwner, 
  wheels = [], 
  wheelsCursor = null,
  lists = [], 
  posts = [], 
  postsCursor = null,
  stories = [] 
}) {
  const [activeTab, setActiveTab] = useState("posts");

  const publicLists = lists.filter(l => l.isPublic);

  const tabList = [
    { id: "posts", label: "Posts", icon: <MessageSquare size={16} /> },
    { id: "wheels", label: "Wheels", icon: <Layers size={16} /> },
    { id: "lists", label: "Lists", icon: <BookMarked size={16} /> },
    { id: "decisions", label: "Decisions", icon: <Disc3 size={16} /> },
  ];

  return (
    <div className="mt-6">
      {/* ── Tab Bar Navigation ──────────────────────── */}
      <div className="flex justify-between sm:justify-start sm:gap-2 border-b border-border mb-6 w-full">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 border-b-2 text-xs sm:text-sm font-bold transition whitespace-nowrap -mb-px ${
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
        {activeTab === "posts" && (
          <div className="space-y-4">
            {isOwner && <CreatePostTeaser className="mb-6" />}
            <InfiniteFeedStream 
              userId={userId} 
              docType="post" 
              initialItems={posts} 
              initialNextCursor={postsCursor}
            />
          </div>
        )}

        {activeTab === "wheels" && (
          <div className="space-y-4">
            {isOwner && (
              <Link href="/wheels/create" className="group flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary mb-2">
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
            
            {(isOwner ? lists : publicLists).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No lists on display yet</p>
            ) : (
              (isOwner ? lists : publicLists).map((list) => (
                <div key={list.id} className="relative group p-4 sm:p-5 border border-border rounded-2xl bg-card hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/lists/${list.id}`} className="font-bold text-foreground text-base sm:text-lg hover:text-primary transition line-clamp-1">
                        {list.name}
                      </Link>
                      {isOwner && !list.isPublic && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-850/50">
                          <Lock size={11} />
                          Private
                        </span>
                      )}
                    </div>
                    {list.description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{list.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/80 mt-1">
                      <span className="font-semibold text-foreground">{list.itemCount} items saved</span>
                      <span>•</span>
                      <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link href={`/lists/${list.id}`} className="p-2 border border-border rounded-xl text-muted-foreground hover:text-primary transition" title="View List">
                      <Eye size={18} />
                    </Link>
                    {isOwner && !list.isSystem && (
                      <>
                        <Link href={`/lists/${list.id}`} className="p-2 border border-border rounded-xl text-muted-foreground hover:text-danger transition flex items-center gap-1 text-xs font-semibold" title="Edit List Settings">
                          <Edit size={16} /> Edit
                        </Link>
                        <RemoveListBtn id={list.id} type="unifiedlist" />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "decisions" && (
          <div className="space-y-4">
            <DecisionTimeline decisions={stories} isOwner={isOwner} />
          </div>
        )}
      </div>
    </div>
  );
}