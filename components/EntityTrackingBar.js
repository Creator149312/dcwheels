"use client";

import TrackQuickButton from "./TrackQuickButton";
import AddToListButton from "./AddToListButton";
import { EntityTrackingProvider } from "./EntityTrackingProvider";

/**
 * EntityTrackingBar
 * ────────────────
 * Wraps the tracking buttons in a provider so the user's entity status
 * is fetched once per topic page and shared across TrackQuickButton,
 * AddToListButton, and DoneNudge.
 */
export default function EntityTrackingBar({ type, entityId, name, slug, image }) {
  return (
    <EntityTrackingProvider entityId={entityId}>
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
    </EntityTrackingProvider>
  );
}
