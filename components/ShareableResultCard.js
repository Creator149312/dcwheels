"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Download, Copy, Share2, Check, Loader2 } from "lucide-react";
import { TwitterIcon, WhatsAppIcon } from "@components/BrandIcons";
import { generateTrophyCard } from "@utils/trophyCardGenerator";

function stripHtml(value) {
  if (!value) return "";
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = value;
    return div.textContent?.trim() || "";
  }
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ShareableResultCard({ winner, wheelTitle, winnerColor = "#6366f1", onCardGenerated }) {
  const [imageBlob, setImageBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedImage, setCopiedImage] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const winnerText = useMemo(() => {
    if (!winner) return "";
    const rawValue = typeof winner === "string" ? winner : winner?.text || "";
    return stripHtml(rawValue) || "Winner";
  }, [winner]);

  const cleanWheelTitle = useMemo(() => {
    return stripHtml(wheelTitle) || "SpinWheel Decision";
  }, [wheelTitle]);

  // Generate Trophy Card Canvas: 3:4 aspect ratio (1080 x 1440) standard for Instagram, Threads, Facebook & mobile feeds
  const generateCard = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateTrophyCard({
        winner,
        wheelTitle,
        winnerColor,
      });

      if (result) {
        setImageBlob(result.blob);
        const url = URL.createObjectURL(result.blob);
        setPreviewUrl(url);
        if (onCardGenerated) {
          onCardGenerated({ blob: result.blob, dataUrl: result.dataUrl });
        }
      }
      setIsGenerating(false);
    } catch (err) {
      console.warn("Card generation fallback:", err);
      setIsGenerating(false);
    }
  }, [winner, wheelTitle, winnerColor, onCardGenerated]);

  useEffect(() => {
    generateCard();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [generateCard]);

  // 1-Click Native Share (with image file attached on Mobile)
  const handleNativeShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], "spinpapa-winner.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Result: ${winnerText}`,
          text: `The wheel has chosen: ${winnerText}! What would your wheel pick?`,
          url: pageUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if (err.name !== "AbortError") {
          toast.error("Sharing cancelled.");
        }
      }
    } else {
      // Fallback to direct download
      handleDownload();
    }
  };

  // 1-Click Copy Image to Clipboard (Desktop favorite for Discord/Slack/Reddit)
  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            [imageBlob.type]: imageBlob,
          }),
        ]);
        setCopiedImage(true);
        toast.success("Image copied! Paste it anywhere (Ctrl+V / Cmd+V)");
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        throw new Error("ClipboardItem not supported");
      }
    } catch {
      // Fallback to text copy
      try {
        await navigator.clipboard.writeText(
          `🎉 The wheel has chosen: ${winnerText}!\nCheck it out here: ${pageUrl}`
        );
        toast.success("Result text copied to clipboard!");
      } catch {
        toast.error("Could not copy to clipboard.");
      }
    }
  };

  // Instant Download PNG
  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `spinpapa-${winnerText.toLowerCase().replace(/\s+/g, "-")}-result.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image downloaded!");
  };

  const message = `My Spinpapa pick: ${winnerText}! What would your wheel choose?`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(pageUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message}\n${pageUrl}`)}`;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 text-left shadow-lg overflow-hidden space-y-3">
      {/* Card Preview Banner (3:4 ratio standard for mobile/IG/Threads feeds) */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 aspect-[3/4] max-h-[360px] mx-auto flex items-center justify-center group shadow-inner">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs font-semibold">Creating Trophy Card...</span>
          </div>
        ) : previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Result Trophy Card"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-white/90 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Download size={14} /> Download
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Primary Action Row: Instant Copy Image + Native Share / Download */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={isGenerating || !imageBlob}
          className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Copy Image to clipboard for Discord, Slack, or Reddit"
        >
          {copiedImage ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          disabled={isGenerating || !imageBlob}
          className="h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Share on WhatsApp, Instagram, or download"
        >
          <Share2 size={14} />
          <span>Share Picture</span>
        </button>
      </div>

      {/* Secondary Row: Direct Social & Download */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-sky-500 transition-colors"
            title="Share on Twitter / X"
          >
            <TwitterIcon size={16} />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-green-500 transition-colors"
            title="Share on WhatsApp"
          >
            <WhatsAppIcon size={16} />
          </a>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating || !previewUrl}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium text-[11px] cursor-pointer"
        >
          <Download size={13} />
          <span>Download PNG</span>
        </button>
      </div>
    </div>
  );
}
