"use client";
import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import {
  prepareData,
  getWheelData,
  calculateMaxLengthOfText,
  calculateFontSizeOfText,
  segmentsToHTMLTxt,
} from "@utils/HelperFunctions";
import { usePathname } from "next/navigation";
import { useWheelSounds } from "./useWheelSounds";
import toast from "react-hot-toast";

const IMAGES_LS_KEY = "SpinpapaWheelImages";

// Content-based fingerprint for a data: URL. Cheap (no crypto) but unique
// enough to dedupe identical images — e.g. when the user duplicates a segment
// many times, all N copies share one storage slot instead of N.
function imgFingerprint(dataUrl) {
  return `${dataUrl.length}:${dataUrl.slice(-48)}`;
}

// Build a content-deduped image store:
//   { images: { [hash]: dataUrl }, refs: { [segId]: hash } }
// This is what actually gets written to localStorage.
function splitSegImages(segData) {
  const images = {};
  const refs = {};
  const lightSegData = segData.map((seg) => {
    if (typeof seg.image === "string" && seg.image.startsWith("data:")) {
      const hash = imgFingerprint(seg.image);
      if (!images[hash]) images[hash] = seg.image;
      refs[seg.id] = hash;
      return { ...seg, image: null };
    }
    return seg;
  });
  return { lightSegData, images, refs };
}

function readImageStore() {
  if (typeof window === "undefined") return { images: {}, refs: {} };
  try {
    const raw = window.localStorage.getItem(IMAGES_LS_KEY);
    if (!raw) return { images: {}, refs: {} };
    const parsed = JSON.parse(raw);
    // Backward compat: older format was a flat { [segId]: dataUrl } map.
    if (parsed && parsed.images && parsed.refs) return parsed;
    if (parsed && typeof parsed === "object") {
      const images = {};
      const refs = {};
      for (const [id, url] of Object.entries(parsed)) {
        if (typeof url !== "string" || !url.startsWith("data:")) continue;
        const hash = imgFingerprint(url);
        if (!images[hash]) images[hash] = url;
        refs[id] = hash;
      }
      return { images, refs };
    }
    return { images: {}, refs: {} };
  } catch {
    return { images: {}, refs: {} };
  }
}

// Rehydrate full data URLs into segData after load.
function rehydrateSegImages(segData) {
  if (!segData || !Array.isArray(segData)) return segData;
  const { images, refs } = readImageStore();
  if (!Object.keys(images).length) return segData;
  return segData.map((seg) => {
    if (seg.image) return seg;
    const hash = refs[seg.id];
    const dataUrl = hash ? images[hash] : null;
    return dataUrl ? { ...seg, image: dataUrl } : seg;
  });
}

export function useWheelState({ newSegments, wheelPresetSettings, wheelTypeProp = "basic", wheelId, wheelTitle: pageWheelTitle }) {
  const {
    resultList,
    setResultList,
    wheelData,
    segData,
    setSegData,
    data,
    setData,
    html,
    setWheelData,
    MAX_SPIN_TIME,
    wheelTitle,
    setWheelTitle,
    wheelDescription,
    setWheelDescription,
    advancedOptions,
    wheelType,
    setWheelType,
  } = useContext(SegmentsContext);

  const currentPath = usePathname();

  const [mustSpin, setMustSpin] = useState(false);
  const [localStorageWheel, setLocalStorageWheel] = useState(null);
  const [prizeNumber, setPrizeNumber] = useState(-1);
  const [winner, setWinner] = useState();
  const [showCelebration, setShowCelebration] = useState(false);
  const [maxlengthOfSegmentText, setMaxlengthOfSegmentText] = useState(1);
  const [segTxtfontSize, setSegTxtfontSize] = useState(
    wheelData?.fontSize ? wheelData.fontSize : 1
  );
  const [showOverlay, setShowOverlay] = useState(true);
  const [muted, setMuted] = useState(false);
  const { startTicking, stopTicking, playVictory } = useWheelSounds(muted);
  const initializedRef = useRef(false);
  const lastImageSigRef = useRef("");
  const quotaWarnedRef = useRef(false);

  const saveWheelData = (segData, wheelData) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const { lightSegData, images, refs } = splitSegImages(segData);
      const wheelObject = {
        title: wheelTitle || "Default Title",
        description: wheelDescription || "Default Description",
        type: wheelType || "basic",
        data: lightSegData,
        wheelData: wheelData,
      };
      window.localStorage.setItem("SpinpapaWheel", JSON.stringify(wheelObject));

      // Persist image store separately — only when the unique image set
      // actually changes. This prevents rewriting multi-MB base64 blobs on
      // every keystroke, and dedupes duplicated segments so N copies of the
      // same image share one slot instead of N.
      const imageSig = Object.keys(images).sort().join("|");
      const refsSig = Object.entries(refs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, h]) => `${id}=${h}`)
        .join("|");
      const combinedSig = `${imageSig}##${refsSig}`;
      if (combinedSig !== lastImageSigRef.current) {
        lastImageSigRef.current = combinedSig;
        try {
          if (imageSig.length) {
            window.localStorage.setItem(
              IMAGES_LS_KEY,
              JSON.stringify({ images, refs })
            );
          } else {
            window.localStorage.removeItem(IMAGES_LS_KEY);
          }
        } catch (quotaErr) {
          // localStorage has a ~5MB per-origin quota. At that size we just
          // stop persisting images locally — they still work in memory until
          // the wheel is saved to the server. Warn once per session.
          if (!quotaWarnedRef.current) {
            quotaWarnedRef.current = true;
            toast("Too many local images to cache — save your wheel to keep them.", { icon: "ℹ️" });
          }
          try { window.localStorage.removeItem(IMAGES_LS_KEY); } catch {}
        }
      }
    } catch (e) {
      // Non-image localStorage failure (e.g. private browsing) — warn once.
      if (!quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        toast.error("Error saving wheel locally. Your changes still work in this tab.");
      }
    }
  };

  // Function to pick a random element based on weights
  const pickRandomWinner = () => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const totalWeight = data.reduce((sum, element) => {
      const w = Number(element?.optionSize);
      return sum + (Number.isFinite(w) && w > 0 ? w : 1);
    }, 0);
    if (totalWeight <= 0) return 0;
    const randomValue = Math.floor(Math.random() * totalWeight);
    let cumulativeWeight = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Number(data[i]?.optionSize);
      const safeW = Number.isFinite(w) && w > 0 ? w : 1;
      cumulativeWeight += safeW;
      if (randomValue < cumulativeWeight) return i;
    }
    return 0;
  };

  const handleSpinClick = () => {
    if (!mustSpin) {
      setShowOverlay(false);
      setMustSpin(true);
      // react-custom-roulette total animation = (2600 + 750 + 8000) * spinDurationProp
      // spinDurationProp = wheelData.spinDuration / MAX_SPIN_TIME
      const spinDurationProp = wheelData.spinDuration / MAX_SPIN_TIME;
      const actualSpinMs = 11350 * spinDurationProp;
      startTicking(actualSpinMs);
      const newPrizeNumber = advancedOptions
        ? pickRandomWinner()
        : Math.floor(
            Math.random() *
              (data.length < wheelData.maxNumberOfOptions
                ? data.length
                : wheelData.maxNumberOfOptions)
          );
      setPrizeNumber(newPrizeNumber);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    stopTicking();
    playVictory();
    let winnerSegment = null;
    if (advancedOptions) {
      let adjustedWinner = null;
      let j = 0;
      for (let i = 0; i < segData.length; i++) {
        // Match prepareData()'s visibility rule: a segment is visible
        // unless explicitly set to false. Using `!== false` keeps us in
        // sync when `visible` is omitted entirely (the storage-saving
        // path drops it when not set).
        if (segData[i].visible !== false) {
          if (j === prizeNumber) {
            adjustedWinner = segData[i];
            setPrizeNumber(i);
            break;
          } else j++;
        }
      }
      setWinner(adjustedWinner);
      setResultList([...resultList, adjustedWinner]);
      winnerSegment = adjustedWinner;
    } else {
      setWinner(segData[prizeNumber]);
      setResultList([...resultList, segData[prizeNumber]]);
      winnerSegment = segData[prizeNumber];
    }

    if (wheelId) {
      // Pull the displayable label off the winning segment. Different parts
      // of the app store it under different keys (`option`, `text`, `label`,
      // `value`); fall back through them so per-segment hit counts work
      // regardless of which editor produced the wheel data.
      const segmentLabel =
        winnerSegment &&
        (winnerSegment.option ??
          winnerSegment.text ??
          winnerSegment.label ??
          winnerSegment.value ??
          null);

      fetch("/api/wheel-analytics/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wheelId, segmentLabel }),
        keepalive: true,
      })
        .then((res) => {
          if (res.ok && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("wheel:spin-counted", {
                detail: { wheelId, segmentLabel },
              })
            );
          }
        })
        .catch(() => {
          // Silent analytics failure by design.
        });
    }
  };

  // Pre-validate image URIs without forcing CORS headers.
  // External image CDNs (like TMDB) do not send CORS headers for canvas export,
  // but can be safely drawn directly onto the canvas by react-custom-roulette.
  // We test loading the image with a plain Image element:
  // - If it successfully loads (200 OK), we mark it as valid (safeUrl: uri).
  // - If it fails or 404s, we mark it as invalid (safeUrl: null) to gracefully fall back to text.
  const [safeImageDataUris, setSafeImageDataUris] = useState(() => ({}));

  useEffect(() => {
    if (!Array.isArray(segData)) return;

    let isMounted = true;
    const pendingLoads = [];

    for (const seg of segData) {
      const uri = seg?.image || (typeof seg?.text === "string" && /src="([^"]+)"/.exec(seg.text)?.[1]);
      if (uri && typeof uri === "string" && !(uri in safeImageDataUris)) {
        if (uri.startsWith("data:")) {
          // Data URLs are already local and always valid
          setSafeImageDataUris((prev) => ({ ...prev, [uri]: uri }));
          continue;
        }

        pendingLoads.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                resolve({ uri, safeUrl: uri });
              } else {
                resolve({ uri, safeUrl: null });
              }
            };
            img.onerror = () => resolve({ uri, safeUrl: null });
            img.src = uri;
          })
        );
      }
    }

    if (pendingLoads.length > 0) {
      Promise.all(pendingLoads).then((results) => {
        if (!isMounted) return;
        setSafeImageDataUris((prev) => {
          const updated = { ...prev };
          let changed = false;
          results.forEach(({ uri, safeUrl }) => {
            if (updated[uri] !== safeUrl) {
              updated[uri] = safeUrl; // URI if valid, or null if broken/404
              changed = true;
            }
          });
          return changed ? updated : prev;
        });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [segData]);

  // Memoize the expensive transform — only recompute when real inputs change.
  // Identity is stable across unrelated re-renders so downstream <Wheel> doesn't
  // get a new array reference every time something unrelated re-renders.
  const preparedData = useMemo(
    () => prepareData(
      segData,
      wheelData.segColors,
      maxlengthOfSegmentText,
      advancedOptions,
      wheelData.mysteryMode,
      safeImageDataUris
    ),
    [segData, wheelData.segColors, wheelData.mysteryMode, maxlengthOfSegmentText, advancedOptions, safeImageDataUris]
  );

  // Wheel update vs localStorage save have very different latency budgets:
  //   - Wheel sync should feel instant — defer only one animation frame so
  //     React can batch keystroke bursts but the user still sees their edits
  //     reflected immediately on the wheel.
  //   - localStorage save is expensive (JSON.stringify + image-store split +
  //     potentially MBs of base64). Keep it debounced longer to avoid burning
  //     main-thread time on every keystroke.
  const renderCountRef = useRef(0);
  useEffect(() => {
    const maxLen = calculateMaxLengthOfText(segData);
    setMaxlengthOfSegmentText(maxLen);
    setSegTxtfontSize(calculateFontSizeOfText(maxLen, segData));

    // Push wheel data on the next frame — instant from the user's POV.
    const raf = requestAnimationFrame(() => {
      setData(preparedData);
    });

    // Debounce the heavy localStorage write separately.
    let saveTimer;
    if (currentPath === "/" || currentPath === "/wheels/create") {
      saveTimer = setTimeout(() => {
        renderCountRef.current++;
        if (renderCountRef.current > 2) saveWheelData(segData, wheelData);
      }, 500);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [preparedData, segData, wheelData, advancedOptions, wheelType]);

  // Clear any active winner/result when the wheel mode changes so
  // WinnerPopup / QuizCard don't persist stale state across switches.
  useEffect(() => {
    setWinner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelType]);

  // Initialize from localStorage or props on mount
  useEffect(() => {
    if (currentPath === "/" || currentPath === "/wheels/create") {
      const wheelFromBrowserStorage = getWheelData();
      initializedRef.current = true;

      // Use localStorage data if it exists, otherwise fall back to defaults
      const rawSegData = wheelFromBrowserStorage?.data || newSegments;
      const localSegData = rehydrateSegImages(rawSegData);
      const localWheelData = wheelFromBrowserStorage?.wheelData || wheelData;

      // Seed image signature from hydrated segments so the first real save
      // doesn't unnecessarily rewrite the image store.
      const { images: seedImages, refs: seedRefs } = splitSegImages(localSegData);
      const seedImgSig = Object.keys(seedImages).sort().join("|");
      const seedRefSig = Object.entries(seedRefs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, h]) => `${id}=${h}`)
        .join("|");
      lastImageSigRef.current = `${seedImgSig}##${seedRefSig}`;

      if (wheelFromBrowserStorage?.type) setWheelType(wheelFromBrowserStorage.type);
      if (wheelFromBrowserStorage?.title) setWheelTitle(wheelFromBrowserStorage.title);
      if (wheelFromBrowserStorage?.description) setWheelDescription(wheelFromBrowserStorage.description);
      setSegData(localSegData);
      setWheelData(localWheelData);

      const initialMaxLength = calculateMaxLengthOfText(localSegData);
      setMaxlengthOfSegmentText(initialMaxLength);
      setSegTxtfontSize(calculateFontSizeOfText(initialMaxLength, localSegData));
      setPrizeNumber(Math.floor(Math.random() * localSegData.length));
      setData(
        prepareData(
          localSegData,
          localWheelData.segColors,
          initialMaxLength,
          advancedOptions,
          localWheelData.mysteryMode,
          safeImageDataUris
        )
      );
      html.current = segmentsToHTMLTxt(localSegData);
    } else {
      setSegData(newSegments);
      const initialMaxLength = calculateMaxLengthOfText(newSegments);
      setMaxlengthOfSegmentText(initialMaxLength);
      setSegTxtfontSize(calculateFontSizeOfText(initialMaxLength, newSegments));
      setPrizeNumber(Math.floor(Math.random() * newSegments.length));
      setData(
        prepareData(
          newSegments,
          wheelPresetSettings?.segColors || wheelData.segColors,
          initialMaxLength,
          advancedOptions,
          wheelPresetSettings?.mysteryMode ?? wheelData.mysteryMode,
          safeImageDataUris
        )
      );
      html.current = segmentsToHTMLTxt(newSegments);
      if (wheelPresetSettings != null) setWheelData(wheelPresetSettings);
      // Restore quiz mode when loading a wheel from server-side props
      // (e.g. /uwheels/[id] — the localStorage branch handles this above
      // but the newSegments branch previously left wheelType as "basic").
      if (wheelPresetSettings?.type) setWheelType(wheelPresetSettings.type);
      if (wheelTypeProp && wheelTypeProp !== "basic") setWheelType(wheelTypeProp);
      // Sync the SegmentsContext title with the loaded wheel so share modals
      // and decision logs show the real wheel name instead of "New Wheel".
      if (pageWheelTitle) setWheelTitle(pageWheelTitle);
    }
  }, []);

  return {
    mustSpin,
    prizeNumber,
    setPrizeNumber,
    winner,
    setWinner,
    showCelebration,
    setShowCelebration,
    showOverlay,
    segTxtfontSize,
    muted,
    setMuted,
    handleSpinClick,
    handleStopSpinning,
    saveWheelData,
  };
}
