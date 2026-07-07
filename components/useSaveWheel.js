"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import apiConfig from "@utils/ApiUrlConfig";
import {
  sanitizeInputForDB,
  validateListDescription,
  validateListTitle,
} from "@utils/Validator";

// --- WHEEL PREVIEW CANVAS DRAWING HELPERS ---
const FALLBACK_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function getSegmentText(segment) {
  if (typeof segment === "string") return segment;
  if (segment && typeof segment === "object") {
    if (typeof segment.text === "string") return segment.text;
    if (typeof segment.option === "string") return segment.option;
  }
  return "Option";
}

function getSegmentColor(segment, index, segColors) {
  if (segment && typeof segment === "object") {
    if (typeof segment.color === "string") return segment.color;
    if (segment.style && typeof segment.style.backgroundColor === "string") {
      return segment.style.backgroundColor;
    }
  }
  if (segColors && segColors.length > 0) {
    return segColors[index % segColors.length];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function drawWheelPreview(canvas, wheel) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is not available");
  }

  const size = canvas.width;
  const isSmallCanvas = size <= 512;
  const center = size / 2;
  const radius = size * 0.45;

  const rawSegments = Array.isArray(wheel?.data) && wheel.data.length > 0 ? wheel.data : ["Option"];
  const segments = rawSegments.slice(0, 24);
  const arcSize = (Math.PI * 2) / segments.length;
  
  const wheelData = wheel?.wheelData || {};
  const segColors = wheelData.segColors || [];

  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, size, size);

  // Math scaling
  const titleFontSize = isSmallCanvas ? 16 : 26;
  const segmentFontSize = isSmallCanvas ? 11 : 14;
  const footerFontSize = isSmallCanvas ? 10 : 14;

  // Wheel segments
  for (let i = 0; i < segments.length; i += 1) {
    const start = -Math.PI / 2 + i * arcSize;
    const end = start + arcSize;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = getSegmentColor(segments[i], i, segColors);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isSmallCanvas ? 1 : 2;
    ctx.stroke();

    const label = getSegmentText(segments[i]).replace(/<[^>]+>/g, "").trim() || "Option";
    const angle = start + arcSize / 2;
    const paddingMultiplier = wheelData?.textDistance || 80;
    const textRadius = radius * (paddingMultiplier / 100) * 0.85; // Adjusted to stay within canvas boundaries effectively
    
    const tx = center + Math.cos(angle) * textRadius;
    const ty = center + Math.sin(angle) * textRadius;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111827";
    ctx.font = `600 ${segmentFontSize}px sans-serif`;
    const maxChars = isSmallCanvas ? 12 : 16;
    const shortLabel = label.length > maxChars ? `${label.slice(0, maxChars - 2)}..` : label;
    ctx.fillText(shortLabel, 0, 0);
    ctx.restore();
  }

  // Draw inner radius (donut hole) or center cap
  const innerRadiusPercent = wheelData?.innerRadius || 0;
  if (innerRadiusPercent > 0) {
    const minInnerPercent = Math.min(innerRadiusPercent, 60);
    const innerRadiusPx = radius * (minInnerPercent / 100);
    ctx.beginPath();
    ctx.arc(center, center, innerRadiusPx, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.lineWidth = isSmallCanvas ? 1 : 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = isSmallCanvas ? 2 : 4;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();
  }

  // Center Text Branding
  if (wheelData?.centerText) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${isSmallCanvas ? 14 : 20}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wheelData.centerText, center, center);
  }

  // Footer with extra padding from top (move further down)
  ctx.fillStyle = "#334155";
  ctx.font = `500 ${footerFontSize}px sans-serif`;
  ctx.textAlign = "center";
  const footerPadding = isSmallCanvas ? 6 : 12;
  ctx.fillText("spinpapa.com", center, size - footerPadding);
}

async function canvasToBlob(canvas) {
  // To improve sharpness, render at 2x and downscale
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = canvas.width * 2;
  tmpCanvas.height = canvas.height * 2;
  const tmpCtx = tmpCanvas.getContext("2d");
  tmpCtx.scale(2, 2);
  tmpCtx.drawImage(canvas, 0, 0);
  return new Promise((resolve, reject) => {
    tmpCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }
      resolve(blob);
    }, "image/webp", 1.0); // quality 100
  });
}

function getQueryParams() {
  if (typeof window === "undefined") return { type: null, id: null, tag: null };
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get("type") || params.get("cr_type"),
    id: params.get("id") || params.get("cr_id"),
    tag: params.get("tag"),
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
  const pendingQuestionImageIndices = [];
  for (let i = 0; i < segData.length; i++) {
    const img = segData[i]?.image;
    if (typeof img === "string" && img.startsWith("data:")) pendingIndices.push(i);
    const qImg = segData[i]?.questionImage;
    if (typeof qImg === "string" && qImg.startsWith("data:")) pendingQuestionImageIndices.push(i);
  }

  const centerPending =
    typeof wheelData?.centerImage === "string" &&
    wheelData.centerImage.startsWith("data:");

  if (pendingIndices.length === 0 && pendingQuestionImageIndices.length === 0 && !centerPending) {
    return { data: segData, wheelData };
  }

  const nextData = [...segData];
  await mapLimit(pendingIndices, 3, async (idx) => {
    const url = await uploadDataUrl(nextData[idx].image);
    nextData[idx] = { ...nextData[idx], image: url };
  });
  await mapLimit(pendingQuestionImageIndices, 3, async (idx) => {
    const url = await uploadDataUrl(nextData[idx].questionImage);
    nextData[idx] = { ...nextData[idx], questionImage: url };
  });

  let nextWheelData = wheelData;
  if (centerPending) {
    const url = await uploadDataUrl(wheelData.centerImage);
    nextWheelData = { ...wheelData, centerImage: url };
  }

  return { data: nextData, wheelData: nextWheelData };
}

export function useSaveWheel({ createdBy, segData, wheelData, wheelType }) {
  const router = useRouter();
  const { data: sessionData } = useSession();
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

    const { id, type, tag } = getQueryParams();

    // Merge topic sources:
    //   1. The save-modal's multi-select (`selectedTopics`) — user-picked
    //      from segment auto-detection.
    //   2. The `?type=&id=` or `?cr_type=&cr_id=` query string — preserves the "clicked Create
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
    } else if (tag) {
      const entry = { type: "custom", id: String(tag) };
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

    // Quiz-specific segment validation
    if (wheelType === "quiz" && Array.isArray(segData)) {
      for (let i = 0; i < segData.length; i++) {
        const seg = segData[i];
        if (!seg.question?.trim()) {
          setError(`Question ${i + 1}: Question text is required.`);
          setIsSaving(false);
          return false;
        }
        const filledOptions = (seg.options || []).filter((o) => o?.trim());
        if (filledOptions.length < 2) {
          setError(`Question ${i + 1}: At least 2 answer options are required.`);
          setIsSaving(false);
          return false;
        }
        if (seg.correctIndex == null || seg.correctIndex >= (seg.options || []).length) {
          setError(`Question ${i + 1}: Correct answer selection is invalid.`);
          setIsSaving(false);
          return false;
        }
      }
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
          type: wheelType || "basic",
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
          // Generate and upload wheel preview back-to-back with saving
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 320;
            drawWheelPreview(canvas, { data, wheelData: wheelDataToStore });
            const blob = await canvasToBlob(canvas);

            const form = new FormData();
            form.append("wheelId", selectedWheel._id);
            form.append("file", new File([blob], `${selectedWheel._id}.webp`, { type: "image/webp" }));

            await fetch("/api/wheel-preview", {
              method: "POST",
              body: form,
            });
          } catch (previewErr) {
            console.error("Preview generation/upload failed:", previewErr);
          }

          if (sessionData?.user?.username) {
            router.push(`/u/${sessionData.user.username}`);
          } else {
            router.push("/dashboard");
          }
          return true;
        }
      } else {
        const body = {
          title: titleToStore,
          description: descriptionToStore,
          data,
          createdBy,
          wheelData: wheelDataToStore,
          type: wheelType || "basic",
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
          // Generate and upload wheel preview back-to-back with saving
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 320;
            drawWheelPreview(canvas, { data, wheelData: wheelDataToStore });
            const blob = await canvasToBlob(canvas);

            const form = new FormData();
            form.append("wheelId", resObj.creationID);
            form.append("file", new File([blob], `${resObj.creationID}.webp`, { type: "image/webp" }));

            await fetch("/api/wheel-preview", {
              method: "POST",
              body: form,
            });
          } catch (previewErr) {
            console.error("Preview generation/upload failed:", previewErr);
          }

          if (sessionData?.user?.username) {
            router.push(`/u/${sessionData.user.username}`);
          } else {
            router.push("/dashboard");
          }
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