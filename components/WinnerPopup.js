"use client";
import { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SegmentsContext } from "@app/SegmentsContext";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { Button } from "./ui/button";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import MCQQuestion from "@components/MCQQuestion";
import ShareableResultCard from "./ShareableResultCard";
import AddToListButton from "./AddToListButton";
import { getWheelUrl } from "@utils/UrlHandler";
import { generateTrophyCard } from "@utils/trophyCardGenerator";
import { Trash2, Share2, PenSquare, ExternalLink, X } from "lucide-react";

// Map entity type → action-specific CTA label so the button reads naturally
// for the content category the wheel is about.
function getEntityUrl(entityType, slug, wheelId) {
  if (entityType === "wheel" || entityType === "uwheel") {
    return getWheelUrl({ _id: wheelId, slug: slug });
  }
  return `/${entityType}/${slug}`;
}

const WinnerPopup = ({
  winner,
  prizeNumber,
  setWinner,
  segData,
  setSegData,
  setShowCelebration,
  mustSpin,
  onSpinAgain,
  wheelId,
  wheelSlug: wheelSlugProp,
  wheelPreview,
  containerEl = null,
}) => {
  let [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { html, wheelData, wheelTitle } = useContext(SegmentsContext);
  const { status } = useSession();
  const router = useRouter();
  const openLoginPrompt = useLoginPrompt();
  const [showShareCard, setShowShareCard] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const generatedCardDataUrlRef = useRef("");
  const effectiveWheelId = wheelId || wheelData?._id || "";
  const effectiveWheelSlug = wheelSlugProp || wheelData?.slug || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the winning segment's color for visual sync
  const winnerColor =
    winner?.color ||
    segData[prizeNumber]?.color ||
    wheelData?.segColors?.[prizeNumber % (wheelData?.segColors?.length || 1)] ||
    "#6366f1";

  const closePopup = () => {
    setOpen(false);
    setShowCelebration(false);
    setShowShareCard(false);
    
    // Auto Remove Winner logic executed on popup close instead of immediately
    if (winner && winner !== "" && wheelData?.removeWinnerAfterSpin) {
      removeWinner(false);
    }
  };

  useEffect(() => {
    if (mustSpin) return;

    const timeoutId = setTimeout(() => {
      const hasWinner = winner && winner !== "";

      setOpen(hasWinner);
      setShowCelebration(hasWinner);
      setShowShareCard(false);
      // Reset any previously cached trophy card whenever a new spin lands a winner
      generatedCardDataUrlRef.current = "";
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [winner, mustSpin]);

  // Share the spin result as a community Post. Reuses the existing Post
  // creation flow — attaches wheel + winner as contentRef.
  const shareAsPost = async () => {
    if (status !== "authenticated") {
      openLoginPrompt?.();
      return;
    }

    setIsPosting(true);

    try {
      // If the trophy card hasn't been generated yet (e.g. user didn't open Share toggle first),
      // generate it on demand so community posts always feature the high-res 3:4 Trophy Card!
      if (!generatedCardDataUrlRef.current && winner && winner?.type !== "quiz") {
        try {
          const card = await generateTrophyCard({
            winner,
            wheelTitle,
            winnerColor,
            totalSegments: segData?.filter((s) => s?.visible !== false)?.length || segData?.length || 0,
          });
          if (card?.dataUrl) {
            generatedCardDataUrlRef.current = card.dataUrl;
          }
        } catch (e) {
          console.warn("On-demand trophy card generation fallback:", e);
        }
      }

      const winnerText = winner?.text || String(winner);
      const winnerImage = winner?.image || "";
      const entityType = winner?.entityType || winner?.payload?.entityType || "";
      const entityId   = winner?.entityId   != null ? String(winner.entityId)   : (winner?.payload?.entityId != null ? String(winner.payload.entityId) : "");
      const entitySlug = winner?.slug       || winner?.payload?.slug            || "";

      const params = new URLSearchParams();
      params.set("result", winnerText);
      if (winnerImage) params.set("resultImage", winnerImage);
      // Ensure we always pass the actual wheel title, never a fallback.
      const resolvedWheelTitle = wheelTitle || wheelData?.title || "";
      if (resolvedWheelTitle) {
        params.set("wheelTitle", resolvedWheelTitle);
      }
      if (effectiveWheelId) {
        params.set("wheelId", effectiveWheelId);
        params.set("cr_type", "wheel");
        params.set("cr_id", effectiveWheelId);
        params.set("cr_slug", effectiveWheelSlug);
        params.set("cr_title", resolvedWheelTitle);
        params.set("cr_image", wheelPreview || wheelData?.wheelPreview || winnerImage || "");
      } else if (entityType && entityId) {
        // If wheel is not saved in DB yet, but winner is an entity, attach entity as primary contentRef
        params.set("cr_type", entityType);
        params.set("cr_id", entityId);
        params.set("cr_slug", entitySlug);
        params.set("cr_title", winnerText);
        params.set("cr_image", winnerImage);
      }
      // If the winning segment itself is an entity, include that too.
      if (entityType) {
        params.set("cr_entity_type", entityType);
        params.set("cr_entity_id", entityId);
        params.set("cr_entity_slug", entitySlug);
        params.set("cr_entity_title", winnerText);
        params.set("cr_entity_image", winnerImage);
      }

      // If a 3:4 Trophy Card was generated, store it in sessionStorage for the post composer
      if (generatedCardDataUrlRef.current && typeof window !== "undefined") {
        try {
          sessionStorage.setItem("spinpapa-share-card", generatedCardDataUrlRef.current);
        } catch (e) {
          console.warn("Could not save spinpapa-share-card to sessionStorage", e);
        }
      }

      // Add a timestamp nonce so repeated shares of different spin instances trigger reactive updates
      params.set("_spin_ts", Date.now().toString());

      router.push(`/posts/create?${params.toString()}`);
    } finally {
      setIsPosting(false);
    }
  };

  const removeWinner = (removeAll = false) => {
    let removedOne = false;
    const updatedSegData = segData.filter((element) => {
      if (removeAll) return element.text !== winner?.text;
      if (!removedOne && (element.id === winner?.id || element.text === winner?.text)) {
        removedOne = true;
        return false;
      }
      return true;
    });

    setSegData(updatedSegData);
    html.current = segmentsToHTMLTxt(updatedSegData);
    setOpen(false);
    setShowCelebration(false);
    if (setWinner) setWinner(null);
  };

  const removeWinnerAndSpinNext = (removeAll = false) => {
    let removedOne = false;
    const updatedSegData = segData.filter((element) => {
      if (removeAll) return element.text !== winner?.text;
      if (!removedOne && (element.id === winner?.id || element.text === winner?.text)) {
        removedOne = true;
        return false;
      }
      return true;
    });

    setSegData(updatedSegData);
    html.current = segmentsToHTMLTxt(updatedSegData);
    setOpen(false);
    setShowCelebration(false);
    if (setWinner) setWinner(null);

    // If there are still segments available to spin, trigger the next spin
    const remainingCount = updatedSegData.filter((s) => s?.visible !== false).length;
    if (remainingCount > 0 && typeof onSpinAgain === "function") {
      setTimeout(() => {
        onSpinAgain();
      }, 150);
    }
  };

  const MAX_POPUP_TEXT_LEN = 100;
  const MAX_MESSAGE_LEN = 60;

  function formatWinnerText(winner) {
    if (!winner) return "";
    const raw = typeof winner === "string" ? winner : winner.text || "";
    const text = raw.replace(/<[^>]+>/g, "").trim();
    if (text.length <= MAX_POPUP_TEXT_LEN) return text;
    return text.slice(0, MAX_POPUP_TEXT_LEN - 1).trimEnd() + "…";
  }

  function formatMessage(message) {
    if (!message) return "The wheel has spoken";
    const text = String(message).trim();
    if (text.length <= MAX_MESSAGE_LEN) return text;
    return text.slice(0, MAX_MESSAGE_LEN - 1).trimEnd() + "…";
  }

  const duplicateCount = winner
    ? segData.filter((item) => item.text === winner.text && item?.visible !== false).length
    : 0;
  const hasDuplicates = duplicateCount > 1;

  const isEntityWinner =
    winner?.type === "entity" &&
    Boolean(
      winner?.payload?.entityId ||
      winner?.payload?.slug ||
      winner?.entityId ||
      winner?.slug
    );

  const entityType = winner?.payload?.entityType || winner?.entityType || "";
  const entityId = winner?.payload?.entityId || winner?.entityId;
  const entitySlug = winner?.payload?.slug || winner?.slug || "";
  const entityWheelId = winner?.payload?.wheelId || winner?.wheelId || "";

  if (!open || !mounted) return null;

  const fullscreenEl =
    typeof document !== "undefined"
      ? document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      : null;

  // In native fullscreen, portal into the fullscreen element so browser doesn't hide it behind the top layer.
  // In normal mode, portal into document.body for clean, full-screen viewport centering.
  const targetContainer = containerEl || fullscreenEl || (typeof document !== "undefined" ? document.body : null);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closePopup}
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-md my-auto mx-auto rounded-3xl shadow-2xl overflow-hidden border border-border/80 bg-background text-foreground animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderTop: `4px solid ${winnerColor}`,
          background: `linear-gradient(to bottom, ${winnerColor}15, transparent 50%), hsl(var(--background))`,
        }}
      >
        <div className="p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={closePopup}
            className="absolute top-3 right-3 z-20 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Main Stage Container: Dynamic natural height — expands smoothly only when needed */}
          <div className="flex flex-col justify-center mb-5 min-w-0">
            {!showShareCard ? (
              <div className="text-center w-full min-w-0 py-3 sm:py-4 animate-in fade-in duration-200">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3 opacity-70 truncate px-1"
                  style={{ color: winnerColor }}
                  title={wheelData?.customPopupDisplayMessage || "The Winner Is..."}
                >
                  {formatMessage(wheelData?.customPopupDisplayMessage || "The Winner Is...")}
                </p>

                {winner?.type === "quiz" ? (
                  <MCQQuestion
                    questionData={{
                      title: winner.question || winner.text || "",
                      options: winner.options || winner.payload?.options || [],
                      answer:
                        (winner.options || winner.payload?.options || [])[
                          winner.correctIndex ?? winner.payload?.correctIndex ?? 0
                        ] || "",
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-2 min-w-0 py-1">
                    {winner?.image && (
                      <div className="relative group w-fit max-w-full">
                        <img
                          src={winner.image}
                          alt=""
                          className="w-[125px] h-[125px] sm:w-[140px] sm:h-[140px] object-cover rounded-2xl shadow-xl border-4 border-background transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight tracking-tight drop-shadow-xs break-words w-full">
                      {formatWinnerText(winner)}
                    </h2>
                  </div>
                )}
              </div>
            ) : winner?.type !== "quiz" ? (
              <div className="w-full animate-in fade-in zoom-in-95 duration-200">
                <ShareableResultCard
                  winner={winner}
                  wheelTitle={wheelTitle}
                  winnerColor={winnerColor}
                  totalSegments={segData?.filter((s) => s?.visible !== false)?.length || segData?.length || 0}
                  onCardGenerated={({ dataUrl }) => {
                    generatedCardDataUrlRef.current = dataUrl;
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Action Area */}
          {winner?.type !== "quiz" && (
            <div className="space-y-2 pt-1">
              {/* Row 1: Social Actions [Post to Community Feed] [Share Ticket] */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={shareAsPost}
                  disabled={isPosting}
                  className="h-10 px-3 rounded-xl font-semibold text-xs text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}dd)` }}
                  title="Post result to Spinpapa Community Feed"
                >
                  <PenSquare size={14} />
                  <span className="truncate">{isPosting ? "Preparing..." : "Post to Community"}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setShowShareCard((prev) => !prev)}
                  className={`h-10 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs ${
                    showShareCard
                      ? "border-primary/50 bg-primary/15 text-primary font-bold"
                      : "border-border/80 bg-muted/40 hover:bg-muted text-foreground"
                  }`}
                  title="Generate & Share Ticket Pass"
                >
                  <Share2 size={14} />
                  <span className="truncate">{showShareCard ? "Hide Share" : "Share"}</span>
                </button>
              </div>

              {/* Row 2: Optional Entity Hub Extras (Save to List & Explore) */}
              {isEntityWinner && (entityId || entitySlug) && (
                <div className="grid grid-cols-2 gap-2">
                  {entityId && (
                    <div className="w-full">
                      <AddToListButton
                        type={entityType}
                        entityId={entityId}
                        name={winner.text}
                        slug={entitySlug}
                        image={winner.image}
                        rounded="rounded-xl"
                        size="compact"
                        className="h-10"
                      />
                    </div>
                  )}
                  {entitySlug && (
                    <a
                      href={getEntityUrl(entityType, entitySlug, entityWheelId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                    >
                      <ExternalLink size={13} className="text-muted-foreground" />
                      <span>Explore</span>
                    </a>
                  )}
                </div>
              )}

              {/* Row 3: Wheel Management [Remove from Wheel] [Remove All] */}
              {!wheelData.removeWinnerAfterSpin && (
                <div className="pt-1.5 border-t border-border/60">
                  {hasDuplicates ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => removeWinner(false)}
                        className="h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Remove only this single instance"
                      >
                        <Trash2 size={14} />
                        <span className="truncate">Remove from Wheel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWinner(true)}
                        className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        title={`Remove all ${duplicateCount} copies from wheel`}
                      >
                        <Trash2 size={14} />
                        <span className="truncate">Remove All ({duplicateCount})</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeWinner(false)}
                      className="w-full h-10 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Remove winner from wheel"
                    >
                      <Trash2 size={14} />
                      <span>Remove from Wheel</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return targetContainer ? createPortal(modalContent, targetContainer) : null;
};

export default WinnerPopup;
