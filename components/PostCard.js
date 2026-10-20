"use client";

import { memo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { timeAgo } from "@utils/HelperFunctions";
import { getListUrl, getWheelUrl, getPostUrl } from "@utils/UrlHandler";
import { Zap, MoreHorizontal } from "lucide-react";
import StatsBar from "@app/(content)/[type]/StatsBar";
import ContentRefCard from "@components/ContentRefCard";
import DilemmaViewer from "@components/DilemmaViewer";

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

// Lazy load UniversalCommentsSection — proactive & shared component
const UniversalCommentsSection = dynamic(() => import("@components/UniversalCommentsSection"), {
  ssr: false,
});

/**
 * PostCard — renders a single post from the feed
 * Handles both statement posts and polls
 */
function PostCard({ post, defaultOpenComments = false, currentContextId = null }) {
  const router = useRouter();
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const [showComments, setShowComments] = useState(defaultOpenComments);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [defendPrompt, setDefendPrompt] = useState(null);

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

  // Has an explicit Topic / ContentRef attached? (e.g. "GAME • Clash Royale")
  const hasEntityAnchor = Boolean(
    (post.entities && post.entities.length > 0) ||
    post.contentRef?.title ||
    post.contentRef?.slug ||
    post.contentRef?.id ||
    post.contentRef?.externalId
  );

  // Discovery Optimized Tag Chips:
  // 1. Filter out internal URL routing artifacts like "415-clash-royale" (digits followed by hyphen)
  // 2. Filter out tags already typed directly in the text body
  // 3. If an Entity Card is already present, do not clutter with auto-inherited category tags;
  //    only show chips if they were explicitly tagged by the user in the post content
  const visibleTags = (post.tags || []).filter((tag) => {
    if (!tag) return false;
    const lowerTag = String(tag).toLowerCase().trim();

    // Never display slug-like numeric prefixes e.g. "415-clash-royale"
    if (/^\d+[-_]/.test(lowerTag)) return false;

    // If an entity badge already anchors the post, avoid repeating topic/genre chips unless in text
    if (hasEntityAnchor) {
      return false;
    }

    if (!post.content) return true;
    const lowerContent = post.content.toLowerCase();
    const formattedTag = `#${lowerTag}`;
    return !lowerContent.includes(formattedTag);
  });

  return (
    <article className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs py-4 sm:border sm:border-border/60 sm:rounded-2xl sm:px-5 sm:py-6 transition-all duration-200 hover:bg-card hover:shadow-xs dark:hover:bg-muted/30 sm:mb-0">
      {/* Header: Author + Time */}
      <div className="flex items-center justify-between gap-2 mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href={`/u/${encodeURIComponent((post.authorHandle || post.authorName || "someone").toLowerCase())}`}
                className="font-bold text-foreground hover:underline transition truncate"
                title={displayName}
              >
                {displayName}
              </Link>
              <span className="text-xs text-muted-foreground/40">•</span>
              <Link
                href={getPostUrl(post)}
                className="text-xs font-semibold text-muted-foreground/60 hover:text-foreground hover:underline transition whitespace-nowrap"
                title="View post"
              >
                {timeAgo(post.createdAt)}
              </Link>
              {isOwnPost && !post.isPublic && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Spin to Decide — only shown for poll posts */}
          {post.hasPoll && post.pollOptions?.length > 0 && (
            <button
              onClick={() => setShowSpinModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold tracking-tight rounded-md border border-border/80 bg-muted/30 text-foreground hover:bg-muted transition"
            >
              <Zap size={12} /> Decide
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
        <p className={`text-[15px] sm:text-base leading-relaxed text-foreground whitespace-pre-wrap ${post.hasTruncation && !isExpanded ? "line-clamp-4" : ""}`}>
          {renderContent(post.content)}
        </p>

        {post.hasTruncation && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-primary text-xs font-black uppercase tracking-tighter hover:underline mt-1 inline-block"
          >
            ...more
          </button>
        )}
      </div>

      {/* Image Uploaded to Post */}
      {post.image && (
        <div className="mb-3 w-full sm:rounded-2xl overflow-hidden bg-muted/20 border-y sm:border border-border/40 flex items-center justify-center max-h-[640px]">
          <img
            src={post.imageVariants?.md || post.imageVariants?.sm || post.image}
            srcSet={
              post.imageVariants
                ? `${post.imageVariants.sm} 480w, ${post.imageVariants.md} 780w, ${post.imageVariants.lg} 1080w`
                : undefined
            }
            sizes="(max-width: 480px) 480px, (max-width: 780px) 780px, 1080px"
            alt="Post attachment"
            className="w-full h-auto max-h-[640px] object-cover sm:object-contain bg-black/5"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* Dilemma Viewer (for polls) */}
      {post.hasPoll && post.pollOptions?.length > 0 && (
        <div className="mb-5 px-4 sm:px-0">
          <DilemmaViewer
            post={post}
            postId={post._id || post.id}
            initialVotedOptionId={post.userVotedOptionId || null}
            onVoteSuccess={(optionText) => {
              setDefendPrompt(optionText || "your pick");
              setShowComments(true);
            }}
          />

          {/* Defend Your Take viral prompt */}
          {defendPrompt && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1">
              <span className="font-medium text-foreground">
                Voted for <span className="font-bold text-primary">&ldquo;{defendPrompt}&rdquo;</span>? Defend your take in the comments!
              </span>
              <button
                onClick={() => {
                  setShowComments(true);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("comment-form:focus"));
                  }, 150);
                }}
                className="shrink-0 font-bold text-primary hover:underline ml-2"
              >
                Comment &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content Ref (if linked to anime/movie/game/wheel/list) */}
      {(() => {
        const rawEntities = Array.isArray(post.entities) && post.entities.length > 0
          ? post.entities
          : (post.contentRef ? [post.contentRef] : []);

        const visibleEntities = currentContextId
          ? rawEntities.filter(
              (e) =>
                String(e.externalId) !== String(currentContextId) &&
                (!e.slug || String(e.slug) !== String(currentContextId))
            )
          : rawEntities;

        if (visibleEntities.length === 0) return null;

        const isMulti = visibleEntities.length > 1;

        return (
          <div className="px-4 sm:px-0 mb-4 flex flex-wrap items-center gap-1.5">
            {visibleEntities.map((entity, idx) => (
              <span
                key={`${entity.type}-${entity.externalId || entity.slug || idx}`}
                className="inline-flex items-center gap-1.5"
              >
                <ContentRefCard
                  href={
                    entity.type === "wheel"
                      ? getWheelUrl({ _id: entity.externalId, slug: entity.slug })
                      : entity.type === "list"
                        ? getListUrl({ id: entity.externalId, slug: entity.slug })
                        : `/${entity.type}/${entity.slug || encodeURIComponent(entity.externalId)}`
                  }
                  image={entity.image}
                  title={entity.title}
                  type={entity.type}
                  compact={isMulti}
                />
                {idx < visibleEntities.length - 1 && (
                  <span className="text-[11px] font-black uppercase text-muted-foreground/60 tracking-wider px-0.5">
                    vs
                  </span>
                )}
              </span>
            ))}
          </div>
        );
      })()}

      {/* OG Link Preview Card */}
      {!post.image && !post.hasPoll && !post.contentRef && (!post.entities || post.entities.length === 0) && post.ogMeta && (
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
              <h4 className="font-bold text-sm sm:text-base text-foreground leading-tight line-clamp-2 transition-colors group-hover:text-primary">
                {post.ogMeta.title}
              </h4>
              {post.ogMeta.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                  {post.ogMeta.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/80 uppercase tracking-wider font-bold">
                <span className="truncate">{new URL(post.ogMeta.url).hostname.replace('www.', '')}</span>
                <span className="opacity-40">/</span>
                <span className="text-primary italic">External Link</span>
              </div>
            </div>
          </Link>
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
              className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-border/40"
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
          shareUrl={`/posts/${post._id || post.id}`}
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
          }}          knownCounts={{
            like: post.likeCount || 0,
          }}          initialStats={{
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
        initialCount={post.commentCount || 0}
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

// Memo prevents unnecessary re-renders when InfiniteFeedStream's parent state
// changes (e.g., scroll/load-more). Ads are rendered outside this component,
// so they are unaffected. Internal hooks/state still work normally.
export default memo(PostCard);
