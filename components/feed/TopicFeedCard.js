"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import {
  Sparkles,
  Star,
  ThumbsUp,
  ArrowUpRight,
  Film,
  Tv,
  Gamepad2,
  User,
  Disc3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EntityTrackingProvider, useEntityTracking } from "@components/EntityTrackingProvider";
import TrackQuickButton from "@components/TrackQuickButton";
import AddToListButton from "@components/AddToListButton";

const QuickRateModal = dynamic(() => import("@components/QuickRateModal"), { ssr: false });

const DONE_LABELS = {
  movie: "Watched",
  tv: "Watched",
  anime: "Watched",
  game: "Played",
  character: "Favourite",
};

function InlineRateButton({ type, topicPageId, name }) {
  const { status: authStatus } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const ctx = useEntityTracking();
  const userRating = ctx?.userRating;
  const setUserRating = ctx?.setUserRating;
  const [openRate, setOpenRate] = useState(false);

  if (type === "character") return null;

  const handleClick = () => {
    if (authStatus === "unauthenticated") {
      openLoginPrompt?.("Log in to rate this title");
      return;
    }
    setOpenRate(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors active:scale-95 whitespace-nowrap ${
          userRating
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border bg-muted/40 text-foreground hover:bg-muted"
        }`}
        title={userRating ? `You rated ${userRating}/5` : "Rate this title"}
      >
        <Star
          size={13}
          className={
            userRating
              ? "text-amber-400 fill-amber-400"
              : "text-amber-500/80"
          }
        />
        <span>{userRating ? `${userRating}/5` : "Rate"}</span>
      </button>

      {openRate && (
        <QuickRateModal
          open={openRate}
          onOpenChange={setOpenRate}
          name={name}
          doneLabel={DONE_LABELS[type] || "Watched"}
          topicPageId={topicPageId}
          onRated={(score) => setUserRating?.(score)}
        />
      )}
    </>
  );
}

const TYPE_META = {
  anime: {
    label: "Anime Spotlight",
    badgeClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    accentBorder: "hover:border-indigo-500/40",
    Icon: Tv,
  },
  movie: {
    label: "Movie Spotlight",
    badgeClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    accentBorder: "hover:border-amber-500/40",
    Icon: Film,
  },
  game: {
    label: "Game Spotlight",
    badgeClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    accentBorder: "hover:border-emerald-500/40",
    Icon: Gamepad2,
  },
  character: {
    label: "Character Spotlight",
    badgeClass: "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
    accentBorder: "hover:border-fuchsia-500/40",
    Icon: User,
  },
};

function cleanDescription(text = "") {
  if (!text) return "";
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\[Written by [^\]]+\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function TopicFeedCard({ topic }) {
  const [expanded, setExpanded] = useState(false);
  const rawType = topic?.topicType || topic?.type;
  if (!topic || !topic.slug || !rawType) return null;

  const type = String(rawType).toLowerCase();
  const meta = TYPE_META[type] || TYPE_META.anime;
  const Icon = meta.Icon;
  const href = `/${type}/${topic.slug}`;
  const description = cleanDescription(topic.description);
  const isExpandable = description.length > 140;
  // IMPORTANT: TopicPage._id is the canonical entityId across UserEntityStatus, UnifiedList, and TopicPageVote
  const entityId = String(topic._id || topic.id || topic.relatedId || "");

  const avgScore =
    typeof topic.rating === "number" && topic.rating > 0
      ? topic.rating.toFixed(1)
      : typeof topic.stats?.avgScore === "number" && topic.stats.avgScore > 0
      ? topic.stats.avgScore.toFixed(1)
      : null;

  const worthItPct =
    typeof topic.worthItPct === "number" ? topic.worthItPct : null;
  const wheelsCount = Number(topic.wheelsCount || 0);
  const allGenreTags = Array.isArray(topic.tags)
    ? topic.tags.filter((t) => t && t.toLowerCase() !== type)
    : Array.isArray(topic.genres)
    ? topic.genres
    : [];
  const headerGenreTags = allGenreTags.slice(0, 2);
  const extraGenreTags = allGenreTags.slice(2, 7);

  const subInfoParts = [
    topic.releaseYear ? String(topic.releaseYear) : null,
    topic.studioOrDirector ? String(topic.studioOrDirector) : topic.studio ? String(topic.studio) : null,
    topic.episodes ? `${topic.episodes} eps` : null,
    topic.runtime ? `${topic.runtime}m` : null,
  ].filter(Boolean);

  return (
    <article
      className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs py-4 sm:border sm:border-border/60 sm:rounded-2xl sm:px-5 sm:py-5 transition-all duration-200 hover:bg-card hover:shadow-xs dark:hover:bg-muted/30 sm:mb-0 overflow-hidden"
    >
      {/* Top Eyebrow / Category Bar matching PostCard header cadence */}
      <div className="flex items-center justify-between gap-2 mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Icon size={14} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="font-bold text-foreground truncate">
                {meta.label}
              </span>
              {headerGenreTags.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground/40 shrink-0">•</span>
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {headerGenreTags.map((genre) => (
                      <Link
                        key={genre}
                        href={`/tags/${encodeURIComponent(genre)}`}
                        className="text-[11px] font-semibold text-primary hover:underline capitalize"
                      >
                        #{String(genre).replace(/-/g, " ")}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border/70 bg-muted/30 transition-colors shrink-0"
        >
          <span>View Hub</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Main Content Layout */}
      <div className="px-4 sm:px-0 flex gap-3.5 sm:gap-4 items-start mb-3">
        {/* Left Poster */}
        <Link
          href={href}
          className="relative shrink-0 w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-muted border border-border/60 shadow-xs hover:border-primary/50 transition-all group"
        >
          {topic.cover ? (
            <img
              src={topic.cover}
              alt={topic.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Sparkles className="w-6 h-6" />
            </div>
          )}

          {avgScore && (
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[11px] font-bold">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{avgScore}</span>
            </div>
          )}
        </Link>

        {/* Right Info */}
        <div className="flex-1 min-w-0">
          <Link href={href} className="group/title block">
            <h3 className="text-base sm:text-lg font-extrabold text-foreground leading-snug line-clamp-1 group-hover/title:text-primary transition-colors">
              {topic.title}
            </h3>
          </Link>

          {/* Metadata row */}
          {(subInfoParts.length > 0 || worthItPct !== null || wheelsCount > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {subInfoParts.map((part, idx) => (
                <React.Fragment key={part}>
                  {idx > 0 && <span className="opacity-40">•</span>}
                  <span className="truncate max-w-[160px] capitalize">{part}</span>
                </React.Fragment>
              ))}
              {worthItPct !== null && (
                <>
                  {subInfoParts.length > 0 && <span className="opacity-40">•</span>}
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ThumbsUp className="w-3 h-3" />
                    {worthItPct}% Worth It
                  </span>
                </>
              )}
              {wheelsCount > 0 && (
                <>
                  {(subInfoParts.length > 0 || worthItPct !== null) && <span className="opacity-40">•</span>}
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Disc3 className="w-3 h-3" />
                    {wheelsCount} {wheelsCount === 1 ? "Wheel" : "Wheels"}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Expandable synopsis */}
          {description && (
            <div className="mt-2">
              <p
                onClick={isExpandable ? () => setExpanded((v) => !v) : undefined}
                className={`text-[13px] sm:text-sm text-foreground/85 leading-relaxed ${
                  expanded ? "" : "line-clamp-2 sm:line-clamp-3"
                } ${isExpandable ? "cursor-pointer" : ""}`}
              >
                {description}
              </p>

              {/* Extra tags revealed when expanded */}
              {expanded && extraGenreTags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {extraGenreTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/tags/${encodeURIComponent(tag)}`}
                      className="text-[11px] font-semibold text-primary hover:underline capitalize"
                    >
                      #{String(tag).replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              )}

              {isExpandable && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"
                >
                  <span>{expanded ? "Show less" : "Read more"}</span>
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Interactive Action Bar */}
      <div className="px-4 sm:px-0 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
        <EntityTrackingProvider entityId={entityId}>
          <div className="flex items-center gap-2 flex-wrap">
            <TrackQuickButton
              type={type}
              entityId={entityId}
              name={topic.title}
              slug={topic.slug}
              image={topic.cover || ""}
              size="compact"
            />
            <AddToListButton
              type={type}
              entityId={entityId}
              name={topic.title}
              slug={topic.slug}
              image={topic.cover || ""}
              size="compact"
              className="!w-auto shrink-0"
            />
            <InlineRateButton
              type={type}
              topicPageId={entityId}
              name={topic.title}
            />
          </div>
        </EntityTrackingProvider>
      </div>
    </article>
  );
}
