"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TrackQuickButton from "./TrackQuickButton";
import AddToListButton from "./AddToListButton";

/**
 * EntityTrackingBar
 * ────────────────
 * A shared wrapper that fetches the user's status for the current entity
 * (Movie, Anime, Game, Character) ONCE and provides it to both the
 * TrackQuickButton and AddToListButton. This prevents redundant DB calls
 * on page load.
 */
export default function EntityTrackingBar({ type, entityId, name, slug, image }) {
  const { status: authStatus } = useSession();
  const [initialData, setInitialData] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (authStatus !== "authenticated" || !entityId) {
        setHasFetched(true);
        return;
    }
    
    fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.found) {
          setInitialData({
            listId: d.listId,
            itemId: d.itemId,
            status: d.status || "want"
          });
        }
        setHasFetched(true);
      })
      .catch(() => {
        setHasFetched(true);
      });
  }, [authStatus, entityId]);

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      <TrackQuickButton
        type={type}
        entityId={entityId}
        name={name}
        slug={slug}
        image={image}
        externalStatus={initialData?.status}
      />
      <AddToListButton
        type={type}
        entityId={entityId}
        name={name}
        slug={slug}
        image={image}
        initialSavedRef={initialData}
      />
    </div>
  );
}
