"use client";

import { memo } from "react";
import { useViewportCull } from "@/hooks/useViewportCull";
import { getFeedItemKey } from "@/utils/feedUtils";

/**
 * VirtualizedFeed
 *
 * Renders only feed items that are in (or near) the viewport. Off-screen items
 * are replaced by placeholders whose heights are remembered from the first time
 * they were rendered. This keeps the DOM light on long feeds without requiring
 * fixed item heights.
 *
 * Tuned for mobile:
 * - Smaller default rootMargin on narrow viewports.
 * - Heights are measured once and cached.
 * - Placeholder and rendered rows are memoized to avoid re-render churn.
 */
const RenderedRow = memo(function RenderedRow({ item, index, renderItem, measure, register }) {
  const key = getFeedItemKey(item, index);
  return (
    <div
      key={key}
      data-vc-index={index}
      ref={(node) => {
        register(index, node);
        measure(index, node);
      }}
    >
      {renderItem(item, index)}
    </div>
  );
});

const PlaceholderRow = memo(function PlaceholderRow({ index, height, register, item }) {
  const key = getFeedItemKey(item, index);
  return (
    <div
      key={key}
      data-vc-index={index}
      ref={(node) => register(index, node)}
      style={{ height, minHeight: height }}
      className="w-full"
      aria-hidden="true"
    />
  );
});

export default function VirtualizedFeed({
  items,
  renderItem,
  overscan = 1,
  rootMargin = null,
  minHeight = 180,
}) {
  const { visible, register, measure, getHeight } = useViewportCull({
    itemCount: items.length,
    rootMargin,
    minHeight,
  });

  if (!items || items.length === 0) return null;

  return (
    <div className="relative" data-testid="virtualized-feed">
      {items.map((item, index) => {
        const isVisible = visible.has(index);
        const height = getHeight(index);

        // Render the item itself plus immediate neighbours for smooth scrolling.
        const shouldRender = isVisible || visible.has(index - 1) || visible.has(index + 1);
        const paddedRender =
          shouldRender ||
          (overscan > 0 && (visible.has(index - overscan) || visible.has(index + overscan)));

        if (!paddedRender) {
          return (
            <PlaceholderRow
              key={getFeedItemKey(item, index)}
              item={item}
              index={index}
              height={height}
              register={register}
            />
          );
        }

        return (
          <RenderedRow
            key={getFeedItemKey(item, index)}
            item={item}
            index={index}
            renderItem={renderItem}
            measure={measure}
            register={register}
          />
        );
      })}
    </div>
  );
}
