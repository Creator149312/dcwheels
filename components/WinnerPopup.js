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

// Map entity type → action-specific CTA label so the button reads naturally
// for the content category the wheel is about.
function getEntityUrl(entityType, slug) {
  if (entityType === "wheel") return `/wheels/${slug}`;
  if (entityType === "uwheel") return `/uwheels/${slug}`;
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
              {/* Close button — top right */}
              <button
                onClick={closePopup}
                className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Winner Display */}
              <div className="text-center mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: winnerColor }}>
                  The wheel has spoken
                </p>

                {winner?.image && (
                  <img
                    src={winner.image}
                    alt={winner.text}
                    className="max-w-[200px] max-h-[200px] w-auto h-auto object-contain rounded-lg mx-auto mb-3 shadow-md"
                  />
                )}
                {winner?.type === "quiz" && winner?.question ? (
                  <MCQQuestion questionData={winner.question} />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span
                      className={`font-extrabold ${
                        winner?.text?.length > 50 ? "text-xl" : "text-2xl"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: setImgMaxWidth(winner),
                      }}
                    />
                  </p>
                )}
              </div>

              {/* Share Card — only shown when user clicks Share */}
              {showShareCard && winner?.type !== "quiz" && (
                <ShareableResultCard winner={winner} wheelTitle={wheelTitle} />
              )}

              {/* ── Primary Action ────────────────────────────────────── */}
              {winner?.type !== "quiz" && (
                <>
                  {decisionSaved ? (
                    <div className="mb-3">
                      <p className="text-center text-sm text-green-600 dark:text-green-400 font-medium py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
                        ✅ Decision saved!
                      </p>
                    </div>
                  ) : showNoteInput ? (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a quick note..."
                        maxLength={500}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && saveDecision(true)}
                        autoFocus
                      />
                      <Button onClick={() => saveDecision(true)} disabled={saving} size="sm">
                        {saving ? "..." : "Save"}
                      </Button>
                      <Button variant="ghost" onClick={() => saveDecision(false)} disabled={saving} size="sm">
                        Skip
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-3">
                      <Button
                        onClick={() => setShowNoteInput(true)}
                        className="flex-1 font-semibold text-white"
                        style={{ background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}cc)` }}
                        disabled={saving}
                      >
                        {getPickLabel(winner)}
                      </Button>
                      <button
                        onClick={() => setShowShareCard((prev) => !prev)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 dark:bg-gray-800 text-white hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        Share
                      </button>
                    </div>
                  )}

                  {/* Entity Actions: Add to List + Explore */}
                  {winner?.type === "entity" &&
                    (winner?.payload?.entityId || winner?.payload?.slug) && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {winner?.payload?.entityId ? (
                        <AddToListButton
                          type={winner.payload.entityType || winner.entityType}
                          entityId={winner.payload.entityId || winner.entityId}
                          name={winner.text}
                          slug={winner.payload.slug || winner.slug}
                          image={winner.image}
                        />
                      ) : <div />}
                      {winner?.payload?.slug ? (
                        <button
                          onClick={() => {
                            const et = winner.payload?.entityType || winner.entityType || "";
                            const sl = winner.payload?.slug || winner.slug || "";
                            window.location.href = getEntityUrl(et, sl);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Explore
                        </button>
                      ) : <div />}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default WinnerPopup;
