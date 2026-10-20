"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Loader2, ImageIcon, BarChart2, Earth, Lock } from "lucide-react";
import Link from "next/link";
import { compressImage } from "@utils/imageCompression";
import { getListUrl } from "@utils/UrlHandler";
import { normalizeTag } from "@lib/slug";
import Image from "next/image";
import DestinationSelector from "@components/DestinationSelector";

function stripHtml(raw) {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run up to `limit` async tasks in parallel. Prevents overwhelming Blob
// with many concurrent uploads while still finishing multiple images quickly.
async function mapLimit(items, limit, iter) {
  if (items.length === 0) return [];
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

// Upload a data: URL to Vercel Blob with exponential-backoff retries.
// `mode` is "post" (480/780/1080 variants) or "poll" (240/480 variants).
async function uploadImageWithRetry(dataUrl, mode, { retries = 2, onProgress } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      onProgress?.({ status: "uploading", attempt });
      const res = await fetch("/api/post/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, mode }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `Image upload failed (${res.status})`);
      }
      const result = await res.json();
      onProgress?.({ status: "done", attempt });
      return result;
    } catch (err) {
      lastError = err;
      onProgress?.({ status: "error", attempt, error: err.message });
      if (attempt >= retries) break;
      // Exponential backoff with jitter: ~500ms, ~1s, ~2s
      const base = 500 * Math.pow(2, attempt);
      const jitter = 0.75 + Math.random() * 0.5;
      await sleep(Math.round(base * jitter));
    }
  }
  throw lastError;
}

// Collect every image that still needs to be uploaded to Blob.
function collectPendingUploads({ imagePreview, pollOptions, hasPoll }) {
  const uploads = [];
  if (imagePreview && imagePreview.startsWith("data:")) {
    uploads.push({ type: "main", mode: "post", source: imagePreview });
  }
  if (hasPoll) {
    pollOptions.forEach((opt, idx) => {
      if (opt.image?.startsWith("data:")) {
        uploads.push({ type: "poll", mode: "poll", index: idx, source: opt.image });
      }
    });
  }
  return uploads;
}

function CreatePostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");
  const cr_type = searchParams.get("cr_type");
  const cr_id = searchParams.get("cr_id");
  const cr_slug = searchParams.get("cr_slug");
  const cr_title = searchParams.get("cr_title");
  const cr_image = searchParams.get("cr_image");
  const cr_entity_type = searchParams.get("cr_entity_type");
  const cr_entity_id = searchParams.get("cr_entity_id");
  const cr_entity_slug = searchParams.get("cr_entity_slug");
  const cr_entity_title = searchParams.get("cr_entity_title");
  const cr_entity_image = searchParams.get("cr_entity_image");

  const spinResult = searchParams.get("result");
  const spinImage = searchParams.get("resultImage");
  const wheelShareTitle = searchParams.get("wheelTitle");
  const wheelShareId = searchParams.get("wheelId");
  const postId = searchParams.get("postId");
  const spinTimestamp = searchParams.get("_spin_ts");

  const { data: session, status } = useSession();
  
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [imageVariants, setImageVariants] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState([
    { text: "", image: "" },
    { text: "", image: "" },
  ]);
  const [isPublic, setIsPublic] = useState(true);
  const [wasOriginallyPublic, setWasOriginallyPublic] = useState(false);
  const [explicitTags, setExplicitTags] = useState([]);
  const [pollImagePreviews, setPollImagePreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");

  const [entities, setEntities] = useState(() => {
    const list = [];
    if (cr_id || cr_slug || cr_title) {
      list.push({
        type: cr_type || "anime",
        externalId: cr_id ? String(cr_id) : "",
        slug: cr_slug || "",
        title: wheelShareTitle || cr_title || "",
        image: cr_image || null,
        segmentCount: 0,
      });
    } else if (cr_entity_id || cr_entity_slug || cr_entity_title) {
      list.push({
        type: cr_entity_type || "anime",
        externalId: cr_entity_id ? String(cr_entity_id) : "",
        slug: cr_entity_slug || "",
        title: cr_entity_title || "",
        image: cr_entity_image || null,
        segmentCount: 0,
      });
    }
    return list;
  });

  const [ogMeta, setOgMeta] = useState(null);
  const [ogLoading, setOgLoading] = useState(false);

  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagTrayVisible, setTagTrayVisible] = useState(false);
  const textareaRef = useRef(null);

  // Minimalist Link detection for Wheels/Lists
  useEffect(() => {
    const detectInternalLink = async () => {
      // Don't override if user already has an image or poll
      if (imagePreview || hasPoll || ogMeta) return;

      const wheelRegex = /\/(?:embed|wheel)\/([a-f\d]{24})/i;
      const listRegex = /\/lists\/([a-f\d]{24})/i;
      
      const wheelMatch = text.match(wheelRegex);
      const listMatch = text.match(listRegex);

      if (wheelMatch) {
        const id = wheelMatch[1];
        try {
          const res = await fetch(`/api/wheel/${id}`);
          if (res.ok) {
            const { list } = await res.json();
            if (list) {
              setOgMeta({
                type: "wheel",
                internalId: id,
                title: list.title,
                description: list.description || `Spin the ${list.title} wheel!`,
                image: list.wheelPreview || null,
                url: `/embed/${id}`
              });
            }
          }
        } catch (e) { console.error(e); }
      } else if (listMatch) {
        const id = listMatch[1];
        try {
          const res = await fetch(`/api/unifiedlist/${id}`);
          if (res.ok) {
            const { list } = await res.json();
            if (list) {
              setOgMeta({
                type: "list",
                internalId: id,
                title: list.name,
                description: list.description || `Check out this list: ${list.name}`,
                image: list.image || null,
                url: getListUrl(list)
              });
            }
          }
        } catch (e) { console.error(e); }
      }
    };

    const timer = setTimeout(detectInternalLink, 1000);
    return () => clearTimeout(timer);
  }, [text, imagePreview, hasPoll, ogMeta]);

  useEffect(() => {
    if (postId && !initialLoadDone) {
      const loadPost = async () => {
        try {
          const res = await fetch(`/api/post/${postId}`);
          if (res.ok) {
            const post = await res.json();
            setText(post.content);
            setImage(post.image || "");
            setImageVariants(post.imageVariants || null);
            setImagePreview(post.image || "");
            setHasPoll(post.hasPoll || false);
            if (post.hasPoll && post.pollOptions) {
              setPollOptions(
                post.pollOptions.map((o) => ({
                  text: o.text || "",
                  image: o.image || "",
                  imageVariants: o.imageVariants || null,
                }))
              );
            }
            const isPub = post.isPublic !== false;
            setIsPublic(isPub);
            setWasOriginallyPublic(isPub);
            if (Array.isArray(post.tags)) {
              setExplicitTags(post.tags);
            }
            if (Array.isArray(post.entities) && post.entities.length > 0) {
              setEntities(post.entities);
            } else if (post.contentRef) {
              setEntities([post.contentRef]);
            }
            setOgMeta(post.ogMeta || null);
          } else {
            setError("Could not load post to edit");
          }
        } catch (err) {
          setError("Failed to load post: " + err.message);
        }
        setInitialLoadDone(true);
      };
      loadPost();
    } else if (!postId) {
      setInitialLoadDone(true);
    }
  }, [postId, initialLoadDone]);

  useEffect(() => {
    if (!tagQuery) {
      setTagSuggestions([]);
      setTagTrayVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags/autocomplete?q=${encodeURIComponent(tagQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setTagSuggestions(data.tags || []);
          setTagTrayVisible(data.tags?.length > 0);
        }
      } catch (err) {
        console.error("Tag fetch error:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [tagQuery]);

  const insertTag = (tagName) => {
    const cursorPosition = textareaRef.current?.selectionStart || text.length;
    const textBefore = text.slice(0, cursorPosition);
    const textAfter = text.slice(cursorPosition);

    const newTextBefore = textBefore.replace(/#(\w+)$/, `#${tagName} `);
    setText(newTextBefore + textAfter);
    setTagTrayVisible(false);
    setTagSuggestions([]);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (imagePreview || hasPoll) {
      setOgMeta(null);
      return;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    const firstUrl = matches?.[0];

    // Normalize URLs so e.g. "example.com" and "example.com/" don't cause refetch loops.
    const normalizeUrl = (url) => {
      try {
        return new URL(url).toString();
      } catch {
        return url;
      }
    };
    const normalizedFirstUrl = firstUrl ? normalizeUrl(firstUrl) : null;

    if (normalizedFirstUrl && (!ogMeta || normalizeUrl(ogMeta.url) !== normalizedFirstUrl)) {
      const timer = setTimeout(async () => {
        setOgLoading(true);
        try {
          const res = await fetch(`/api/post/og-preview?url=${encodeURIComponent(normalizedFirstUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) setOgMeta(data);
          }
        } catch (err) {
          console.error("Link preview error:", err);
        } finally {
          setOgLoading(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    } else if (!normalizedFirstUrl) {
      setOgMeta(null);
    }
  }, [text, imagePreview, hasPoll, ogMeta]);

  // Pre-fill composer when sharing a wheel spin result.
  useEffect(() => {
    if (spinResult) {
      const cleanResult = stripHtml(spinResult);
      const wheelName = wheelShareTitle || cr_title || "a wheel";
      const spinText = `🎉 I spun "${wheelName}" and got: ${cleanResult}`;

      // Check if a client-generated trophy card was saved in sessionStorage
      let customShareCard = null;
      try {
        customShareCard = sessionStorage.getItem("spinpapa-share-card");
        if (customShareCard) {
          sessionStorage.removeItem("spinpapa-share-card");
        }
      } catch (e) {
        console.warn("Could not read spinpapa-share-card from sessionStorage", e);
      }

      // If user navigated here via a spin result, clear any stale draft from earlier sessions
      try {
        sessionStorage.removeItem("post-draft");
      } catch (e) {
        console.warn("Could not clear post-draft", e);
      }

      setText(spinText);
      const finalImage = customShareCard || spinImage || "";
      setImage(finalImage);
      setImagePreview(finalImage);

      // Re-anchor entities to the fresh spin result
      const freshEntities = [];
      if (cr_id || cr_slug || cr_title) {
        freshEntities.push({
          type: cr_type || "anime",
          externalId: cr_id ? String(cr_id) : "",
          slug: cr_slug || "",
          title: wheelShareTitle || cr_title || "",
          image: cr_image || null,
          segmentCount: 0,
        });
      } else if (cr_entity_id || cr_entity_slug || cr_entity_title) {
        freshEntities.push({
          type: cr_entity_type || "anime",
          externalId: cr_entity_id ? String(cr_entity_id) : "",
          slug: cr_entity_slug || "",
          title: cr_entity_title || "",
          image: cr_entity_image || null,
          segmentCount: 0,
        });
      }
      if (freshEntities.length > 0) {
        setEntities(freshEntities);
      }
    }
  }, [spinResult, spinImage, wheelShareTitle, cr_title, spinTimestamp, cr_id, cr_slug, cr_image, cr_type, cr_entity_id, cr_entity_slug, cr_entity_title, cr_entity_image, cr_entity_type]);

  // Handle URL flags (?poll=true, ?poll=vs, ?image=1) from fast teaser or external links
  useEffect(() => {
    if (!initialLoadDone || postId) return;

    const pollParam = searchParams.get("poll");
    const imageParam = searchParams.get("image");

    if (pollParam === "true" || pollParam === "vs" || pollParam === "1") {
      setHasPoll(true);
    } else if (imageParam === "1" || imageParam === "true") {
      // Small timeout to allow input ref to mount
      const timer = setTimeout(() => {
        imageInputRef.current?.click();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [initialLoadDone, postId, searchParams]);

  useEffect(() => {
    // Only restore previous draft if NOT opening with a fresh spin result
    if (spinResult) return;

    const draft = sessionStorage.getItem("post-draft");
    if (draft && !text) {
      setText(draft);
    } else if (initialTag && !draft && !cr_id && !cr_slug) {
      // If NOT attached to a concrete TopicPage, pre-fill tag as fallback;
      // when cr_id / cr_slug is present, DestinationSelector already displays the topic badge
      // and the backend automatically inherits parent tags, giving the user a clean slate.
      setText(` #${initialTag.toLowerCase().replace(/\s+/g, "") } `);
    }

    // Auto-focus the textarea on desktop so users can start typing immediately
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      const focusTimer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [initialTag, spinResult, cr_id, cr_slug]);

  useEffect(() => {
    if (text) {
      sessionStorage.setItem("post-draft", text);
    } else {
      sessionStorage.removeItem("post-draft");
    }
  }, [text]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (text.trim() || imagePreview) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [text, imagePreview]);

  const handleAddPollOption = useCallback(() => {
    setPollOptions((prev) => {
      if (prev.length >= 4) return prev;
      // Expand from 2 to 4 in a balanced 2x2 grid
      if (prev.length === 2) {
        return [
          ...prev,
          { text: "", image: "" },
          { text: "", image: "" },
        ];
      }
      return [...prev, { text: "", image: "" }];
    });
  }, []);

  const handleResetToTwoOptions = useCallback(() => {
    setPollOptions((prev) => prev.slice(0, 2));
    setPollImagePreviews((prev) => {
      const updated = { ...prev };
      delete updated[2];
      delete updated[3];
      return updated;
    });
  }, []);

  const handleRemovePollOption = useCallback((index) => {
    setPollOptions((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== index) : prev
    );
  }, []);

  const handlePollOptionChange = useCallback((index, value) => {
    setPollOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: value };
      return updated;
    });
  }, []);

  const handlePollOptionImageSelect = useCallback(
    async (index, file) => {
      if (!file) return;
      setError("");

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSizeBytes = 5 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG, and WEBP images are allowed for poll options.");
        return;
      }
      if (file.size > maxSizeBytes) {
        setError("Poll option image must be less than 5MB.");
        return;
      }

      try {
        const compressed = await compressImage(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(compressed);
        });

        setPollOptions((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], image: dataUrl, imageVariants: null };
          return updated;
        });
        setPollImagePreviews((prev) => ({ ...prev, [index]: dataUrl }));
      } catch (err) {
        setError("Poll option image preparation failed: " + err.message);
      }
    },
    []
  );

  const handleRemovePollOptionImage = useCallback((index) => {
    setPollOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], image: "", imageVariants: null };
      return updated;
    });
    setPollImagePreviews((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleImageSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (hasPoll) {
      setError("Choose either an image or a poll for a post, not both.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    if (file.size > maxSizeBytes) {
      setError("Image raw file size must be less than 5MB.");
      return;
    }

    setImageUploading(true);
    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(compressed);
      });

      setImagePreview(dataUrl);
      setImage("");
    } catch (err) {
      setError("Image preparation failed: " + err.message);
      setImagePreview("");
      setImage("");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [hasPoll]);

  const handleRemoveImage = useCallback(() => {
    setImage("");
    setImageVariants(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const rawText = text.trim();
    if (!rawText) {
      setError("Post content cannot be empty.");
      return;
    }

    if (rawText.length > 600) {
      setError("Post exceeds the 600 character limit.");
      return;
    }

    if (hasPoll && image) {
      setError("Posts can include text with an image or a poll, but not both together.");
      return;
    }

    const extractedTags = [...explicitTags];
    const tagRegex = /#([a-zA-Z0-9-_]+)/g;
    let match;
    while ((match = tagRegex.exec(rawText)) !== null) {
      const matchedTag = normalizeTag(match[1]);
      if (matchedTag && !extractedTags.includes(matchedTag)) {
        extractedTags.push(matchedTag);
      }
    }

    if (hasPoll) {
      const activeOptions = pollOptions.filter((o) => o.text?.trim());
      if (activeOptions.length < 2) {
        setError("Poll must have at least 2 options");
        return;
      }
      if (activeOptions.length > 6) {
        setError("Poll must have at most 6 options");
        return;
      }
      for (const opt of activeOptions) {
        if (opt.text.length > 65) {
          setError("Each poll option must be 65 characters or less");
          return;
        }
      }
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);
    setUploadStage("");

    try {
      let finalImageUrl = image || null;
      let finalImageVariants = imageVariants || null;
      let finalPollOptions = [...pollOptions];

      const pending = collectPendingUploads({ imagePreview, pollOptions, hasPoll });

      if (pending.length > 0) {
        setUploadStage(`Uploading ${pending.length} image${pending.length > 1 ? "s" : ""}...`);
        let completed = 0;

        await mapLimit(pending, 3, async (item) => {
          const result = await uploadImageWithRetry(item.source, item.mode, {
            retries: 2,
            onProgress: ({ status, attempt }) => {
              if (status === "uploading" && attempt > 0) {
                setUploadStage(
                  `Retrying ${item.type === "main" ? "main" : "poll"} image upload (${attempt}/2)...`
                );
              }
            },
          });

          completed += 1;
          setUploadProgress(Math.round((completed / pending.length) * 100));

          if (item.type === "main") {
            finalImageUrl = result.url;
            finalImageVariants = result.variants || { sm: result.url, md: result.url, lg: result.url };
            setImage(finalImageUrl);
            setImageVariants(finalImageVariants);
          } else {
            finalPollOptions[item.index] = {
              ...finalPollOptions[item.index],
              image: result.url,
              imageVariants: result.variants || { sm: result.url, md: result.url },
            };
          }
        });

        setPollOptions(finalPollOptions);
      } else if (!imagePreview) {
        finalImageUrl = null;
        finalImageVariants = null;
      }

      // Multi-entity array from DestinationSelector (or internal link detected)
      const isInternal = ogMeta?.internalId && (ogMeta.type === "wheel" || ogMeta.type === "list");
      const finalEntities = entities.length > 0
        ? entities
        : (isInternal
            ? [{
                type: ogMeta.type,
                externalId: ogMeta.internalId,
                slug: ogMeta.url,
                title: ogMeta.title,
                image: ogMeta.image,
                segmentCount: 0,
              }]
            : []);

      const finalContentRef = finalEntities.length > 0 ? finalEntities[0] : null;

      const payload = {
        content: rawText,
        image: finalImageUrl,
        imageVariants: finalImageVariants,
        contentRef: finalContentRef,
        entities: finalEntities,
        hasPoll,
        pollOptions: hasPoll
          ? finalPollOptions
              .filter((o) => o.text?.trim())
              .map((o) => ({
                text: o.text.trim(),
                image: o.image || null,
                imageVariants: o.imageVariants || null,
                voteCount: 0,
              }))
          : [],
        tags: extractedTags,
        isPublic,
        ogMeta: !image && !hasPoll && !isInternal ? ogMeta : null,
      };

      const method = postId ? "PATCH" : "POST";
      const endpoint = postId ? `/api/post/${postId}` : "/api/post/create";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to ${postId ? "update" : "create"} post`);
      }

      const result = await res.json();
      sessionStorage.removeItem("post-draft");
      router.push(`/posts/${result.id || postId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground mb-4">
          You must be logged in to create a post.
        </p>
        <Link
          href="/login?callbackUrl=/posts/create"
          className="inline-block bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90"
        >
          Log In
        </Link>
      </div>
    );
  }

  const userImage = session?.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.name || 'User'}&backgroundColor=0284c7`;

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-6 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {postId ? "Edit Post" : "Create Post"}
        </h1>
      </div>
      
      <div className="bg-card border border-border sm:rounded-2xl rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-5 flex gap-3 sm:gap-4">
            <div className="shrink-0 hidden sm:block">
              <Image 
                src={userImage} 
                alt="Avatar" 
                width={44} 
                height={44} 
                className="rounded-full bg-muted object-cover border border-border"
              />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Header bar: User Name & Sleek Inline Topic Pill (Threads style) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="sm:hidden">
                    <Image 
                      src={userImage} 
                      alt="Avatar" 
                      width={28} 
                      height={28} 
                      className="rounded-full bg-muted object-cover border border-border"
                    />
                  </div>
                  <span className="font-bold text-sm text-foreground">{session?.user?.name || "User"}</span>
                </div>

                {/* Inline Topic Pill Selector */}
                <div className="w-full sm:w-auto">
                  <DestinationSelector
                    value={entities}
                    onChange={setEntities}
                    locked={Boolean(cr_id && cr_type && cr_type !== "wheel")}
                    onAddTagFallback={(tag) => {
                      setText((prev) => `${prev.trim()} #${tag} `);
                    }}
                  />
                </div>
              </div>
              
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  const val = e.target.value;
                  setText(val);
                  e.target.style.height = 'auto';
                  e.target.style.height = (e.target.scrollHeight) + 'px';

                  const cursor = e.target.selectionStart;
                  const before = val.slice(0, cursor);
                  const lastHash = before.match(/#(\w+)$/);
                  if (lastHash) {
                    setTagQuery(lastHash[1]);
                  } else {
                    setTagQuery("");
                  }
                }}
                placeholder="What's on your mind? Type #tag to add topics..."
                maxLength={600}
                rows={4}
                className="w-full text-base sm:text-lg placeholder:text-muted-foreground/60 bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden text-foreground leading-relaxed transition-all"
                style={{ minHeight: "120px" }}
              />

              {tagTrayVisible && (
                <div className="flex gap-2 overflow-x-auto my-2 pb-1 scrollbar-hide">
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => insertTag(tag.name)}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition"
                    >
                      #{tag.name}
                      {tag.count > 0 && <span className="ml-1 opacity-50 font-normal">{tag.count}</span>}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4 mt-2 empty:hidden">
                {imagePreview && (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-muted mt-3">
                    <Image
                      src={imagePreview}
                      alt="Post image preview"
                      width={600}
                      height={400}
                      className="w-full max-h-80 object-cover"
                    />
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={28} />
                      </div>
                    )}
                    {!imageUploading && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition shadow-sm backdrop-blur-sm"
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {!imagePreview && !hasPoll && ogMeta && (
                  <div className="relative group rounded-2xl border border-border bg-muted/10 overflow-hidden mt-3 max-w-sm">
                    {ogMeta.image && (
                      <div className="relative aspect-video w-full bg-muted">
                        <img 
                          src={ogMeta.image} 
                          alt={ogMeta.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{ogMeta.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ogMeta.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider font-semibold">
                        {ogMeta.url?.startsWith("/") 
                          ? "Spinpapa Internal" 
                          : new URL(ogMeta.url).hostname.replace('www.', '')}
                      </p>
                    </div>
                  </div>
                )}

                {hasPoll && (
                  <div className="rounded-2xl border border-border border-l-4 border-l-primary bg-muted/20 p-4 mt-3 relative group transition-colors focus-within:border-l-primary">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {pollOptions.length === 2 ? "Head-to-Head Comparison" : "4-Way Comparison Grid"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          ({pollOptions.length} Options)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasPoll(false)}
                        className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition p-1"
                        title="Remove poll"
                        aria-label="Remove poll"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Responsive Card Grid: 2 columns on all devices for balanced side-by-side or 2x2 symmetry */}
                    <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Central VS / OR badge for 2-option head-to-head */}
                      {pollOptions.length === 2 && (
                        <div className="hidden sm:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card border-2 border-primary/40 shadow-sm items-center justify-center text-xs font-black tracking-wider text-primary pointer-events-none ring-4 ring-background">
                          VS
                        </div>
                      )}

                      {pollOptions.map((option, idx) => {
                        const hasImg = !!(pollImagePreviews[idx] || option.image);
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border transition-all p-3 flex flex-col justify-between gap-2.5 ${
                              hasImg
                                ? "bg-card border-primary/30 shadow-xs"
                                : "bg-card/90 border-border hover:border-primary/40"
                            }`}
                          >
                            {/* Option Header: Label + Image Upload Button + Delete button */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                Option {idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="file"
                                  id={`poll-opt-img-${idx}`}
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePollOptionImageSelect(idx, file);
                                    e.target.value = "";
                                  }}
                                />
                                <label
                                  htmlFor={`poll-opt-img-${idx}`}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer transition ${
                                    hasImg
                                      ? "bg-primary/10 text-primary border-primary/30"
                                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                                  }`}
                                  title="Add option photo"
                                >
                                  <ImageIcon size={13} />
                                  <span className="text-[11px]">{hasImg ? "Change" : "Photo"}</span>
                                </label>
                                {pollOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePollOption(idx)}
                                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                    title="Remove this option"
                                    aria-label="Remove option"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Image Thumbnail Preview if uploaded */}
                            {hasImg && (
                              <div className="relative w-full aspect-16/9 sm:aspect-square max-h-36 rounded-lg overflow-hidden border border-border bg-muted">
                                <img
                                  src={pollImagePreviews[idx] || option.image}
                                  alt={`Option ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePollOptionImage(idx)}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition"
                                  title="Remove image"
                                  aria-label="Remove image"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}

                            {/* Option Text Input */}
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                              placeholder={`Name or title (e.g. ${
                                idx === 0 ? "Naruto" : idx === 1 ? "Sasuke" : idx === 2 ? "Kakashi" : "Itachi"
                              })`}
                              maxLength={65}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Controls: Pair Expansion / Reset */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5 pt-3 border-t border-border/40 px-1">
                      <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                        <span className="font-semibold text-primary">Pro-tip:</span> Adding photos turns this into a visual VS comparison card.
                      </p>

                      <div className="flex items-center gap-2">
                        {pollOptions.length === 2 ? (
                          <button
                            type="button"
                            onClick={handleAddPollOption}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition"
                          >
                            <Plus size={14} /> Add 2 More Options (4-Way Grid)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResetToTwoOptions}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition"
                          >
                            <X size={14} /> Back to 2 Options (VS Mode)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="px-4 py-3 sm:px-5 border-t border-border flex flex-wrap gap-y-3 items-center justify-between bg-muted/10">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={hasPoll}
                className={`p-2 rounded-full transition tooltip-trigger flex items-center gap-1.5 ${
                  hasPoll
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-primary hover:bg-primary/10"
                }`}
                title="Add Image"
              >
                <ImageIcon size={20} />
                <span className="sr-only sm:not-sr-only sm:text-xs font-semibold">Image</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (!hasPoll && imagePreview) {
                    setError("Choose either an image or a poll for a post, not both.");
                    return;
                  }
                  setHasPoll(!hasPoll);
                }}
                disabled={!hasPoll && !!imagePreview}
                className={`p-2 rounded-full transition flex items-center gap-1.5 
                  ${hasPoll ? "text-primary bg-primary/10" : ""}
                  ${!hasPoll && imagePreview ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                title="Add Poll"
              >
                <BarChart2 size={20} />
                <span className="sr-only sm:not-sr-only sm:text-xs font-semibold">Poll</span>
              </button>
            </div>

            {(hasPoll || imagePreview) && (
              <p className="text-[11px] text-muted-foreground/75">
                Posts can include text with one attachment type: image or poll.
              </p>
            )}
            
            <div className="flex items-center gap-3">
              <div className={`text-[10px] font-bold tracking-tighter ${
                text.length > 550 ? "text-destructive" : "text-muted-foreground/60"
              }`}>
                {text.length}/600
              </div>

              <button
                type="button"
                disabled={postId && wasOriginallyPublic}
                onClick={() => {
                  if (postId && wasOriginallyPublic) return;
                  setIsPublic(!isPublic);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  postId && wasOriginallyPublic
                    ? "text-muted-foreground/60 cursor-not-allowed opacity-80"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={
                  postId && wasOriginallyPublic
                    ? "Public posts cannot be made private. Delete the post to remove it."
                    : isPublic
                    ? "Public Post (Click to make private draft)"
                    : "Private Draft (Click to make public)"
                }
              >
                {isPublic ? <Earth size={14} /> : <Lock size={14} />}
                <span className="hidden sm:inline">{isPublic ? "Public" : "Private"}</span>
              </button>

              <button
                type="submit"
                disabled={loading || (!text.trim() && !image) || text.length > 600}
                className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-full hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {postId ? "Update" : "Post"}
              </button>
            </div>
          </div>

          {loading && uploadStage && (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                {uploadStage} {uploadProgress}%
              </p>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

export default function CreatePostClient() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>}>
      <CreatePostForm />
    </Suspense>
  );
}
