"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { timeAgo } from "@utils/HelperFunctions";
import { Zap, MoreHorizontal } from "lucide-react";
import StatsBar from "@app/(content)/[type]/StatsBar";

/**
 * Helper to render post text with clickable hashtags (Threads/Facebook style)
 */
function renderContent(text) {
  if (!text) return null;

  // Split by whitespace to process tokens
  const tokens = text.split(/(\s+)/);

  return tokens.map((token, i) => {
    if (token.startsWith("#") && token.length > 1) {
      const tagName = token.slice(1).replace(/[.,!?;:]+$/, ""); // Trim punctuation
      const trailingPunc = token.slice(tagName.length + 1);

      return (
        <span key={i}>
          <Link
            href={`/tags/${tagName.toLowerCase()}`}
            className="text-primary font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            #{tagName}
          </Link>
          {trailingPunc}
        </span>
      );
    }
    return token;
  });
}

// PostMenu is downloaded only when the user first clicks ⋯
const PostMenu = dynamic(() => import("@components/PostMenu"), { ssr: false });

// Lazy load QuickSpinModal — only needed for poll posts
const QuickSpinModal = dynamic(() => import("@components/QuickSpinModal"), {
  ssr: false,
});

// Lazy load DilemmaViewer — only needed when post has a poll
const DilemmaViewer = dynamic(() => import("@components/DilemmaViewer"), {
  ssr: false,
});

// Lazy load UniversalCommentsSection — proactive & shared component
const UniversalCommentsSection = dynamic(() => import("@components/UniversalCommentsSection"), {
  ssr: false,
});

/**
 * PostCard — renders a single post from the feed
 * Handles both statement posts and polls
 */
export default function PostCard({ post, defaultOpenComments = false, currentContextId = null }) {
  const router = useRouter();
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const [showComments, setShowComments] = useState(defaultOpenComments);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [showSpinModal, setShowSpinModal] = useState(false);

  // Top-right post menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Preferred Name: Use authorName for display.
  // authorHandle is reserved for the unique URL slug/handle.
  const displayName = post.authorName || "Someone";

  const postId = String(post._id || post.id);

  // Multi-tier ownership check:
  // 1. Database ID match (robust - used for Posts)
  // 2. Author Name match (fallback - used for Wheels or legacy data)
  const isOwnPost =
    (session?.user?.id && post.userId && String(session.user.id) === String(post.userId)) ||
    (session?.user?.name && post.authorName && session.user.name === post.authorName);

  // If the post is hidden (deleted by owner or hidden by user), don't render it
  if (isHidden) return null;

  // Only display bottom tag pills for tags that are NOT already typed inline in the text.
  // This avoids duplicating tags in two places (in the text vs as separate pills).
  const visibleTags = (post.tags || []).filter((tag) => {
    if (!post.content) return true;
    const lowerContent = post.content.toLowerCase();
    const formattedTag = `#${tag.toLowerCase()}`;
    return !lowerContent.includes(formattedTag);
  });

  return (
    <article className="border-b border-border/40 bg-background/50 py-4 sm:border sm:rounded-2xl sm:px-5 sm:py-6 transition-colors hover:bg-muted/[0.03]">
      {/* Header: Author + Time */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <Link
              href={`/u/${encodeURIComponent((post.authorHandle || post.authorName || "someone").toLowerCase())}`}
              className="font-bold text-foreground hover:underline transition text-sm flex items-center gap-1"
            >
              <span>{displayName}</span>
              {isOwnPost && !post.isPublic && (
                <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0 rounded-full font-bold ml-1 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                   Private
                </span>
              )}
            </Link>
            <p className="text-[10px] font-semibold text-muted-foreground/60">
              {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Top-right actions */}
        <div className="flex items-center gap-1">
          {/* Spin to Decide — only shown for poll posts */}
          {post.hasPoll && post.pollOptions?.length > 0 && (
            <button
              onClick={() => setShowSpinModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-tighter rounded-md border border-border/80 bg-muted/30 text-foreground hover:bg-muted transition"
            >
              <Zap size={11} /> Decide
            </button>
          )}

          {/* ⋯ Post menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition"
              aria-label="Post options"
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-[80]" onClick={() => setMenuOpen(false)} />

                {/* Dropdown — chunk downloaded on first open */}
                <PostMenu
                  postId={postId}
                  isOwnPost={isOwnPost}
                  isLoggedIn={!!session}
                  onHide={() => setIsHidden(true)}
                  onClose={() => setMenuOpen(false)}
                  openLoginPrompt={openLoginPrompt}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Post Text content (Threads/Facebook style) */}
      <div className="mb-2.5 px-4 sm:px-0">
        <p className={`text-[13px] leading-relaxed text-foreground whitespace-pre-wrap ${post.hasTruncation && !isExpanded ? "line-clamp-4" : ""}`}>
          {renderContent(post.content)}
        </p>
        
        {post.hasTruncation && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-primary text-[10px] font-black uppercase tracking-tighter hover:underline mt-1 inline-block"
          >
            ...more
          </button>
        )}
      </div>

      {/* Image Uploaded to Post */}
      {post.image && (
        <div className="mb-3 w-full sm:mx-0 sm:rounded-xl overflow-hidden bg-muted/20 border-y sm:border border-border/40">
          <img
            src={post.image}
            alt="Post attachment"
            className="w-full object-cover max-h-[400px] sm:max-h-[500px]"
            loading="lazy"
          />
        </div>
      )}

      {/* Content Ref (if linked to anime/movie/game/wheel/list) */}
      {post.contentRef && String(post.contentRef.externalId) !== String(currentContextId) && (
        <div className="px-4 sm:px-0 mb-4">
          <Link
            href={
              post.contentRef.type === "wheel"
                ? `/embed/${post.contentRef.externalId}`
                : post.contentRef.type === "list"
                ? `/lists/${post.contentRef.externalId}`
                : `/${post.contentRef.type}/${post.contentRef.slug || encodeURIComponent(post.contentRef.externalId)}`
            }
            className="block"
          >
            <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex flex-col sm:flex-row gap-0">
                {post.contentRef.image && (
                  <div className="relative flex-shrink-0 w-full sm:w-28 h-40 sm:h-32 bg-muted overflow-hidden rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl">
                    <Image
                      src={post.contentRef.image}
                      alt={post.contentRef.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 112px"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-primary/15 text-primary">
                      {post.contentRef.type}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm line-clamp-2">
                    {post.contentRef.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {post.contentRef.type === "wheel" ? "Spin to decide" : "See details"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* OG Link Preview Card */}
      {!post.image && !post.hasPoll && !post.contentRef && post.ogMeta && (
        <div className="px-4 sm:px-0 mb-4">
          <Link 
            href={post.ogMeta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row group rounded-2xl border border-border/80 bg-muted/20 overflow-hidden transition-all hover:bg-muted/40 hover:border-primary/20 no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            {post.ogMeta.image && (
              <div className="relative w-full sm:w-1/3 aspect-video sm:aspect-square bg-muted flex-shrink-0">
                <img 
                  src={post.ogMeta.image} 
                  alt={post.ogMeta.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-3 sm:p-4 flex flex-col justify-center min-w-0">
              <h4 className="font-bold text-[14px] sm:text-[15px] text-foreground leading-tight line-clamp-2 transition-colors group-hover:text-primary">
                {post.ogMeta.title}
              </h4>
              {post.ogMeta.description && (
                <p className="text-[12px] sm:text-[13px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                  {post.ogMeta.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground/80 uppercase tracking-wider font-bold">
                <span className="truncate">{new URL(post.ogMeta.url).hostname.replace('www.', '')}</span>
                <span className="opacity-40">/</span>
                <span className="text-primary italic">External Link</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Dilemma Viewer (for polls) */}
      {post.hasPoll && post.pollOptions?.length > 0 && (
        <div className="mb-5 pt-4 border-t border-border/70 px-4 sm:px-0">
          <DilemmaViewer post={post} postId={post._id || post.id} />
        </div>
      )}

      {/* Tags */}
      {/* 
        Discovery Optimized: Only show tag pills for tags that are NOT already present in the text body.
        This provides categorization without redundancy.
      */}
      {visibleTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 px-4 sm:px-0">
          {visibleTags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-border/40"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Footer: Engagement bit */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-3 px-4 sm:px-0">
        <StatsBar
          entityType="post"
          entityId={post._id || post.id}
          session={session}
          show={{ like: true, share: true, save: false, follow: false, comment: true }}
          shareUrl={`/post/${post._id || post.id}`}
          commentCount={commentCount}
          onCommentClick={() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            if (isMobile) {
              window.dispatchEvent(new CustomEvent("comments:open-drawer", {
                detail: { entityId: String(postId) }
              }));
              return;
            }
            setShowComments((prev) => !prev);
          }}
          initialStats={{
            // Pre-populate from the denormalized counters already on the post doc.
            // This avoids a countDocuments() DB hit per post card on the feed.
            // StatsBar will only make a lightweight Reaction.findOne() call
            // to resolve the logged-in user's own reaction state.
            reactions: { like: post.likeCount || 0 },
            reactedByUser: { like: null }, // null = "not yet checked"
          }}
        />
      </div>

      {/* Universal Comments Section — togglable in feed, proactive in single view */}
      <UniversalCommentsSection
        entityType="post"
        entityId={postId}
        visible={showComments}
        showTitle={false}
        onCountChange={setCommentCount}
        className=""
        isInFeed={!defaultOpenComments}
      />

      {/* Quick Spin Modal — lazy, only mounts when user taps Spin to Decide */}
      {showSpinModal && (
        <QuickSpinModal
          options={post.pollOptions}
          title={post.title}
          onClose={() => setShowSpinModal(false)}
        />
      )}
    </article>
  );
}
