"use client";
import { useState, useRef, useEffect } from "react";
import RelatedTopicLinks from "@components/RelatedTopicLinks";
import { timeAgo } from "@utils/HelperFunctions";

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/**
 * Resolves image src and label from a wheel segment item.
 * Handles three historical formats:
 *  1. Old:    item.text = '<img src="data:image/png;base64,...">Mario'  (HTML in text)
 *  2. Mid:    item.image = { uri: "https://..." }                       (image object)
 *  3. New:    item.image = "https://blob.vercel-storage.com/..."        (blob URL string)
 */
function parseSegmentItem(item) {
  const rawText = item?.text ?? "";

  // Format 2 & 3 — separate image field
  const imgFromField =
    typeof item?.image === "string"
      ? item.image
      : item?.image?.uri ?? null;

  if (imgFromField) {
    return { label: rawText, imgSrc: imgFromField };
  }

  // Format 1 — HTML embedded in text string
  if (typeof rawText === "string" && rawText.includes("<img")) {
    const srcMatch = rawText.match(/src=["']([^"']+)["']/i);
    const imgSrc = srcMatch ? srcMatch[1] : null;
    const label = rawText.replace(/<[^>]+>/g, "").trim();
    return { label, imgSrc };
  }

  return { label: rawText, imgSrc: null };
}

export default function Description({ 
  pageData, 
  wordsList, 
  tags = [], 
  relatedTopics = [], 
  viewCount = 0, 
  spinCount = 0, 
  createdAt = null 
}) {
  // Description stays indexable (server-rendered text) but collapsed by default for "squeeze"
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Check if content is long enough to even need a toggle
    // If scrollHeight is greater than our "collapsed" limit (80px for a bit more metadata space)
    if (ref.current?.scrollHeight > 80) {
      setNeedsToggle(true);
    }
  }, [pageData, wordsList, tags, relatedTopics]);

  return (
    <div
      className="bg-muted px-3 py-2 sm:py-2.5 rounded-xl mb-2 sm:mb-4 border border-border/20 transition-all hover:bg-muted/60 cursor-pointer group relative overflow-hidden"
      onClick={() => needsToggle && setExpanded(!expanded)}
    >
      <div
        ref={ref}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out relative"
        style={{
          maxHeight: expanded ? "3000px" : "84px",
        }}
      >
        {/* YouTube-style Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold text-foreground/90 mb-2 leading-tight">
          {/* Inline tags next to metadata (YouTube mobile style) */}
          {tags.length > 0 && !expanded && (
            <div className="flex flex-wrap gap-1.5 ml-1">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-primary hover:underline transition-colors font-semibold">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Related Topics - Moved inside and styled as context pills */}
        {relatedTopics.length > 0 && (
          <div className="mb-2 sm:mb-2.5 mt-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <RelatedTopicLinks topics={relatedTopics} />
          </div>
        )}

        {/* 1. Description Section */}
        {tags.length > 0 && expanded && (
          <div className="flex flex-wrap gap-1 mb-2.5 pointer-events-auto">
            {tags.map((tag) => (
              <a
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="text-[11px] font-bold text-primary hover:underline transition-colors px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                #{tag}
              </a>
            ))}
          </div>
        )}

        <div className="text-[13px] sm:text-[14px] text-foreground/90 leading-snug whitespace-pre-wrap pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {!pageData ? (
            <p className="mb-1">
              {wordsList?.description}
            </p>
          ) : (
            pageData.content.map((item, i) => {
              if (item.type === "paragraph")
                return (
                  <p key={i} className="mb-3 text-[13px] sm:text-sm text-foreground/90">
                    {item.text}
                  </p>
                );
              if (item.type === "image") {
                // Normalise field names: old data may use `url` or `href` instead of `src`
                const imgSrc = item.src || item.url || item.href || null;
                if (!imgSrc) return null;
                return (
                  <figure key={i} className="mb-3">
                    <img
                      src={imgSrc}
                      alt={item.alt || item.caption || ""}
                      loading="lazy"
                      className="rounded-lg max-w-full h-auto block"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {(item.caption) && (
                      <figcaption className="mt-1 text-[10px] text-center text-muted-foreground">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              if (item.type === "link")
                return (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-block mb-3 text-[13px]"
                  >
                    {item.text}
                  </a>
                );
              if (item.type === "heading") {
                const H = `h${item.level}`;
                const sizes = ["text-xl", "text-lg", "text-base", "text-sm"];
                return (
                  <H key={i} className={`${sizes[item.level - 1] || "text-sm"} font-black mb-2 text-foreground`}>
                    {item.text}
                  </H>
                );
              }
              return null;
            })
          )}
        </div>

        {/* 2. Words List Bullet Section */}
        {wordsList?.data && wordsList.data.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/20">
            <h4 className="text-[11px] font-black text-foreground/70 mb-2 uppercase tracking-tight">
              List Items:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {wordsList.data.map((item, index) => {
                const { label, imgSrc } = parseSegmentItem(item);
                return (
                  <li key={index} className="flex items-center gap-2 text-[12px] text-muted-foreground font-medium leading-tight">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={label || ""}
                        width={24}
                        height={24}
                        loading="lazy"
                        className="rounded object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    {!imgSrc && <span className="text-muted-foreground/50">•</span>}
                    {label && <span>{label}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Modern Overlay Fade for "More" */}
      {!expanded && needsToggle && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted via-muted/90 to-transparent flex items-end justify-center pb-0.5">
          <span className="text-[10px] font-black uppercase tracking-tighter text-primary/80 group-hover:text-primary transition-colors">
            ...more
          </span>
        </div>
      )}
      
      {expanded && needsToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="mt-2 text-primary/60 hover:text-primary text-[10px] font-black uppercase tracking-tighter transition-colors"
        >
          See less
        </button>
      )}
    </div>
  );
}
