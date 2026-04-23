"use client";
import { useEffect, useState, useContext, useRef } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "./ui/button";
import { segmentsToHTMLTxt } from "@utils/HelperFunctions";
import MCQQuestion from "@app/test/questions/MCQQuestion";
import ShareableResultCard from "./ShareableResultCard";
import AddToListButton from "./AddToListButton";

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
  const { html, wheelData } = useContext(SegmentsContext);
  const [decisionSaved, setDecisionSaved] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showRemoveMenu, setShowRemoveMenu] = useState(false);
  const removeMenuRef = useRef(null);

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
    setSaving(true);
    try {
      const winnerText = winner?.text || String(winner);
      const res = await fetch("/api/decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelId: wheelId || "home",
          wheelTitle: wheelData?.title || "",
          result: winnerText,
          note: withNote ? note : "",
        }),
      });
      if (res.ok) {
        setDecisionSaved(true);
        setShowNoteInput(false);
      } else {
        // Still mark as saved for non-auth users so UI doesn't get stuck
        setDecisionSaved(true);
        setShowNoteInput(false);
      }
    } catch {
      setDecisionSaved(true);
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
                <ShareableResultCard winner={winner} wheelTitle={wheelData?.title} />
              )}

              {/* ── Group 1: Primary Actions ──────────────────────────── */}
              {winner?.type !== "quiz" && (
                <div className="flex gap-2 mb-3">
                  {/* "I'm Doing This!" — saves decision + closes */}
                  {decisionSaved ? (
                    <p className="flex-1 text-center text-sm text-green-600 dark:text-green-400 font-medium py-2">
                      ✅ Decision saved!
                    </p>
                  ) : showNoteInput ? (
                    <div className="flex-1 flex gap-2">
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
                    <Button
                      onClick={() => setShowNoteInput(true)}
                      className="flex-1 font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}cc)` }}
                      disabled={saving}
                    >
                      I&apos;m doing this! ⚡
                    </Button>
                  )}

                  {/* Share — toggles the share card */}
                  <Button
                    onClick={() => setShowShareCard((prev) => !prev)}
                    variant={showShareCard ? "default" : "outline"}
                    className="gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                  </Button>
                </div>
              )}

              {/* ── Group 2: Utility Actions ──────────────────────────── */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {/* Add to List (icon-only wrapper) */}
                {winner?.type === "entity" && winner?.payload?.entityId && (
                  <AddToListButton
                    type={winner.payload.entityType || winner.entityType}
                    entityId={winner.payload.entityId || winner.entityId}
                    name={winner.text}
                    slug={winner.payload.slug || winner.slug}
                    image={winner.image}
                  />
                )}

                {/* Explore — if winner has a page */}
                {winner?.type === "entity" && winner?.payload?.slug && (
                  <button
                    onClick={() => window.location.href = `/${winner.payload?.entityType || winner.entityType}/${winner.payload?.slug || winner.slug}`}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Explore"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                )}

                <div className="flex-1" />

                {/* Remove / Remove All dropdown */}
                {winner?.type !== "quiz" && !wheelData.removeWinnerAfterSpin && (
                  <div className="relative" ref={removeMenuRef}>
                    <button
                      onClick={() => setShowRemoveMenu((prev) => !prev)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {showRemoveMenu && (
                      <div className="absolute bottom-full right-0 mb-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WinnerPopup;
