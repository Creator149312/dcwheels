"use client";

import Image from "next/image";
import Link from "next/link";
import TagSpaceClient from "@components/TagSpaceClient";
import CreatePostTeaser from "@components/CreatePostTeaser";

// Consistent section header: blue accent bar + title + optional action.
function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" aria-hidden="true" />
        {title}
      </h2>
      {action}
    </div>
  );
}

function getCompareHref(type, title, coverUrl, slug) {
  const e = encodeURIComponent;
  const params = new URLSearchParams({ type, a: title });
  if (coverUrl) params.set("aPoster", coverUrl);
  if (slug)     params.set("aSlug", slug);
  return `/vs?${params.toString()}`;
}

export default function TopicInteractionTabs({
  type,
  pageId,
  contentId,
  contentSlug,
  contentTitle = "",
  contentCover = null,
  contentTags = [],
  taggedWheels = [],
  animeCharacters = [],
  initialFeedItems = [],
  initialFeedCursor = null,
}) {
  return (
    <div className="space-y-12">

      {/* ── 1. Anime Characters ────────────────────────────────────────── */}
      {type === "anime" && animeCharacters.length > 0 && (
        <section>
          <SectionHeader title="👥 Characters" />
          <div
            className="flex overflow-x-auto gap-3 pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {animeCharacters.map((character) => (
              <a
                key={character.id}
                href={`/character/${character.id}`}
                className="group flex-shrink-0 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="relative w-24 h-32 bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={character.image.large}
                    alt={character.name.full}
                    fill
                    sizes="96px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs font-medium text-center text-muted-foreground line-clamp-2 w-24 group-hover:text-primary transition-colors">
                  {character.name.full}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── 2. Unified Community Feed ────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Community Feed" />
        
        {/* Context-Aware Composer */}
        <CreatePostTeaser defaultTag={contentSlug} className="mb-6" />

        {/* TagSpaceClient wraps Wheels and Posts with filtering for this exact Slug! */}
        <TagSpaceClient 
          tagId={contentSlug} 
          initialItems={initialFeedItems} 
          initialNextCursor={initialFeedCursor} 
        />
      </section>

    </div>
  );
}
