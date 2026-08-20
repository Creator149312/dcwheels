"use client";
import { useEffect, useState, useContext, useRef } from "react";
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

// Map entity type → action-specific CTA label so the button reads naturally
// for the content category the wheel is about.
function getEntityUrl(entityType, slug, wheelId) {
  if (entityType === "wheel" || entityType === "uwheel") {
    return getWheelUrl({ _id: wheelId, slug: slug });
  }
  return `/${entityType}/${slug}`;
}

function getPickLabel(winner) {
  const type = winner?.entityType || winner?.payload?.entityType || "";
  switch (type) {
    case "movie":     return "I'm watching this! 🎬";
    case "anime":     return "I'm watching this! 🎬";
    case "game":      return "I'm playing this! 🎮";
    case "character": return "I'm choosing this! ✨";
    default:          return "I'm picking this! ⚡";
  }
}

const WinnerPopup = ({
  winner,
  prizeNumber,
  segData,
  setSegData,
  setShowCelebration,
  mustSpin,
  wheelId,
  wheelPreview,
}) => {
  let [open, setOpen] = useState(false);
  const { html, wheelData, wheelTitle } = useContext(SegmentsContext);
  const { data: session, status } = useSession();
  const router = useRouter();
  const openLoginPrompt = useLoginPrompt();
  const [decisionSaved, setDecisionSaved] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRemoveMenu, setShowRemoveMenu] = useState(false);
  const removeMenuRef = useRef(null);
  const [savedLogId, setSavedLogId] = useState(null);

  // Get the winning segment's color for visual sync
  const winnerColor =
    segData[prizeNumber]?.color ||
    wheelData?.segColors?.[prizeNumber % (wheelData?.segColors?.length || 1)] ||
    "#6366f1";

  const closePopup = () => {
    setOpen(false);
    setShowCelebration(false);
    setShowShareCard(false);
    setShowRemoveMenu(false);
    
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
      setDecisionSaved(false);
      setShowNoteInput(false);
      setNote("");
      setShowShareCard(false);
      setShowRemoveMenu(false);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [winner, mustSpin]);

  // Close remove dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (removeMenuRef.current && !removeMenuRef.current.contains(e.target)) {
        setShowRemoveMenu(false);
      }
    };
    if (showRemoveMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showRemoveMenu]);

  const saveDecision = async (withNote) => {
    if (saving || decisionSaved) return;
    // Guests can't persist decisions — prompt sign-in instead of firing a
    // 401 to the server and lying to the user with a fake "saved" toast.
    if (status !== "authenticated") {
      setShowNoteInput(false);
      openLoginPrompt?.();
      return;
    }
    setSaving(true);
    try {
      const winnerText = winner?.text || String(winner);
      const winnerImage = winner?.image || "";
      // Media segments carry entity fields at the top level (set by Smart Wheel
      // media routes). Forward them so the DecisionLog row can power the
      // per-content-page "Recent Spins" feed query.
      const entityType = winner?.entityType || winner?.payload?.entityType || "";
      const entityId   = winner?.entityId   != null ? String(winner.entityId)   : (winner?.payload?.entityId != null ? String(winner.payload.entityId) : "");
      const entitySlug = winner?.slug       || winner?.payload?.slug            || "";

      const res = await fetch("/api/decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelId: wheelId || "home",
          wheelTitle: wheelTitle || "",
          result: winnerText,
          resultImage: winnerImage,
          note: withNote ? note : "",
          entityType,
          entityId,
          entitySlug,
        }),
      });

      // Parse the body ONCE before any branching — cloning a Response whose
      // body was already consumed throws silently and loses `isPublic`.
      let responseData = {};
      try {
        responseData = await res.json();
      } catch {
        // Malformed body — non-critical, carry on.
      }

      if (res.ok) {
        setDecisionSaved(true);
        setShowNoteInput(false);
        setSavedLogId(responseData?.id || null);

        // Always dispatch the event on a successful save so the feed shows
        // the user's own card immediately (optimistic UX). If `isPublic` is
        // false (user hasn't opted in), the card is local-only and disappears
        // on the next 60s background refresh — correct behavior. This fixes
        // the two previous bugs: (1) response body was already consumed
        // before `res.clone()` was called, causing isPublic to always be
        // false; (2) publicSpins defaults to false so new users never saw
        // their own saves.
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wheel:decision-saved", {
              detail: {
                wheelId: wheelId || "home",
                result: winnerText,
                resultImage: winnerImage,
                note: withNote ? note : "",
                userName: session?.user?.name || "You",
                isPublic: !!responseData?.isPublic,
              },
            })
          );
        }
      } else {
        // Server-side failure (5xx, etc.). Don't fake success.
        setShowNoteInput(false);
      }
    } catch {
      setShowNoteInput(false);
    } finally {
      setSaving(false);
    }
  };

  // Share the spin result as a community Post. Reuses the existing Post
  // creation flow — no DecisionLog coupling, no new backend surface.
  const shareAsPost = () => {
    if (status !== "authenticated") {
      openLoginPrompt?.();
      return;
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
    params.set("wheelTitle", wheelTitle || "");
    if (wheelId) {
      params.set("wheelId", wheelId);
      // Always attach the source wheel as a contentRef so the post links back.
      // Use the same compact shape as anime/game/movie contentRefs:
      // type + externalId + slug + title + image. No segment count.
      const wheelSlug = wheelData?.slug || "";
      params.set("cr_type", "wheel");
      params.set("cr_id", wheelId);
      params.set("cr_slug", wheelSlug);
      params.set("cr_title", wheelTitle || "");
      params.set("cr_image", wheelPreview || wheelData?.wheelPreview || winnerImage || "");
    }
    // If the winning segment itself is an entity, include that too.
    if (entityType) {
      params.set("cr_entity_type", entityType);
      params.set("cr_entity_id", entityId);
      params.set("cr_entity_slug", entitySlug);
      params.set("cr_entity_title", winnerText);
      params.set("cr_entity_image", winnerImage);
    }

    router.push(`/post/create?${params.toString()}`);
  };

  const removeWinner = (removeAll) => {
    const updatedSegData = segData.filter((element, index) =>
      removeAll
        ? element.text !== winner.text
        : !(element.id === winner.id && index === prizeNumber)
    );

    setSegData(updatedSegData);
    html.current = segmentsToHTMLTxt(updatedSegData);
    setOpen(false);
    setShowCelebration(false);
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

  const setImgMaxWidth = (temphtml) => {
    if (typeof document === "undefined" || !temphtml) return temphtml;

    const div = document.createElement("div");
    div.innerHTML = temphtml.text;

    Array.from(div.getElementsByTagName("img")).forEach((img) => {
      img.style.width = "100px";
    });

    return div.innerHTML;
  };

  const containsDuplicates = (element) =>
    element
      ? segData.filter((item) => item.text === element.text && item.id !== element.id).length > 0
      : false;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop — click to close */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePopup}
          />

          {/* Modal Content */}
          <div
            className="relative z-10 w-full max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden"
            style={{
              borderTop: `4px solid ${winnerColor}`,
              background: `linear-gradient(to bottom, ${winnerColor}10, transparent 40%)`,
            }}
          >
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-5">
              {/* Close button — top right with a generous hit area so
                  users don't have to hit the tiny icon pixel-perfectly. */}
              <button
                onClick={closePopup}
                className="absolute top-1 right-1 z-20 p-3 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Winner Display */}
              <div className="text-center mb-6 min-w-0">
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-50 truncate px-1"
                  style={{ color: winnerColor }}
                  title={wheelData?.customPopupDisplayMessage || "The wheel has spoken"}
                >
                  {formatMessage(wheelData?.customPopupDisplayMessage || "The wheel has spoken")}
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
                  <div className="flex flex-col items-center gap-3 px-2 sm:px-4 min-w-0">
                    {winner?.image && (
                      <div className="relative group w-fit max-w-full">
                        <img
                          src={winner.image}
                          alt=""
                          className="max-w-[140px] max-h-[140px] sm:max-w-[180px] sm:max-h-[180px] w-auto h-auto object-contain rounded-2xl shadow-xl border-4 border-white dark:border-gray-800 transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight drop-shadow-sm break-words w-full">
                      {formatWinnerText(winner)}
                    </h2>
                  </div>
                )}
              </div>

              {/* Share Card — only shown when user clicks Share */}
              {showShareCard && winner?.type !== "quiz" && (
                <div className="animate-in zoom-in-95 duration-200 mb-4">
                  <ShareableResultCard winner={winner} wheelTitle={wheelTitle} />
                </div>
              )}

              {/* ── Action Loop ────────────────────────────────────────── */}
              {winner?.type !== "quiz" && (
                <div className="space-y-4">
                  {decisionSaved ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex flex-col items-center gap-3 p-4 rounded-[20px] bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-xs uppercase tracking-widest">
                          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          Post Published!
                        </div>
                        <p className="text-[11px] text-green-700/60 dark:text-green-400/60 font-medium text-center leading-relaxed">
                          Your choice is now live in the community feed and saved to your profile history.
                        </p>
                        <div className="flex gap-2 w-full pt-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 text-[10px] font-black uppercase tracking-wider rounded-xl border-green-500/20 bg-white/50 dark:bg-black/50"
                            onClick={() => router.push(`/u/${session?.user?.username || session?.user?.name || "profile"}`)}
                          >
                            View Log
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 h-9 text-[10px] font-black uppercase tracking-wider rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 shadow-lg"
                            onClick={() => setShowShareCard(true)}
                          >
                            External Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : showNoteInput ? (
                    <div className="flex gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-black/5 dark:border-white/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a thought..."
                        maxLength={500}
                        className="flex-1 px-3 py-2 text-sm bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 font-medium"
                        onKeyDown={(e) => e.key === "Enter" && saveDecision(true)}
                        autoFocus
                      />
                      <Button onClick={() => saveDecision(true)} disabled={saving} size="sm" className="h-9 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        {saving ? "..." : "Post"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2.5">
                        <Button
                          onClick={() => setShowNoteInput(true)}
                          className="flex-1 h-12 font-black text-sm uppercase tracking-widest text-white shadow-xl active:scale-[0.97] transition-all rounded-2xl group relative overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}dd)` }}
                          disabled={saving}
                        >
                          <span className="relative z-10">{getPickLabel(winner)}</span>
                          <div className="absolute inset-0 bg-white/10 translate-y-12 group-hover:translate-y-0 transition-transform duration-300" />
                        </Button>
                        
                        {!showShareCard && (
                          <button
                            onClick={() => setShowShareCard(true)}
                            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-90 flex-shrink-0"
                            title="Share Externally"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                          </button>
                        )}

                        {/* Share as community Post — only when the wheel
                            has been saved and has a wheelId to link back to. */}
                        {wheelId && (
                          <button
                            onClick={shareAsPost}
                            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-90 flex-shrink-0"
                            title="Share to community feed"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Entity Hub Actions — only for media/content winners */}
                      {winner?.type === "entity" && (
                        winner?.payload?.entityId ||
                        winner?.payload?.slug ||
                        winner?.entityId ||
                        winner?.slug
                      ) && (
                        <div className={`grid ${
                          (winner?.payload?.entityId || winner?.entityId) &&
                          (winner?.payload?.slug || winner?.slug)
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        } gap-2.5 items-center`}>
                          {(winner?.payload?.entityId || winner?.entityId) && (
                            <AddToListButton
                              type={winner.payload?.entityType || winner.entityType}
                              entityId={winner.payload?.entityId || winner.entityId}
                              name={winner.text}
                              slug={winner.payload?.slug || winner.slug}
                              image={winner.image}
                            />
                          )}
                          {(winner?.payload?.slug || winner?.slug) && (
                            <a
                              href={getEntityUrl(
                                winner.payload?.entityType || winner.entityType || "",
                                winner.payload?.slug || winner.slug || "",
                                winner.payload?.wheelId || winner.wheelId || ""
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 h-11 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              Explore
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Remove — isolated at bottom ───────────────────── */}
                  {!wheelData.removeWinnerAfterSpin && (
                    <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="relative" ref={removeMenuRef}>
                        <button
                          onClick={() => setShowRemoveMenu((prev) => !prev)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Remove
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {showRemoveMenu && (
                          <div className="absolute bottom-full right-0 mb-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                            <button
                              onClick={() => { setShowRemoveMenu(false); removeWinner(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Remove this one
                            </button>
                            {containsDuplicates(segData[prizeNumber]) && (
                              <button
                                onClick={() => { setShowRemoveMenu(false); removeWinner(true); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                              >
                                Remove all matching
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default WinnerPopup;
