"use client";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "@components/ui/button";
import { useSession } from "next-auth/react";
import { FaMagic } from "react-icons/fa";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { useContext, useState } from "react";
import { usePathname } from "next/navigation";

import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";

const WEIGHTS = [1, 2, 3];

const GenerateWheel = () => {
  const { status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTxt, setLoadingTxt] = useState("Generating...");
  const [progress, setProgress] = useState(0);
  const currentPath = usePathname();
  const isHomepage = currentPath === "/";

  const { setSegData, html, handleWheelSettingsChange } =
    useContext(SegmentsContext);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  // Review step state
  const [step, setStep] = useState("prompt"); // "prompt" | "review"
  const [reviewItems, setReviewItems] = useState([]); // { text, checked, weight }
  const [pendingColors, setPendingColors] = useState(null);
  const [optimize, setOptimize] = useState(false);

  const applyGeneratedWords = (generatedWords, colorCodes) => {
    // ensureArrayOfObjects -> normalizeSegment guarantees each item has
    // { id, text, type:"basic", image:null, payload:{} } so the new
    // segment shape is honoured automatically.
    const segments = ensureArrayOfObjects(generatedWords);
    if (!segments.length) return false;

    setSegData(segments);
    html.current = segments
      .map((s) => `<div>${s.text}</div>`)
      .join("");

    if (Array.isArray(colorCodes) && colorCodes.length > 0) {
      handleWheelSettingsChange({ segColors: colorCodes });
    }
    return true;
  };

  // Translate API status codes into a user-visible message. Centralised so
  // the same fetch error path can be used by both /generate-wheel and the
  // theme call without duplication.
  const friendlyApiError = async (response) => {
    if (response.status === 401) {
      return "Please sign in to use Smart Wheel.";
    }
    if (response.status === 429) {
      return "You're spinning too fast â€” please wait a moment and retry.";
    }
    try {
      const body = await response.clone().json();
      if (body?.error) return body.error;
    } catch {}
    return "Smart Wheel hit a snag. Please try again.";
  };

  const resetLoadingState = () => {
    setLoading(false);
    setProgress(0);
    setLoadingTxt("Generating...");
  };

  const handleGenerateClick = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Please enter a prompt!");
      return;
    }
    if (status !== "authenticated") {
      toast.error("Please sign in to use Smart Wheel!");
      return;
    }

    setLoading(true);
    setProgress(15);
    setLoadingTxt("Curating your wheelâ€¦");

    try {
      const wordCount = 10;

      // Run the wheel + theme calls in parallel â€” theme is decorative, so
      // we don't gate the wheel on it. Old code ran them serially which
      // doubled latency and made a theme failure cascade into a wheel
      // failure (the user would retry "to fix the colours").
      const wheelReq = fetch("/api/ai/generate-wheel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, wordCount, optimize }),
      });
      const themeReq = fetch("/api/ai/generate-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      }).catch(() => null);

      setProgress(40);

      const wheelRes = await wheelReq;
      if (!wheelRes.ok) {
        const msg = await friendlyApiError(wheelRes);
        toast.error(msg);
        resetLoadingState();
        return;
      }

      const wheelData = await wheelRes.json();
      const words = Array.isArray(wheelData?.words) ? wheelData.words : [];
      if (words.length === 0) {
        toast.error("Smart Wheel returned no items. Try a different prompt.");
        resetLoadingState();
        return;
      }

      setProgress(75);
      setLoadingTxt("Picking coloursâ€¦");

      // Theme is best-effort. A network or 4xx/5xx here just falls back
      // to the existing wheel colours â€” the user still gets their wheel.
      let colorCodes = null;
      const themeRes = await themeReq;
      if (themeRes && themeRes.ok) {
        try {
          const themeData = await themeRes.json();
          if (Array.isArray(themeData?.colorCodes)) {
            colorCodes = themeData.colorCodes;
          }
        } catch {
          /* ignore â€” keep current palette */
        }
      }

      setProgress(100);
      setLoadingTxt("Done! Review your items...");

      // Move to review step instead of immediately applying
      setPendingColors(colorCodes);
      // If optimize mode, words are [{ text, score }] — map score to weight
      // If normal mode, words are plain strings — default weight 1
      setReviewItems(
        words.map((item) =>
          typeof item === "string"
            ? { text: item, checked: true, weight: 1 }
            : { text: item.text, checked: true, weight: item.score ?? 1 }
        )
      );
      resetLoadingState();
      setStep("review");
    } catch (error) {
      console.error("Smart Wheel error:", error);
      toast.error("Something went wrong. Please try again.");
      resetLoadingState();
    }
  };

  const handleClosePopup = () => {
    if (loading) return; // Don't allow close mid-flight
    setIsPopupVisible(false);
    setStep("prompt");
    setReviewItems([]);
    setPendingColors(null);
    setOptimize(false);
  };

  const handleBuildWheel = () => {
    // Expand weighted items: weight 2 → item appears twice, etc.
    const expanded = reviewItems
      .filter((item) => item.checked)
      .flatMap((item) => Array(item.weight).fill(item.text));

    if (expanded.length === 0) {
      toast.error("Select at least one item.");
      return;
    }

    const applied = applyGeneratedWords(expanded, pendingColors);
    if (!applied) {
      toast.error("Couldn't apply items. Please try again.");
      return;
    }

    toast.success("Your wheel is ready!");
    setPrompt("");
    setStep("prompt");
    setReviewItems([]);
    setPendingColors(null);
    setOptimize(false);
    setIsPopupVisible(false);
  };

  const toggleItem = (i) =>
    setReviewItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, checked: !item.checked } : item))
    );

  const setWeight = (i, w) =>
    setReviewItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, weight: w } : item))
    );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      handleGenerateClick();
    }
  };

  if (!isHomepage) return null;

  return (
    <Dialog open={isPopupVisible} onOpenChange={setIsPopupVisible}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsPopupVisible(true)} className="shadow-sm">
          <FaMagic size={15} className="mr-2" />
          Smart Wheel
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl md:max-w-2xl bg-card border shadow-lg overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Smart Wheel Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === "prompt" && (
            <>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Best pizza toppings, 90s rock bands, Friday night dinner ideas"
                disabled={loading}
                maxLength={120}
                autoFocus
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  Tip: be specific — &quot;best taco fillings&quot; works better than &quot;food&quot;.
                </p>
              )}
              {!loading && (
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={optimize}
                    onChange={(e) => setOptimize(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <span className="text-sm font-medium">Optimize Wheel Options</span>
                  <span className="text-xs text-muted-foreground">(AI scores &amp; weights items by relevance)</span>
                </label>
              )}
              {loading && (
                <div className="flex flex-col items-center space-y-4">
                  <img src="/spin-wheel-logo.png" alt="Loading" className="h-12 animate-spin" />
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{loadingTxt}</p>
                </div>
              )}
            </>
          )}

          {step === "review" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Check items to include. Boost priority with{" "}
                <span className="font-medium">1x / 2x / 3x</span> — higher weight = more wheel slots.
              </p>
              {optimize && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary font-medium">
                  ✨ Weights auto-set by AI relevance — higher score = more likely to be picked
                </div>
              )}
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {reviewItems.map((item, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                      item.checked ? "border-border bg-card" : "border-border/40 bg-muted/40 opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(i)}
                      className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                    />
                    <span className="flex-1 text-sm truncate">{item.text}</span>
                    {item.checked && (
                      <div className="flex gap-1 shrink-0">
                        {WEIGHTS.map((w) => (
                          <button
                            key={w}
                            onClick={() => setWeight(i, w)}
                            className={`text-xs px-2 py-0.5 rounded-md border font-medium transition-colors ${
                              item.weight === w
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground border-border hover:border-primary hover:text-foreground"
                            }`}
                          >
                            {w}x
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {reviewItems.filter((i) => i.checked).length} of {reviewItems.length} selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step === "prompt" && (
            <>
              <Button onClick={handleGenerateClick} disabled={loading} className="w-full sm:w-auto">
                {loading ? "Generating..." : "Generate"}
              </Button>
              {!loading && (
                <Button variant="outline" onClick={handleClosePopup} className="w-full sm:w-auto">
                  Close
                </Button>
              )}
            </>
          )}
          {step === "review" && (
            <>
              <Button onClick={handleBuildWheel} className="w-full sm:w-auto">
                Build Wheel
              </Button>
              <Button variant="outline" onClick={() => setStep("prompt")} className="w-full sm:w-auto">
                Back
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateWheel;
