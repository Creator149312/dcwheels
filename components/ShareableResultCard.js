"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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

export default function ShareableResultCard({ winner, wheelTitle, winnerColor = "#6366f1", totalSegments = 0, onCardGenerated }) {
  const [imageBlob, setImageBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
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

  // Option 1: Clean, high-conversion text summary for quick copy & messaging
  const textSummary = useMemo(() => {
    const oddsStr = totalSegments > 1 ? ` (1 in ${totalSegments} odds)` : "";
    return `🎡 Spin: ${cleanWheelTitle}\n🎯 Result: ${winnerText}${oddsStr}\n\nWhat would your wheel pick?\n${pageUrl}`;
  }, [cleanWheelTitle, winnerText, totalSegments, pageUrl]);

  // Generate Option 2: Sleek landscape ticket badge (880 x 360)
  const generateCard = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateTrophyCard({
        winner,
        wheelTitle,
        winnerColor,
        totalSegments,
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
  }, [winner, wheelTitle, winnerColor, totalSegments, onCardGenerated]);

  useEffect(() => {
    generateCard();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [generateCard]);

  // Option 1: Quick 1-Click Text Copy
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopiedText(true);
      toast.success("Result text copied! Paste into WhatsApp or Discord");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("Could not copy text.");
    }
  };

  // Option 1 & 2 Native Share: attaches ticket image when supported, falls back to text
  const handleNativeShare = async () => {
    const shareData = {
      title: `Spin Result: ${winnerText}`,
      text: `🎡 The wheel landed on "${winnerText}" from "${cleanWheelTitle}"!`,
      url: pageUrl,
    };

    if (imageBlob && navigator.canShare) {
      const file = new File([imageBlob], "spinpapa-result.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ ...shareData, files: [file] });
          toast.success("Shared successfully!");
          return;
        } catch (err) {
          if (err.name !== "AbortError") {
            toast.error("Sharing cancelled.");
          }
          return;
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopyText();
        }
      }
    } else {
      handleCopyText();
    }
  };

  // Option 2: 1-Click Copy Image to Clipboard
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
        toast.success("Ticket image copied! (Ctrl+V / Cmd+V)");
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        throw new Error("ClipboardItem not supported");
      }
    } catch {
      handleCopyText();
    }
  };

  // Instant Download
  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `spinpapa-${winnerText.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "result"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Ticket downloaded!");
  };

  const tweetText = `I spun "${cleanWheelTitle}" on Spinpapa and landed on: ${winnerText}! What would you get?`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(pageUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${tweetText}\n${pageUrl}`)}`;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3 text-left shadow-lg overflow-hidden space-y-2 h-[260px] sm:h-[275px] flex flex-col justify-between">
      {/* ── Ticket Badge Hero Preview (Landscape 880x360) ── */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 flex-1 w-full mx-auto flex items-center justify-center shadow-inner min-h-0">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs font-semibold">Generating Result Pass...</span>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Result Pass"
            className="w-full h-full object-contain"
          />
        ) : null}
      </div>

      {/* ── Bottom Action Block: 1-Click Share + Utility Tools ── */}
      <div className="space-y-1.5 shrink-0">
        {/* Primary 1-Click Action: Share Result */}
        <button
          type="button"
          onClick={handleNativeShare}
          disabled={isGenerating || !imageBlob}
          className="w-full h-9 sm:h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          <Share2 size={14} />
          <span>Share Result</span>
        </button>

        {/* Secondary Quick Tools Row: Copy, Download, X, WhatsApp */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isGenerating || !imageBlob}
              className="h-7.5 px-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Copy picture to clipboard"
            >
              {copiedImage ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedImage ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
              className="h-7.5 px-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-foreground font-semibold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Save PNG to device"
            >
              <Download size={12} />
              <span>Save</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-sky-500 transition-colors"
              title="Share on X"
            >
              <TwitterIcon size={13} />
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-green-500 transition-colors"
              title="Share on WhatsApp"
            >
              <WhatsAppIcon size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
