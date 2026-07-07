"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Loader2, ImageIcon, BarChart2, Earth, Lock } from "lucide-react";
import Link from "next/link";
import { compressImage } from "@utils/imageCompression";
import Image from "next/image";

function CreatePostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");
  const cr_type = searchParams.get("cr_type");
  const cr_id = searchParams.get("cr_id");
  const cr_slug = searchParams.get("cr_slug");
  const cr_title = searchParams.get("cr_title");
  const cr_image = searchParams.get("cr_image");
  const postId = searchParams.get("postId");

  const { data: session, status } = useSession();
  
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [ogMeta, setOgMeta] = useState(null);
  const [ogLoading, setOgLoading] = useState(false);

  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagTrayVisible, setTagTrayVisible] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (postId && !initialLoadDone) {
      const loadPost = async () => {
        try {
          const res = await fetch(`/api/post/${postId}`);
          if (res.ok) {
            const post = await res.json();
            setText(post.content);
            setImage(post.image || "");
            setImagePreview(post.image || "");
            setHasPoll(post.hasPoll || false);
            if (post.hasPoll && post.pollOptions) {
              setPollOptions(post.pollOptions.map((o) => o.text || ""));
            }
            setIsPublic(post.isPublic !== false);
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

    if (firstUrl && (!ogMeta || ogMeta.url !== firstUrl)) {
      const timer = setTimeout(async () => {
        setOgLoading(true);
        try {
          const res = await fetch(`/api/post/og-preview?url=${encodeURIComponent(firstUrl)}`);
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
    } else if (!firstUrl) {
      setOgMeta(null);
    }
  }, [text, imagePreview, hasPoll, ogMeta]);

  useEffect(() => {
    const draft = sessionStorage.getItem("post-draft");
    if (draft && !text) {
      setText(draft);
    } else if (initialTag && !draft) {
      setText(` #${initialTag.toLowerCase().replace(/\s+/g, "") } `);
    }
  }, [initialTag]);

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
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  }, [pollOptions]);

  const handleRemovePollOption = useCallback((index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  }, [pollOptions]);

  const handlePollOptionChange = useCallback((index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  }, [pollOptions]);

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

    const extractedTags = [];
    const tagRegex = /#([a-zA-Z0-9-_]+)/g;
    let match;
    while ((match = tagRegex.exec(rawText)) !== null) {
      const matchedTag = match[1].toLowerCase().trim().replace(/_/g, "-");
      if (matchedTag && !extractedTags.includes(matchedTag)) {
        extractedTags.push(matchedTag);
      }
    }

    if (hasPoll) {
      const activeOptions = pollOptions.filter((o) => o.trim());
      if (activeOptions.length < 2) {
        setError("Poll must have at least 2 options");
        return;
      }
      if (activeOptions.length > 6) {
        setError("Poll must have at most 6 options");
        return;
      }
      for (const opt of activeOptions) {
        if (opt.length > 65) {
          setError("Each poll option must be 65 characters or less");
          return;
        }
      }
    }

    setLoading(true);
    try {
      let finalImageUrl = image;

      if (imagePreview && imagePreview.startsWith("data:")) {
        const uploadRes = await fetch("/api/post/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imagePreview }),
        });

        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { url } = await uploadRes.json();
        finalImageUrl = url;
        setImage(url);
      } else if (!imagePreview) {
        finalImageUrl = null;
      }

      const contentRef = (cr_type && cr_id) ? {
        type: cr_type,
        externalId: cr_id,
        slug: cr_slug || "",
        title: cr_title || "",
        image: cr_image || null,
      } : null;

      const payload = {
        content: rawText,
        image: finalImageUrl,
        contentRef,
        hasPoll,
        pollOptions: hasPoll
          ? pollOptions
              .filter((o) => o.trim())
              .map((text) => ({ text: text.trim(), voteCount: 0 }))
          : [],
        tags: extractedTags,
        isPublic,
        ogMeta: !image && !hasPoll ? ogMeta : null,
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
      router.push(`/post/${result.id || postId}`);
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
          href="/login?callbackUrl=/post/create"
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
        {cr_title && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground whitespace-nowrap">Posting about</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent border border-border truncate max-w-[200px]">
                {cr_image && (
                  <img src={cr_image} alt="" className="w-3 h-3 rounded-full object-cover shrink-0" />
                )}
                <span className="text-xs font-bold text-foreground truncate">{cr_title}</span>
              </div>
            </div>
            {cr_type && (
              <span className="text-[10px] font-medium text-muted-foreground/60 capitalize italic">{cr_type}</span>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-5 flex gap-3 sm:gap-4">
            <div className="shrink-0 hidden sm:block">
              <Image 
                src={userImage} 
                alt="Avatar" 
                width={48} 
                height={48} 
                className="rounded-full bg-muted object-cover border border-border"
              />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col pt-1">
              <div className="flex items-center gap-2 mb-2 sm:hidden">
                <Image 
                  src={userImage} 
                  alt="Avatar" 
                  width={28} 
                  height={28} 
                  className="rounded-full bg-muted object-cover border border-border"
                />
                <span className="font-semibold text-sm">{session?.user?.name}</span>
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
                placeholder="What's on your mind? Type #tag to add spaces..."
                maxLength={600}
                rows={4}
                className="w-full text-base sm:text-lg placeholder:text-muted-foreground/60 bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden text-foreground leading-relaxed transition-all"
                style={{ minHeight: "120px" }}
              />

              {tagTrayVisible && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
                        {new URL(ogMeta.url).hostname.replace('www.', '')}
                      </p>
                    </div>
                  </div>
                )}

                {hasPoll && (
                  <div className="rounded-2xl border border-border border-l-4 border-l-primary bg-muted/20 p-4 mt-3 relative group transition-colors focus-within:border-l-primary">
                    <button 
                      type="button" 
                      onClick={() => setHasPoll(false)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 transition"
                    >
                      <X size={16} />
                    </button>
                    <div className="space-y-3 pr-6">
                      {pollOptions.map((option, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            maxLength={65}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="p-2.5 text-muted-foreground hover:bg-muted rounded-xl transition"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition px-2"
                      >
                        <Plus size={16} /> Add Option
                      </button>
                    )}
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
                onClick={() => setIsPublic(!isPublic)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                title={isPublic ? "Public Post" : "Private Post"}
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
