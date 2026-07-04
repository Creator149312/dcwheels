"use client";
import { useState, useRef, useEffect } from "react";

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

export default function Description({ pageData, wordsList }) {
  // Set to true so content is fully visible by default
  const [expanded, setExpanded] = useState(true);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Check if content is long enough to even need a toggle
    // If scrollHeight is greater than our "collapsed" limit (64px)
    if (ref.current?.scrollHeight > 64) {
      setNeedsToggle(true);
    }
  }, [pageData, wordsList]);

  return (
    <div className="bg-muted p-4 rounded-xl mb-4 border border-transparent border-border/50 transition-colors">
      <div
        ref={ref}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{
          // When expanded, we use a large height to allow transition to work
          // When collapsed, we snap to 64px
          maxHeight: expanded ? "2000px" : "64px",
        }}
      >
        {/* 1. Description Section */}
        {!pageData ? (
          <p className="text-sm sm:text-base text-foreground whitespace-pre-line mb-4">
            {wordsList?.description}
          </p>
        ) : (
          pageData.content.map((item, i) => {
            if (item.type === "paragraph")
              return (
                <p key={i} className="mb-4 text-sm sm:text-base text-foreground">
                  {item.text}
                </p>
              );
            if (item.type === "image") {
              // Normalise field names: old data may use `url` or `href` instead of `src`
              const imgSrc = item.src || item.url || item.href || null;
              if (!imgSrc) return null;
              return (
                <figure key={i} className="mb-4">
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
                    <figcaption className="mt-1 text-xs text-center text-muted-foreground">
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
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-block mb-4"
                >
                  {item.text}
                </a>
              );
            if (item.type === "heading") {
              const H = `h${item.level}`;
              const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
              return (
                <H key={i} className={`${sizes[item.level - 1] || "text-base"} font-bold mb-3 text-foreground`}>
                  {item.text}
                </H>
              );
            }
            return null;
          })
        )}

        {/* 2. Words List Bullet Section */}
        {wordsList?.data && wordsList.data.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <h4 className="text-sm font-bold text-foreground mb-2 uppercase tracking-tight">
              List Items:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {wordsList.data.map((item, index) => {
                const { label, imgSrc } = parseSegmentItem(item);
                return (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={label || ""}
                        width={28}
                        height={28}
                        loading="lazy"
                        className="rounded object-cover flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    {!imgSrc && <span className="text-muted-foreground">•</span>}
                    {label && <span>{label}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      {needsToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {expanded ? "↑ See less" : "↓ See more"}
        </button>
      )}
    </div>
  );
}
