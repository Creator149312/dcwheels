"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Layers, GitFork } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { getListUrl } from "@utils/UrlHandler";
import { timeAgo } from "@utils/HelperFunctions";
import ReactionButton from "@components/ReactionButton";
import SharePopup from "@components/SharePopup";

function getItemImage(item) {
  if (!item) return null;
  if (item.image) return item.image;
  if (item.wordData && item.wordData.startsWith("http")) return item.wordData;
  return null;
}

function getItemTitle(item) {
  if (!item) return "";
  if (item.type === "entity") return item.name || "";
  return item.word || "";
}

function ListPostCard({ list }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const router = useRouter();
  const url = getListUrl(list);
  const items = list.items || [];
  const previewItems = items.slice(0, 3);
  const hasImages = previewItems.some((item) => getItemImage(item));
  const authorName = list.authorName || "Someone";
  const itemCount = list.itemCount ?? items.length ?? 0;
  const remainingCount = itemCount > 3 ? itemCount - 3 : 0;

  const handleFixList = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      openLoginPrompt?.("Sign in to remix and customize this list");
      return;
    }

    try {
      const LS_DRAFT_KEY = "SpinpapaListDraft";
      const ts = Date.now();
      const draft = {
        name: `${list.name || "List"} (Remix)`,
        description: list.description || "",
        format: list.format || "standard",
        tierConfig: list.tierConfig,
        isPublic: true,
        items: items.map((it, idx) => ({
          draftId: `remix-${ts}-${idx}`,
          type: it.type || (it.entityId ? "entity" : "word"),
          word: it.word || it.name,
          wordData: it.wordData || it.image,
          entityType: it.entityType,
          entityId: it.entityId,
          name: it.name || it.word,
          slug: it.slug,
          image: it.image || it.wordData,
          tier: it.tier || null,
        })),
        forkedFrom: {
          listId: String(list.id || list._id),
          name: list.name,
          username: authorName,
        },
        updatedAt: ts,
      };
      localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draft));
      router.push("/lists/create");
    } catch (err) {
      console.error("Failed to fork list:", err);
      router.push(url);
    }
  };

  return (
    <article className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs py-4 transition-all duration-200 hover:bg-card hover:shadow-xs dark:hover:bg-muted/30 sm:mb-0 sm:rounded-2xl sm:border sm:border-border/60 sm:px-5 sm:py-5">
      {/* Header: Author + Time */}
      <div className="mb-3 flex items-center justify-between gap-2 px-4 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-tr from-primary/10 to-primary/5 text-xs font-bold text-primary">
              {authorName.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}
                className="truncate font-bold text-foreground hover:underline"
              >
                @{authorName}
              </Link>
              <span className="text-xs text-muted-foreground/40">•</span>
              <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground/60">
                {timeAgo(list.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="mb-3 px-4 sm:px-0">
        <Link href={url} className="group/title flex items-start gap-2">
          <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <Layers className="h-3 w-3" />
          </span>
          <h3 className="text-lg font-black leading-tight text-foreground group-hover/title:text-primary sm:text-xl line-clamp-2">
            {list.name || list.title || "Untitled List"}
          </h3>
        </Link>
      </div>

      {/* Horizontal stacked image collage from first 4 items */}
      {hasImages && (
        <Link href={url} className="group/collage block px-4 sm:px-0 mb-4">
          <div className="relative aspect-[16/9] w-full max-h-[320px] overflow-hidden rounded-2xl border border-border/40 bg-muted">
            <div className="flex h-full w-full">
              {previewItems.map((item, idx) => {
                const image = getItemImage(item);
                const title = getItemTitle(item);
                const isFirst = idx === 0;
                const overlap = isFirst ? "" : "ml-[-12%]";
                const total = previewItems.length;
                const widthPct = total === 1 ? 100 : total === 2 ? 56 : total === 3 ? 44 : 36;
                const rounded = idx === previewItems.length - 1 ? "rounded-r-2xl" : "";
                return (
                  <div
                    key={item._id || idx}
                    className={`relative h-full flex-shrink-0 overflow-hidden bg-muted ${overlap}`}
                    style={{ zIndex: total - idx, width: `${widthPct}%` }}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={title}
                        className={`h-full w-full object-cover transition-transform duration-300 group-hover/collage:scale-[1.02] ${rounded}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20 p-3 ${rounded}`}>
                        <span className="text-center text-xs font-bold uppercase leading-tight text-foreground/50 line-clamp-3">
                          {title}
                        </span>
                      </div>
                    )}
                    {/* Left edge fade so cards overlap cleanly */}
                    {!isFirst && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/80 to-transparent" />
                    )}
                  </div>
                );
              })}
            </div>
            {/* List badge & remaining count pill */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <Layers className="h-3 w-3" />
              <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
              {remainingCount > 0 && (
                <span className="text-white/70 font-semibold border-l border-white/20 pl-1.5">
                  +{remainingCount} more
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Footer: Engagement actions & Fix This List CTA */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <ReactionButton
            entityType="list"
            entityId={list.id || list._id}
            reactionType="like"
            initialCount={list.likeCount || 0}
            reactedByCurrentUser={false}
            isLoggedIn={!!session}
            openLoginPrompt={openLoginPrompt}
          />

          <SharePopup variant="buttoned" url={url} />

          <Link
            href={url}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium leading-none text-foreground shadow-sm transition hover:bg-accent md:h-9"
          >
            <MessageCircle size={15} />
            <span className="text-sm md:hidden">{list.commentCount || 0}</span>
            <span className="hidden md:inline">
              {list.commentCount > 0 ? `${list.commentCount} Comments` : "Comment"}
            </span>
          </Link>
        </div>

        {/* Primary Viral Trigger: Remix this list */}
        <button
          onClick={handleFixList}
          className="flex h-8 items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1 text-xs font-bold transition-all active:scale-95 md:h-9 md:text-sm"
          title="Remix and customize your own ranking"
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Remix this List</span>
        </button>
      </div>
    </article>
  );
}

export default memo(ListPostCard);
