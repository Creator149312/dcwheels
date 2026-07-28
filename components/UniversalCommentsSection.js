"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { X, MessageSquare, ListFilter } from "lucide-react";

const CommentsPanel = dynamic(() => import("./comments/CommentsPanel"), { ssr: false });

export default function UniversalCommentsSection({ 
  entityId, 
  entityType = "wheel", 
  visible = true, 
  showTitle = true,
  onCountChange,
  className = "px-1 md:px-4",
  isInFeed = false
}) {
  const openLoginPrompt = useLoginPrompt();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [localCount, setLocalCount] = useState(0);

  // Auto-open if query param is present (Mobile Feed Redirect flow)
  useEffect(() => {
    if (searchParams.get("openComments") === "true") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Handle global triggers (e.g. from a StatsBar elsewhere on the page)
  useEffect(() => {
    const handleTrigger = (event) => {
      if (event.detail?.entityId === entityId) {
        setIsDrawerOpen(true);
        // Autofocus the form after a small delay for the drawer animation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("comment-form:focus"));
        }, 300);
      }
    };
    window.addEventListener("comments:open-drawer", handleTrigger);
    return () => window.removeEventListener("comments:open-drawer", handleTrigger);
  }, [entityId]);

  // Initial count fetch
  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/comments/count?entityType=${entityType}&entityId=${entityId}`)
      .then(res => res.json())
      .then(data => {
        setLocalCount(data.count || 0);
      })
      .catch(err => console.error("Failed to fetch comment count:", err));
  }, [entityId, entityType]);

  // Sync with global count if provided
  const handleCountUpdate = (updater) => {
    const nextValue = typeof updater === "function" ? updater(localCount) : updater;
    setLocalCount(nextValue);
    onCountChange?.(updater);
  };

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);
  
  return (
    <div id="comments-section" className={`
      w-full text-left sm:pt-1 pb-1 border-t border-border/10 bg-muted/5 
      ${visible || isDrawerOpen ? "" : "hidden"}
      ${isInFeed ? 'mt-1 sm:mt-2 sm:rounded-xl bg-muted/20 border border-border/20' : ''}
    `}>
      {/* Mobile Fake Input Trigger (Only shown on detail pages, not in feed) */}
      {!isDrawerOpen && !isInFeed && (
        <div 
          onClick={() => {
            setIsDrawerOpen(true);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("comment-form:focus"));
            }, 300);
          }}
          className="md:hidden flex items-center gap-3 px-4 py-2 cursor-pointer active:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted border border-border/40 overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                 {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "?"}
               </div>
            )}
          </div>
          <div className="flex-1 bg-muted/30 rounded-full px-4 py-1.5 border border-border/40 text-muted-foreground text-[13px]">
            {localCount > 0 ? `View all ${localCount} comments...` : "Add a comment..."}
          </div>
        </div>
      )}

      {/* Desktop View & Mobile Drawer Overlay */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-[100] bg-background md:relative md:inset-auto md:z-auto md:bg-transparent
        transition-transform duration-300 ease-in-out
        h-[70vh] md:h-auto rounded-t-3xl md:rounded-none
        border-t border-border/20 md:border-none
        shadow-[0_-5px_25px_rgba(0,0,0,0.15)] md:shadow-none
        flex flex-col
        ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        {/* Mobile Drag Handle */}
        <div className="md:hidden flex justify-center pt-2.5 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header - Ultra Minimal */}
        <div className={`flex items-center gap-4 py-1.5 md:py-2.5 ${className} shrink-0`}>
           <h3 className="text-[14px] md:text-[15px] font-black text-foreground uppercase tracking-tight">
            {localCount.toLocaleString()} {localCount === 1 ? 'Comment' : 'Comments'}
          </h3>

           <div className="flex-1"></div>

           <button 
             onClick={() => setIsDrawerOpen(false)}
             className="md:hidden p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
           >
             <X size={18} />
           </button>
        </div>

        {/* Form & List Area */}
        <div className={`
          overflow-y-auto flex-1 ${className} pb-10 md:pb-4
          md:max-h-[500px] md:overflow-y-auto
        `}>
          <CommentsPanel
            entityType={entityType}
            entityId={entityId}
            isLoggedIn={!!session}
            openLoginPrompt={openLoginPrompt}
            currentUser={session?.user}
            visible={visible || isDrawerOpen} 
            onCountChange={handleCountUpdate}
          />
        </div>
      </div>

      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90] md:hidden cursor-pointer animate-in fade-in duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
}

