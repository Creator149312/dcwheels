import Link from "next/link";
import { ChevronRight, Flame, MessageSquare, ListChecks, Disc } from "lucide-react";
import TopicFeedCard from "@components/feed/TopicFeedCard";
import WheelCard from "@components/search/WheelCard";
import SearchEmptyState from "@components/search/SearchEmptyState";
import InfiniteSearchFeed from "@components/search/InfiniteSearchFeed";
import {
  searchPosts,
  searchLists,
  searchTopicHubs,
  searchWheelsDirect,
} from "./fetchSearchFeed";

function buildTabHref(titlesearch, type) {
  const qs = new URLSearchParams();
  if (type && type !== "top") qs.set("type", type);
  const str = qs.toString();
  return `/search/${titlesearch}${str ? `?${str}` : ""}`;
}

export async function TopSearchSection({ searchtitle, titlesearch }) {
  const [topicHubs, postsRes, listsRes, wheelsRes] = await Promise.all([
    searchTopicHubs(searchtitle, { limit: 2 }),
    searchPosts(searchtitle, { limit: 6 }),
    searchLists(searchtitle, { limit: 3 }),
    searchWheelsDirect(searchtitle, { limit: 6 }),
  ]);

  const posts = postsRes.posts || [];
  const lists = listsRes.lists || [];
  const wheels = wheelsRes.wheels || [];

  const hasAny =
    topicHubs.length > 0 ||
    posts.length > 0 ||
    lists.length > 0 ||
    wheels.length > 0;

  if (!hasAny) {
    return (
      <div className="space-y-6">
        <SearchEmptyState query={searchtitle} label="community results" />
        <div className="max-w-lg mx-auto text-center pb-8">
          <p className="text-xs font-semibold text-muted-foreground mb-3">
            Want to search external Anime, Movies, Games, or Characters catalogs?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "topics", label: "All Topics" },
              { id: "anime", label: "Anime" },
              { id: "movie", label: "Movies" },
              { id: "game", label: "Games" },
              { id: "character", label: "Characters" },
            ].map((t) => (
              <Link
                key={t.id}
                href={buildTabHref(titlesearch, t.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Interleave initial Posts and Lists in a Threads-style vertical stream
  const initialFeedItems = [];
  let listIdx = 0;
  posts.forEach((post, idx) => {
    initialFeedItems.push({ kind: "post", data: post });
    if ((idx + 1) % 3 === 0 && listIdx < lists.length) {
      initialFeedItems.push({ kind: "list", data: lists[listIdx++] });
    }
  });
  while (listIdx < lists.length) {
    initialFeedItems.push({ kind: "list", data: lists[listIdx++] });
  }

  const initialHasMore = Boolean(postsRes.hasMore || listsRes.hasMore);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 1. Official Topic Hub Spotlights */}
      {topicHubs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" /> Featured Topic Hubs
            </h2>
          </div>
          <div className="space-y-4">
            {topicHubs.map((hub) => (
              <TopicFeedCard key={hub._id} topic={hub} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Matching Spin Wheels Strip */}
      {wheels.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-amber-500" /> Interactive Wheels
            </h2>
            {wheelsRes.hasMore && (
              <Link
                href={buildTabHref(titlesearch, "wheels")}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                View all wheels <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wheels.slice(0, 4).map((wheel) => (
              <WheelCard key={wheel._id} item={wheel} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Threads-style Unified Infinite Stream (Posts + Lists) */}
      {initialFeedItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Community Discussions & Lists
            </h2>
          </div>

          <InfiniteSearchFeed
            initialItems={initialFeedItems}
            initialHasMore={initialHasMore}
            searchtitle={searchtitle}
            type="top"
          />
        </section>
      )}
    </div>
  );
}

export async function ListsSearchSection({ searchtitle }) {
  const { lists, hasMore } = await searchLists(searchtitle, { limit: 12 });

  if (!lists || lists.length === 0) {
    return <SearchEmptyState query={searchtitle} label="lists" />;
  }

  const initialItems = lists.map((l) => ({ kind: "list", data: l }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <InfiniteSearchFeed
        initialItems={initialItems}
        initialHasMore={hasMore}
        searchtitle={searchtitle}
        type="lists"
      />
    </div>
  );
}

export async function WheelsSearchSection({ searchtitle }) {
  const { wheels, hasMore } = await searchWheelsDirect(searchtitle, { limit: 8 });

  if (!wheels || wheels.length === 0) {
    return <SearchEmptyState query={searchtitle} label="wheels" />;
  }

  const initialItems = wheels.map((w) => ({ kind: "wheel", data: w }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <InfiniteSearchFeed
        initialItems={initialItems}
        initialHasMore={hasMore}
        searchtitle={searchtitle}
        type="wheels"
      />
    </div>
  );
}

export async function TopicsSearchSection({ searchtitle, type = "all", label = "topics" }) {
  const { topics, hasMore } = await searchTopicHubs(searchtitle, {
    limit: 8,
    type,
  });

  if (!topics || topics.length === 0) {
    return <SearchEmptyState query={searchtitle} label={label} />;
  }

  const initialItems = topics.map((t) => ({ kind: "topic", data: t }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <InfiniteSearchFeed
        initialItems={initialItems}
        initialHasMore={hasMore}
        searchtitle={searchtitle}
        type={type === "all" ? "topics" : type}
      />
    </div>
  );
}
