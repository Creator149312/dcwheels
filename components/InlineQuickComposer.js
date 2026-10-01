"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { 
  X, 
  Loader2, 
  ImageIcon, 
  BarChart2, 
  Plus, 
  Maximize2,
  Tv,
  Film,
  Gamepad2,
  Disc3,
  Layers,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { compressImage } from "@utils/imageCompression";

const TYPE_ICONS = {
  anime: Tv,
  movie: Film,
  game: Gamepad2,
  wheel: Disc3,
  list: Layers,
};

export default function InlineQuickComposer({
  defaultTag = "",
  contentRef = null,
  initialMode = "text", // "text" | "photo" | "poll"
  onClose,
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Photo state
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Poll state (defaults to 2-way VS comparison)
  const [hasPoll, setHasPoll] = useState(initialMode === "poll");
  const [pollOptions, setPollOptions] = useState([
    { text: "", image: "" },
    { text: "", image: "" },
  ]);
  const [pollImagePreviews, setPollImagePreviews] = useState({});

  const textareaRef = useRef(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
    if (initialMode === "photo") {
      fileInputRef.current?.click();
    }
  }, [initialMode]);

  // Adjust textarea height automatically
  const handleTextChange = (e) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Image handling for main post
  const handleMainImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (hasPoll) {
      setError("Posts can include an image or a poll, but not both.");
      return;
    }

    try {
      setImageUploading(true);
      const compressed = await compressImage(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setImagePreview(uploadEvent.target.result);
        setImageUploading(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      setError("Image preparation failed: " + err.message);
      setImageUploading(false);
    }
  };

  // Poll option image select
  const handlePollOptionImageSelect = async (index, file) => {
    if (!file) return;
    setError("");

    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPollOptions((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], image: dataUrl };
          return next;
        });
        setPollImagePreviews((prev) => ({ ...prev, [index]: dataUrl }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      setError("Option photo failed: " + err.message);
    }
  };

  const handlePollOptionChange = (index, val) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: val };
      return next;
    });
  };

  const handleToggleAddOptions = () => {
    if (pollOptions.length === 2) {
      setPollOptions((prev) => [
        ...prev,
        { text: "", image: "" },
        { text: "", image: "" },
      ]);
    } else {
      setPollOptions((prev) => prev.slice(0, 2));
      setPollImagePreviews((prev) => {
        const next = { ...prev };
        delete next[2];
        delete next[3];
        return next;
      });
    }
  };

  // Full page redirect if user wants extensive editing
  const handleOpenFullPage = () => {
    const params = new URLSearchParams();
    if (defaultTag) params.set("tag", defaultTag);
    if (hasPoll) params.set("poll", "true");
    if (contentRef?.externalId) params.set("cr_id", contentRef.externalId);
    if (contentRef?.type) params.set("cr_type", contentRef.type);
    if (contentRef?.slug) params.set("cr_slug", contentRef.slug);
    if (contentRef?.title) params.set("cr_title", contentRef.title.slice(0, 100));
    if (contentRef?.image && !contentRef.image.startsWith("data:") && contentRef.image.length < 500) {
      params.set("cr_image", contentRef.image);
    }
    router.push(`/posts/create?${params.toString()}`);
  };

  // Submit post directly to feed without page hop
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Write something to post.");
      return;
    }

    if (hasPoll) {
      const filled = pollOptions.filter((o) => o.text.trim());
      if (filled.length < 2) {
        setError("Both options must have text.");
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Upload main image to blob if present
      let uploadedImage = null;
      let uploadedVariants = null;
      if (imagePreview && imagePreview.startsWith("data:")) {
        const upRes = await fetch("/api/post/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imagePreview, mode: "post" }),
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedImage = upData.url;
          uploadedVariants = upData.variants || null;
        }
      }

      // 2. Upload poll images if present
      let finalPollOptions = [...pollOptions];
      if (hasPoll) {
        for (let i = 0; i < finalPollOptions.length; i++) {
          const opt = finalPollOptions[i];
          if (opt.image && opt.image.startsWith("data:")) {
            const pRes = await fetch("/api/post/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dataUrl: opt.image, mode: "poll" }),
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              finalPollOptions[i] = {
                ...finalPollOptions[i],
                image: pData.url,
                imageVariants: pData.variants || null,
              };
            }
          }
        }
      }

      // 3. Create post via API
      const tags = defaultTag ? [defaultTag.toLowerCase().trim()] : [];
      const res = await fetch("/api/post/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          image: uploadedImage,
          imageVariants: uploadedVariants,
          hasPoll,
          pollOptions: hasPoll ? finalPollOptions : [],
          tags,
          contentRef: contentRef || null,
          isPublic: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to publish post");
      }

      const { id } = await res.json();

      // Dispatch event to prepend post directly onto the top of the feed stream
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("spinpapa:postCreated", {
            detail: {
              _id: id,
              id: id,
              content: trimmed,
              image: uploadedImage,
              imageVariants: uploadedVariants,
              hasPoll,
              pollOptions: hasPoll
                ? finalPollOptions.map((o) => ({ ...o, voteCount: 0 }))
                : [],
              authorName: session?.user?.name || "You",
              authorHandle: session?.user?.username || null,
              authorImage: session?.user?.image || null,
              userId: session?.user?.id || null,
              tags,
              contentRef: contentRef || null,
              isPublic: true,
            },
          })
        );
      }

      toast.success("Published!");
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const avatarInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <div className="bg-card rounded-2xl border border-primary/30 p-3 sm:p-4 shadow-md transition-all animate-in fade-in-50 duration-200">
      {/* Top Header: Avatar + Expand to Full Page + Close */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-xs font-black text-primary shrink-0">
            {avatarInitial}
          </div>
          <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
            {session?.user?.name || "New Post"}
          </span>

          {/* Connected Topic / Content Reference Chip */}
          {contentRef && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold max-w-[200px] truncate">
              {contentRef.image ? (
                <img
                  src={contentRef.image}
                  alt={contentRef.title || "Topic"}
                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-primary/30"
                />
              ) : (
                (() => {
                  const Icon = TYPE_ICONS[contentRef.type] || Sparkles;
                  return <Icon size={11} className="shrink-0" />;
                })()
              )}
              <span className="truncate">{contentRef.title || contentRef.type}</span>
            </div>
          )}

          {defaultTag && !contentRef && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold truncate">
              #{defaultTag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenFullPage}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Open in Full Composer"
            aria-label="Open full page"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        placeholder={hasPoll ? "What's the matchup or question?" : "What's on your mind?"}
        rows={2}
        maxLength={600}
        className="w-full bg-transparent resize-none border-none outline-none text-sm sm:text-base font-normal text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
      />

      {/* Main Single Photo Preview */}
      {imagePreview && (
        <div className="relative mt-2 rounded-xl overflow-hidden border border-border bg-muted/40 aspect-video max-h-56">
          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setImagePreview("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2-Card VS Poll / 4-Card Quadrant Mode */}
      {hasPoll && (
        <div className="mt-3 p-3 rounded-xl border border-border/70 bg-muted/20">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              {pollOptions.length === 2 ? "Head-to-Head (VS Battle)" : "4-Way Comparison Grid"}
            </span>
            <button
              type="button"
              onClick={() => setHasPoll(false)}
              className="text-xs text-muted-foreground hover:text-destructive transition"
            >
              Cancel Poll
            </button>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pollOptions.length === 2 && (
              <div className="hidden sm:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border-2 border-primary/40 shadow-xs items-center justify-center text-[10px] font-black text-primary pointer-events-none ring-2 ring-background">
                VS
              </div>
            )}

            {pollOptions.map((opt, idx) => {
              const hasImg = !!(pollImagePreviews[idx] || opt.image);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-card p-2 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      Option {idx + 1}
                    </span>
                    <label
                      htmlFor={`inline-poll-opt-${idx}`}
                      className="cursor-pointer text-[11px] flex items-center gap-1 text-primary hover:underline"
                    >
                      <ImageIcon size={12} />
                      {hasImg ? "Change Photo" : "Add Photo"}
                    </label>
                    <input
                      type="file"
                      id={`inline-poll-opt-${idx}`}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePollOptionImageSelect(idx, file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {hasImg && (
                    <div className="relative w-full aspect-16/9 max-h-24 rounded overflow-hidden border border-border">
                      <img
                        src={pollImagePreviews[idx] || opt.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPollOptions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], image: "" };
                            return next;
                          });
                          setPollImagePreviews((prev) => {
                            const next = { ...prev };
                            delete next[idx];
                            return next;
                          });
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    placeholder={`Name or Title ${idx + 1}`}
                    maxLength={65}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground">
              Add photos to create a visual comparison card
            </span>
            <button
              type="button"
              onClick={handleToggleAddOptions}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              {pollOptions.length === 2 ? (
                <>
                  <Plus size={12} /> Add 2 More Options (4-Way)
                </>
              ) : (
                <>Back to 2 Options (VS)</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>
      )}

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
        {/* Attachment Buttons */}
        <div className="flex items-center gap-1 text-muted-foreground">
          {/* Main Photo Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleMainImageSelect}
          />
          <button
            type="button"
            disabled={hasPoll}
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full hover:bg-muted transition ${
              hasPoll ? "opacity-30 cursor-not-allowed" : "text-emerald-500 hover:text-emerald-600"
            }`}
            title="Attach Photo"
          >
            <ImageIcon size={18} />
          </button>

          <button
            type="button"
            disabled={!!imagePreview}
            onClick={() => setHasPoll(!hasPoll)}
            className={`p-2 rounded-full hover:bg-muted transition ${
              imagePreview ? "opacity-30 cursor-not-allowed" : "text-pink-500 hover:text-pink-600"
            }`}
            title="Add Compare / VS Poll"
          >
            <BarChart2 size={18} />
          </button>
        </div>

        {/* Char count + Submit button */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-bold ${
              text.length > 550 ? "text-destructive" : "text-muted-foreground/60"
            }`}
          >
            {text.length}/600
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || imageUploading || !text.trim()}
            className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Posting...
              </>
            ) : (
              "Post"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
