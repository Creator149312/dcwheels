"use client";

import ContentRefCard from "@components/ContentRefCard";
import { getWheelUrl } from "@utils/UrlHandler";

/**
 * Wheel preview card used in posts (spin results, shares, etc.).
 * Delegates to the shared ContentRefCard for consistent UX.
 */
export default function WheelPreviewCard({ title, image, slug, wheelId }) {
  return (
    <ContentRefCard
      href={getWheelUrl({ _id: wheelId, slug })}
      image={image}
      title={title}
      type="wheel"
    />
  );
}
