"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Download, Copy, Share2, Check, Loader2, Sparkles, X } from "lucide-react";
import { TwitterIcon, WhatsAppIcon } from "@components/BrandIcons";
import { generateDilemmaCard } from "@utils/dilemmaCardGenerator";

export default function DilemmaShareModal({
  isOpen,
  onClose,
  postId,
  postTitle,
  options = [],
  voteCounts = {},
  selectedOptionId = null,
}) {
  const [format, setFormat] = useState("story"); // "story" (9:16) or "landscape" (16:9)
  const [imageBlob, setImageBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedImage, setCopiedImage] = useState(false);

  // Derive canonical direct post link for sharing and card watermark
  const canonicalPostUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://spinpapa.com";
    return postId ? `${window.location.origin}/posts/${postId}` : window.location.href;
  }, [postId]);

  const postUrl = useMemo(() => {
    return canonicalPostUrl.replace(/^https?:\/\//, "");
  }, [canonicalPostUrl]);

  const generate = useCallback(async () => {
    if (!isOpen) return;
    setIsGenerating(true);
    try {
      const result = await generateDilemmaCard({
        postTitle,
        options,
        voteCounts,
        selectedOptionId,
        postUrl,
        format,
      });

      if (result) {
        setImageBlob(result.blob);
        const url = URL.createObjectURL(result.blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.warn("Failed to generate dilemma card:", err);
      toast.error("Could not generate card");
    } finally {
      setIsGenerating(false);
    }
  }, [isOpen, postTitle, options, voteCounts, selectedOptionId, postUrl, format]);

  useEffect(() => {
    generate();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [generate]);

  if (!isOpen) return null;

  // 1-Click Native Share (with image file attached on Mobile / Instagram Stories / WhatsApp)
  const handleNativeShare = async () => {
    if (!imageBlob) return;
    const filename = `spinpapa-verdict-${format}.png`;
    const file = new File([imageBlob], filename, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Pop Culture Verdict: ${postTitle}`,
          text: `Here is where the debate stands on Spinpapa! What's your verdict?`,
          url: canonicalPostUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Sharing cancelled.");
        }
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: `Pop Culture Verdict: ${postTitle}`,
          text: `Here is where the debate stands on Spinpapa! What's your verdict?`,
          url: canonicalPostUrl,
        });
      } catch {}
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `spinpapa-verdict-${format}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image saved!");
  };

  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ "image/png": imageBlob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        toast.success("Card copied to clipboard! Paste into Discord or Reddit.");
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(
      `Settle this debate: "${postTitle}"\n\nWhat's your verdict? Vote here:`
    );
    const url = encodeURIComponent(canonicalPostUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out this debate: "${postTitle}"\n\nWhat's your verdict?\n${canonicalPostUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border/60 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">Share Fandom Verdict Card</h3>
              <p className="text-xs text-muted-foreground">Post to Instagram Stories, Discord or X</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center justify-center gap-2 my-3 p-1 bg-muted/60 rounded-xl">
          <button
            onClick={() => setFormat("story")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              format === "story"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📱 9:16 Story / TikTok
          </button>
          <button
            onClick={() => setFormat("landscape")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              format === "landscape"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💻 16:9 Feed / Discord / X
          </button>
        </div>

        {/* Card Preview */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center min-h-[260px] max-h-[380px] my-1">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-xs font-medium">Generating social verdict card...</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Dilemma Verdict Card"
              className="max-h-[360px] w-auto object-contain rounded-lg shadow-lg"
            />
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="space-y-2 mt-3 pt-2 border-t border-border/40">
          <div className="flex gap-2">
            <button
              onClick={handleNativeShare}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition shadow-md disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              Share / Story
            </button>
            <button
              onClick={handleCopyImage}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-xs sm:text-sm font-semibold transition disabled:opacity-50"
            >
              {copiedImage ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedImage ? "Copied!" : "Copy Image"}
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="p-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition disabled:opacity-50"
              title="Download PNG"
              aria-label="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Direct post:</span>
            <button
              onClick={handleTwitterShare}
              className="p-1.5 rounded-lg border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition"
              title="Share to X"
              aria-label="Share to X"
            >
              <TwitterIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="p-1.5 rounded-lg border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition"
              title="Share to WhatsApp"
              aria-label="Share to WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
