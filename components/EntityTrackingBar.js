"use client";

import TrackQuickButton from "./TrackQuickButton";
import AddToListButton from "./AddToListButton";

/**
 * EntityTrackingBar
 * ────────────────
 * Renders the tracking actions (Watched/Played and Add to List).
 * Expects to be rendered inside an EntityTrackingProvider (or handles it via fallback).
 */
export default function EntityTrackingBar({ type, entityId, name, slug, image }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1 w-full sm:w-auto [&>*]:flex-1 [&>*]:min-w-fit">
      <TrackQuickButton
        type={type}
        entityId={entityId}
        name={name}
        slug={slug}
        image={image}
      />
      <AddToListButton
        type={type}
        entityId={entityId}
        name={name}
        slug={slug}
        image={image}
      />
    </div>
  );
}
