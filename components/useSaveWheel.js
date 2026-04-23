"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import apiConfig from "@utils/ApiUrlConfig";
import {
  sanitizeInputForDB,
  validateListDescription,
  validateListTitle,
} from "@utils/Validator";
import { handleAction } from "@utils/HelperFunctions";

function getQueryParams() {
  if (typeof window === "undefined") return { type: null, id: null };
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get("type"),
    id: params.get("id"),
  };
}

// Uploads a single data: URL to Blob storage and returns the public URL.
async function uploadDataUrl(dataUrl) {
  const res = await fetch("/api/upload-segment-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || "Image upload failed");
  }
  const { url } = await res.json();
  return url;
}

// Run N uploads in parallel at most. Keeps Blob/egress usage bounded
// while still finishing large wheels quickly.
async function mapLimit(items, limit, iter) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await iter(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// Walk segData + wheelData.centerImage and replace any `data:` URL with
// a freshly uploaded Blob URL. Returns { data, wheelData } with the
// original objects left untouched (shallow-cloned only where needed).
// Existing Blob / http URLs are passed through unchanged — see the
// "re-save an existing wheel" caveat: only strings starting with `data:`
// are uploaded, everything else is preserved.
async function materializeImages(segData, wheelData) {
  const pendingIndices = [];
  for (let i = 0; i < segData.length; i++) {
    const img = segData[i]?.image;
    if (typeof img === "string" && img.startsWith("data:")) pendingIndices.push(i);
  }

  const centerPending =
    typeof wheelData?.centerImage === "string" &&
    wheelData.centerImage.startsWith("data:");

  if (pendingIndices.length === 0 && !centerPending) {
    return { data: segData, wheelData };
  }

  const nextData = [...segData];
  await mapLimit(pendingIndices, 3, async (idx) => {
    const url = await uploadDataUrl(nextData[idx].image);
    nextData[idx] = { ...nextData[idx], image: url };
  });

  let nextWheelData = wheelData;
  if (centerPending) {
    const url = await uploadDataUrl(wheelData.centerImage);
    nextWheelData = { ...wheelData, centerImage: url };
  }

  return { data: nextData, wheelData: nextWheelData };
}

export function useSaveWheel({ createdBy, segData, wheelData, coins, setCoins }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedWheels, setSavedWheels] = useState([]);

  const fetchSavedWheels = async () => {
    if (createdBy !== undefined) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/wheel/user/${encodeURIComponent(createdBy)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch wheels");
        }

        const data = await response.json();
        setSavedWheels(data.lists || []);
      } catch (err) {
        setError(err.message || "Failed to load stored wheels");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const saveWheel = async ({
    title,
    description,
    selectedWheel,
    selectedTopics,
    selectedTags,
    e,
  }) => {
    setError("");
    e.preventDefault();
    setIsSaving(true);

    if (!title || !description || !segData) {
      setError("Title, description and Data are required.");
      setIsSaving(false);
      return false;
    }

    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    const { id, type } = getQueryParams();

    // Merge topic sources:
    //   1. The save-modal's multi-select (`selectedTopics`) — user-picked
    //      from segment auto-detection.
    //   2. The `?type=&id=` query string — preserves the "clicked Create
    //      Wheel from a TopicPage" flow.
    // Deduplicate by `${type}:${id}` so the same topic isn't stored twice.
    const topicKey = (t) => `${t.type}:${t.id}`;
    const topicMap = new Map();

    if (Array.isArray(selectedTopics)) {
      for (const t of selectedTopics) {
        if (
          t &&
          typeof t.type === "string" &&
          typeof t.id === "string" &&
          ["anime", "movie", "game", "character", "custom"].includes(t.type)
        ) {
          topicMap.set(topicKey(t), { type: t.type, id: t.id });
        }
      }
    }

    if (
      id &&
      type &&
      ["anime", "movie", "game", "character", "custom"].includes(type)
    ) {
      const entry = { type, id: String(id) };
      topicMap.set(topicKey(entry), entry);
    }

    const relatedTopics = topicMap.size > 0 ? Array.from(topicMap.values()) : undefined;

    // Tags — passed straight through when the save modal opted in. An empty
    // array explicitly wipes tags on an update; `undefined` leaves them
    // untouched (PUT respects this via its `Array.isArray(tags)` check).
    const tags = Array.isArray(selectedTags)
      ? selectedTags
          .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
          .filter((t) => t.length > 0)
      : undefined;

    if (vlt.length !== 0) {
      setError(vlt);
      setIsSaving(false);
      return false;
    }

    if (vld.length !== 0) {
      setError(vld);
      setIsSaving(false);
      return false;
    }

    try {
      const titleToStore = sanitizeInputForDB(title);
      const descriptionToStore = sanitizeInputForDB(description);

      // Upload any pending base64 segment/center images to Blob storage
      // before saving. Existing http(s) URLs are passed through unchanged.
      let data;
      let wheelDataToStore;
      try {
        const materialized = await materializeImages(segData, wheelData);
        data = materialized.data;
        wheelDataToStore = materialized.wheelData;
      } catch (uploadErr) {
        setError(uploadErr.message || "Image upload failed");
        toast.error(uploadErr.message || "Image upload failed");
        return false;
      }

      if (selectedWheel) {
        const body = {
          title: titleToStore,
          description: descriptionToStore,
          data,
          wheelData: wheelDataToStore,
        };

        if (relatedTopics) body.relatedTopics = relatedTopics;
        if (tags !== undefined) body.tags = tags;

        const res = await fetch(`/api/wheel/${selectedWheel._id}`, {
          method: "PUT",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(body),
        });

        const resObj = await res.json();

        if (resObj?.error) {
          setError("Failed to update the wheel");
          toast.error("Failed to Update Wheel");
          return false;
        } else {
          handleAction({
            actionType: "use",
            amount: parseInt(10),
            coins,
            setCoins,
            event: e,
          });
          router.push("/dashboard");
          return true;
        }
      } else {
        const body = {
          title: titleToStore,
          description: descriptionToStore,
          data,
          createdBy,
          wheelData: wheelDataToStore,
        };

        if (relatedTopics) body.relatedTopics = relatedTopics;
        if (tags !== undefined) body.tags = tags;

        const res = await fetch(`/api/wheel`, {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(body),
        });

        const resObj = await res.json();

        if (resObj?.error) {
          setError("Failed to create a wheel");
          toast.error("Failed to Create Wheel");
          return false;
        } else {
          router.push("/dashboard");
          return true;
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    savedWheels,
    fetchSavedWheels,
    saveWheel,
    isSaving,
    isLoading,
    error,
    setError,
  };
}