"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

// Font stack constant shared across pre-computation and canvas drawing
const FONT_STACK = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

// Compute readable text + outline colors from the slice background (relative luminance)
function getReadableTextColors(hexColor) {
  try {
    const hex = String(hexColor || "").replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const r = parseInt(full.substring(0, 2), 16) / 255;
    const g = parseInt(full.substring(2, 4), 16) / 255;
    const b = parseInt(full.substring(4, 6), 16) / 255;
    if ([r, g, b].some((v) => Number.isNaN(v))) {
      return { fill: "#ffffff", stroke: "rgba(0,0,0,0.55)" };
    }
    const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    if (lum > 0.45) {
      // Light slice → dark text with soft light halo
      return { fill: "#1e293b", stroke: "rgba(255,255,255,0.75)" };
    }
    // Dark slice → white text with soft dark halo
    return { fill: "#ffffff", stroke: "rgba(0,0,0,0.55)" };
  } catch {
    return { fill: "#ffffff", stroke: "rgba(0,0,0,0.55)" };
  }
}

/**
 * SpinWheelCanvas — Lightweight, zero-dependency, Retina-crisp Canvas Wheel
 *
 * Stage 2 Features:
 * - Zero bundle overhead: 0 external dependencies (no styled-components, no webfontloader).
 * - Retina/HiDPI auto-scaling: scales canvas buffer with window.devicePixelRatio.
 * - Fluid 60fps/120fps physics animation via requestAnimationFrame.
 * - Perimeter chrome pins/pegs along wedge boundaries.
 * - Elastic flapper bounce physics with spring-damper deflection & oscillation.
 * - Physically synchronized audio tick & haptic feedback on peg collisions.
 * - Radial text auto-fitting with high-contrast outlines (legible on any color).
 * - Combined Image Thumbnail + Text label on the same slice.
 */
export default function SpinWheelCanvas({
  mustStartSpinning,
  prizeNumber = 0,
  data = [],
  onStopSpinning,
  backgroundColors = ["#EE4040", "#F0CF50", "#815CD1", "#3DA36E", "#E68C22", "#4185F4"],
  textColors = ["#000000"],
  outerBorderColor = "#ffffff",
  outerBorderWidth = 0,
  innerRadius = 0,
  innerBorderColor = "#ffffff",
  innerBorderWidth = 0,
  radiusLineColor = "transparent",
  radiusLineWidth = 0,
  fontFamily = "sans-serif",
  fontSize = 14,
  fontWeight = "bold",
  textDistance = 65,
  spinDuration = 1.0,
  pointerProps,
  onTick,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null); // Cached 2D context — avoids re-acquisition each frame
  const offscreenCanvasRef = useRef(null); // Cached pre-rendered static wheel bitmap (wedges, text, emoji, images)
  const animFrameRef = useRef(null);

  // Current angle in radians (0 = 3 o'clock)
  const currentAngleRef = useRef(0);
  const isSpinningRef = useRef(false);
  const hasSpunRef = useRef(false);
  const onStopSpinningRef = useRef(onStopSpinning);
  onStopSpinningRef.current = onStopSpinning;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const [containerSize, setContainerSize] = useState(440);

  // Flapper spring physics state
  const flapperAngleRef = useRef(0);
  const flapperVelocityRef = useRef(0);
  const wasInContactRef = useRef(false);
  const lastSoundTickRef = useRef(0);

  // Preloaded image cache for canvas drawing
  const imageCacheRef = useRef(new Map());
  const [imagesLoadedVersion, setImagesLoadedVersion] = useState(0);

  // 1. Measure container size with ResizeObserver for responsive & fullscreen sharp rendering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const minDimension = Math.min(rect.width || 440, rect.height || 440);
      if (minDimension > 0) {
        setContainerSize(Math.floor(minDimension));
      }
    };

    updateSize();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(container);
    } else {
      window.addEventListener("resize", updateSize);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", updateSize);
    };
  }, []);

  // 2. Preload images safely without CORS errors
  useEffect(() => {
    if (!Array.isArray(data)) return;

    data.forEach((item) => {
      const uri = item?.image?.uri || item?.image;
      if (uri && typeof uri === "string" && !imageCacheRef.current.has(uri)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCacheRef.current.set(uri, img);
          setImagesLoadedVersion((v) => v + 1);
        };
        img.onerror = () => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            imageCacheRef.current.set(uri, fallbackImg);
            setImagesLoadedVersion((v) => v + 1);
          };
          fallbackImg.src = uri;
        };
        img.src = uri;
      }
    });
  }, [data]);

  // 3. Compute slice layout (weights, angles, colors, and static uniform font size)
  const sliceLayout = useCallback(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { totalWeight: 1, slices: [], uniformFontSize: fontSize };
    }

    const totalWeight = data.reduce((sum, item) => {
      const w = Number(item?.optionSize);
      return sum + (Number.isFinite(w) && w > 0 ? w : 1);
    }, 0);

    let start = 0;
    const slices = data.map((item, index) => {
      const w = Number(item?.optionSize);
      const weight = Number.isFinite(w) && w > 0 ? w : 1;
      const arc = (weight / totalWeight) * 2 * Math.PI;
      const end = start + arc;
      const mid = start + arc / 2;

      const bg =
        item?.style?.backgroundColor ||
        backgroundColors[index % backgroundColors.length] ||
        "#EE4040";

      // Auto-readable typography: explicit per-slice textColor wins;
      // otherwise derive from slice luminance (ignores stale global "#000000").
      const readable = getReadableTextColors(bg);
      const textColor = item?.style?.textColor || readable.fill;
      const textStrokeColor = item?.style?.textColor
        ? readable.stroke === "rgba(255,255,255,0.75)"
          ? "rgba(255,255,255,0.5)"
          : "rgba(0,0,0,0.5)"
        : readable.stroke;

      const text = item?.option !== undefined ? String(item.option) : "";
      const imageUri = item?.image?.uri || item?.image;

      const sliceInfo = {
        index,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        arc,
        weight,
        bg,
        textColor,
        textStrokeColor,
        text,
        imageUri,
        landscape: !!item?.image?.landscape,
      };

      start = end;
      return sliceInfo;
    });

    // ── Pre-calculate Uniform Auto Font Sizing Once Per Data Change ──
    // Moving this out of the 60fps draw loop ensures ZERO text measurement overhead during spin!
    const padding = 10;
    const radius = Math.max(10, containerSize / 2 - padding);
    const innerRad = (radius * Math.max(0, Math.min(90, innerRadius))) / 100;
    const rimPaddingGlobal = 8;
    const sliceCount = slices.length || 1;

    // Check if the user specified a manual custom font size (>1 from Settings slider)
    const isManualFontSize = typeof fontSize === "number" && fontSize > 1;

    // Base target font size:
    // When manual: respect user-chosen font size (clamped by radius proportion)
    // When auto (default): scale dynamically by slice count (angular space) and wheel radius
    const autoBaseTarget = Math.max(
      9,
      Math.min(
        radius / 7.5,
        (2 * Math.PI * (radius * 0.65)) / (sliceCount * 1.55)
      )
    );

    const targetBaseFontSize = isManualFontSize
      ? Math.max(8, Math.min(radius / 7, fontSize))
      : autoBaseTarget;

    let uniformFontSize = targetBaseFontSize;

    // Use a lightweight off-screen scratch canvas for font measurement
    if (typeof document !== "undefined") {
      const scratch = document.createElement("canvas").getContext("2d");
      if (scratch) {
        scratch.font = `500 100px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
        slices.forEach((slice) => {
          const hasImage = !!(slice.imageUri && imageCacheRef.current.get(slice.imageUri)?.naturalWidth > 0);
          const hasText = !!(slice.text && slice.text.trim().length > 0);
          if (!hasText) return;

          const radialSpan = radius - innerRad;
          let textEndX;
          if (hasImage) {
            const outerRimX = radius - rimPaddingGlobal;
            const availableWedgeWidth = 2 * (outerRimX - 20) * Math.sin(slice.arc / 2);
            const maxImgWidth = Math.min(availableWedgeWidth * 0.88, radialSpan * 0.38, 52);
            const maxImgHeight = Math.min(radialSpan * 0.35, 60);
            const img = imageCacheRef.current.get(slice.imageUri);
            const imgAspect = img ? img.naturalWidth / img.naturalHeight : 1;
            const isLandscape = slice.landscape || imgAspect > 1.15;
            let drawW = Math.min(maxImgWidth, maxImgHeight * imgAspect);
            let drawH = drawW / imgAspect;
            if (!isLandscape && drawH > maxImgHeight) {
              drawH = maxImgHeight;
              drawW = drawH * imgAspect;
            }
            const radialLength = isLandscape ? drawW : drawH;
            textEndX = outerRimX - radialLength - 8;
          } else {
            textEndX = radius - 14;
          }
          const textStartX = innerRad + 12;
          const radialLengthForText = Math.max(15, textEndX - textStartX);

          // 1. Radial constraint: text must not overflow the radial span of the wedge
          const widthAt100 = Math.max(1, scratch.measureText(slice.text).width);
          const radialFit = (radialLengthForText / widthAt100) * 100;

          // 2. Angular constraint: text height/width must fit within the slice's arc width
          const textMidX = (textStartX + textEndX) / 2;
          const wedgeWidthAtText = 2 * textMidX * Math.sin(slice.arc / 2);
          const arcFit = wedgeWidthAtText * 0.75;

          const sliceFit = Math.min(radialFit, arcFit);
          if (sliceFit < uniformFontSize) uniformFontSize = sliceFit;
        });

        // ── Pre-compute Truncated Display Text at Uniform Font Size ──
        // Doing this once per data change eliminates all measureText calls from the 60fps spin loop!
        scratch.font = `500 ${Math.max(8, Math.min(targetBaseFontSize, uniformFontSize))}px ${FONT_STACK}`;
        slices.forEach((slice) => {
          if (!slice.text || !slice.text.trim()) {
            slice.displayText = "";
            return;
          }

          const hasImage = !!(slice.imageUri && imageCacheRef.current.get(slice.imageUri)?.naturalWidth > 0);
          const radialSpan = radius - innerRad;
          let maxTextLength;

          if (hasImage) {
            const outerRimX = radius - rimPaddingGlobal;
            const availableWedgeWidth = 2 * (outerRimX - 20) * Math.sin(slice.arc / 2);
            const maxImgWidth = Math.min(availableWedgeWidth * 0.88, radialSpan * 0.38, 52);
            const maxImgHeight = Math.min(radialSpan * 0.35, 60);
            const img = imageCacheRef.current.get(slice.imageUri);
            const imgAspect = img ? img.naturalWidth / img.naturalHeight : 1;
            const isLandscape = slice.landscape || imgAspect > 1.15;
            let drawW = Math.min(maxImgWidth, maxImgHeight * imgAspect);
            let drawH = drawW / imgAspect;
            if (!isLandscape && drawH > maxImgHeight) {
              drawH = maxImgHeight;
              drawW = drawH * imgAspect;
            }
            const radialLength = isLandscape ? drawW : drawH;
            const textEndX = outerRimX - radialLength - 8;
            const textStartX = innerRad + 12;
            maxTextLength = Math.max(15, textEndX - textStartX);
          } else {
            const textEndX = radius - 14;
            const textStartX = innerRad + 12;
            maxTextLength = Math.max(25, textEndX - textStartX);
          }

          let dt = slice.text;
          if (scratch.measureText(dt).width > maxTextLength) {
            while (dt.length > 2 && scratch.measureText(dt + "..").width > maxTextLength) {
              dt = dt.slice(0, -1);
            }
            dt += "..";
          }
          slice.displayText = dt;
        });
      }
    }
    // Final clamp: maintain readable bounds (minimum 8px, maximum targetBaseFontSize)
    uniformFontSize = Math.max(8, Math.min(targetBaseFontSize, uniformFontSize));

    return { totalWeight, slices, uniformFontSize };
  }, [data, backgroundColors, textColors, containerSize, innerRadius, fontSize, imagesLoadedVersion]);

  // 4. Pre-render Wheel onto an Offscreen Canvas Buffer
  // Rasterizes all slices, text, emojis, image posters, and rings ONCE per data/size update.
  // During the 60fps/120fps spin animation, this pre-rendered buffer is simply rotated
  // and blitted via ctx.drawImage(), eliminating all per-frame text and emoji rasterization!
  const updateOffscreenWheel = useCallback(() => {
    if (typeof document === "undefined") return null;

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
    const size = containerSize;
    const bufferSize = Math.floor(size * dpr);

    let offscreen = offscreenCanvasRef.current;
    if (!offscreen) {
      offscreen = document.createElement("canvas");
      offscreenCanvasRef.current = offscreen;
    }

    if (offscreen.width !== bufferSize || offscreen.height !== bufferSize) {
      offscreen.width = bufferSize;
      offscreen.height = bufferSize;
    }

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return null;

    offCtx.save();
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.clearRect(0, 0, bufferSize, bufferSize);
    offCtx.scale(dpr, dpr);
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";

    const centerX = size / 2;
    const centerY = size / 2;
    const padding = 10;
    const radius = Math.max(10, size / 2 - padding);
    const innerRad = (radius * Math.max(0, Math.min(90, innerRadius))) / 100;

    const { slices, uniformFontSize } = sliceLayout();
    if (slices.length === 0) {
      offCtx.restore();
      return offscreen;
    }

    // A. Draw Wedges (base angle = 0)
    slices.forEach((slice) => {
      offCtx.beginPath();
      offCtx.fillStyle = slice.bg;
      offCtx.arc(centerX, centerY, radius, slice.startAngle, slice.endAngle, false);
      if (innerRad > 0) {
        offCtx.arc(centerX, centerY, innerRad, slice.endAngle, slice.startAngle, true);
      } else {
        offCtx.lineTo(centerX, centerY);
      }
      offCtx.closePath();
      offCtx.fill();

      // Radial separating line
      if (radiusLineWidth > 0 && radiusLineColor !== "transparent") {
        offCtx.lineWidth = radiusLineWidth;
        offCtx.strokeStyle = radiusLineColor;
        offCtx.stroke();
      }
    });

    const rimPaddingGlobal = 8;

    // B. Draw Slice Content (Posters & Text / Emojis)
    slices.forEach((slice) => {
      const sliceMid = slice.midAngle;
      const img = slice.imageUri ? imageCacheRef.current.get(slice.imageUri) : null;
      const hasImage = !!(img && img.naturalWidth > 0);
      const hasText = !!(slice.text && slice.text.trim().length > 0);

      offCtx.save();
      offCtx.translate(centerX, centerY);
      offCtx.rotate(sliceMid);

      const radialSpan = radius - innerRad;
      const rimPadding = rimPaddingGlobal;

      if (hasImage && hasText) {
        const outerRimX = radius - rimPadding;
        const availableWedgeWidth = 2 * (outerRimX - 20) * Math.sin(slice.arc / 2);
        const maxImgWidth = Math.min(availableWedgeWidth * 0.88, radialSpan * 0.38, 52);
        const maxImgHeight = Math.min(radialSpan * 0.35, 60);

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const isLandscape = slice.landscape || imgAspect > 1.15;

        let drawW, drawH, radialLength;
        if (!isLandscape) {
          drawW = Math.min(maxImgWidth, maxImgHeight * imgAspect);
          drawH = drawW / imgAspect;
          if (drawH > maxImgHeight) {
            drawH = maxImgHeight;
            drawW = drawH * imgAspect;
          }
          radialLength = drawH;
        } else {
          drawW = Math.min(maxImgHeight, maxImgWidth * imgAspect);
          drawH = drawW / imgAspect;
          radialLength = drawW;
        }

        const imgDist = outerRimX - radialLength / 2;
        const imgInnerBoundary = outerRimX - radialLength;

        offCtx.save();
        offCtx.translate(imgDist, 0);
        if (!isLandscape) {
          offCtx.rotate(Math.PI / 2);
        }

        if (typeof offCtx.roundRect === "function") {
          offCtx.beginPath();
          offCtx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 4);
          offCtx.clip();
        }
        offCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

        offCtx.beginPath();
        if (typeof offCtx.roundRect === "function") {
          offCtx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 4);
        } else {
          offCtx.rect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
        offCtx.lineWidth = 1;
        offCtx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        offCtx.stroke();
        offCtx.restore();

        const textEndX = imgInnerBoundary - 8;
        offCtx.textAlign = "right";
        offCtx.textBaseline = "middle";
        offCtx.font = `500 ${uniformFontSize}px ${FONT_STACK}`;
        offCtx.fillStyle = slice.textColor;
        offCtx.fillText(slice.displayText ?? slice.text, textEndX, 0);

      } else if (hasImage) {
        const outerRimX = radius - rimPadding;
        const availableWedgeWidth = 2 * (outerRimX - 35) * Math.sin(slice.arc / 2);
        const maxImgWidth = Math.min(availableWedgeWidth * 0.90, radialSpan * 0.65, 75);
        const maxImgHeight = Math.min(radialSpan * 0.62, 90);

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const isLandscape = slice.landscape || imgAspect > 1.15;

        let drawW, drawH, radialLength;
        if (!isLandscape) {
          drawW = Math.min(maxImgWidth, maxImgHeight * imgAspect);
          drawH = drawW / imgAspect;
          if (drawH > maxImgHeight) {
            drawH = maxImgHeight;
            drawW = drawH * imgAspect;
          }
          radialLength = drawH;
        } else {
          drawW = Math.min(maxImgHeight, maxImgWidth * imgAspect);
          drawH = drawW / imgAspect;
          radialLength = drawW;
        }

        const imgDist = outerRimX - radialLength / 2 - 4;

        offCtx.save();
        offCtx.translate(imgDist, 0);
        if (!isLandscape) {
          offCtx.rotate(Math.PI / 2);
        }

        if (typeof offCtx.roundRect === "function") {
          offCtx.beginPath();
          offCtx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 5);
          offCtx.clip();
        }
        offCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

        offCtx.beginPath();
        if (typeof offCtx.roundRect === "function") {
          offCtx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 5);
        } else {
          offCtx.rect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
        offCtx.lineWidth = 1.5;
        offCtx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        offCtx.stroke();
        offCtx.restore();

      } else if (hasText) {
        const textEndX = radius - 14;
        offCtx.textAlign = "right";
        offCtx.textBaseline = "middle";
        offCtx.font = `500 ${uniformFontSize}px ${FONT_STACK}`;
        offCtx.fillStyle = slice.textColor;
        offCtx.fillText(slice.displayText ?? slice.text, textEndX, 0);
      }

      offCtx.restore();
    });

    // C. Outer Ring / Border
    if (outerBorderWidth > 0 && outerBorderColor !== "transparent") {
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, radius - outerBorderWidth / 2, 0, 2 * Math.PI);
      offCtx.lineWidth = outerBorderWidth;
      offCtx.strokeStyle = outerBorderColor;
      offCtx.stroke();
    }

    // D. Inner Ring / Border
    if (innerRad > 0 && innerBorderWidth > 0 && innerBorderColor !== "transparent") {
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, innerRad + innerBorderWidth / 2, 0, 2 * Math.PI);
      offCtx.lineWidth = innerBorderWidth;
      offCtx.strokeStyle = innerBorderColor;
      offCtx.stroke();
    }

    offCtx.restore();
    return offscreen;
  }, [containerSize, sliceLayout, innerRadius, fontSize, fontWeight, fontFamily, outerBorderWidth, outerBorderColor, innerBorderWidth, innerBorderColor, radiusLineWidth, radiusLineColor]);

  // 5. Blit Pre-rendered Wheel + Draw Pointer onto Main Display Canvas (60fps/120fps)
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctxRef.current = ctx;
    }

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
    const size = containerSize;

    // Buffer dimensions
    const bufferSize = Math.floor(size * dpr);
    if (Math.abs(canvas.width - bufferSize) > 1 || Math.abs(canvas.height - bufferSize) > 1) {
      canvas.width = bufferSize;
      canvas.height = bufferSize;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    // Ensure pre-rendered offscreen buffer exists
    let offscreen = offscreenCanvasRef.current;
    if (!offscreen || offscreen.width !== bufferSize || offscreen.height !== bufferSize) {
      offscreen = updateOffscreenWheel();
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bufferSize, bufferSize);

    const centerX = bufferSize / 2;
    const centerY = bufferSize / 2;

    // A. Blit rotated pre-rendered wheel (Ultra-fast GPU texture blit)
    if (offscreen) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngleRef.current);
      ctx.drawImage(offscreen, -centerX, -centerY);
      ctx.restore();
    }

    // B. Draw Native Ticker / Pointer at 3 o'clock (Scale coords to DPR)
    ctx.scale(dpr, dpr);
    const sizeScaled = size;
    const centerScaledX = sizeScaled / 2;
    const centerScaledY = sizeScaled / 2;
    const padding = 10;
    const radius = Math.max(10, sizeScaled / 2 - padding);

    ctx.save();
    ctx.translate(centerScaledX + radius - 2, centerScaledY);
    ctx.rotate((flapperAngleRef.current * Math.PI) / 180);

    // Subtle drop shadow behind pointer
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = -2;
    ctx.shadowOffsetY = 2;

    const pLen = Math.max(18, Math.min(28, radius * 0.12));
    const pHalf = Math.max(6, Math.min(10, radius * 0.045));

    // Sharp pointer
    ctx.beginPath();
    ctx.moveTo(-pLen, 0);
    ctx.lineTo(6, -pHalf);
    ctx.arcTo(10, 0, 6, pHalf, 6);
    ctx.lineTo(-pLen, 0);
    ctx.closePath();

    // Premium metallic red gradient
    const grad = ctx.createLinearGradient(0, -pHalf, 0, pHalf);
    grad.addColorStop(0, "#ff4b4b");
    grad.addColorStop(0.5, "#dc2626");
    grad.addColorStop(1, "#991b1b");
    ctx.fillStyle = grad;
    ctx.fill();

    // Reset shadow for crisp border and center pin
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Center chrome pin/rivet on pointer base
    ctx.beginPath();
    ctx.arc(5, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#475569";
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [containerSize, updateOffscreenWheel]);

  // Invalidate and re-render offscreen cache whenever layout, segments, or size change
  useEffect(() => {
    updateOffscreenWheel();
    drawWheel();
  }, [updateOffscreenWheel, drawWheel]);

  // 6. Spin Physics Loop (requestAnimationFrame) with Elastic Flapper Bounce
  useEffect(() => {
    if (!mustStartSpinning) {
      hasSpunRef.current = false;
      isSpinningRef.current = false;
      return;
    }

    // Strictly guard against duplicate/second spin for the same spin request
    if (hasSpunRef.current || isSpinningRef.current) {
      return;
    }

    hasSpunRef.current = true;
    isSpinningRef.current = true;

    const { slices } = sliceLayout();
    if (slices.length === 0) {
      isSpinningRef.current = false;
      return;
    }

    // Pointer is located at 3 o'clock (0 radians)
    const pointerAngle = 0;

    // Find target slice
    const safePrizeIndex = Math.max(0, Math.min(slices.length - 1, prizeNumber));
    const targetSlice = slices[safePrizeIndex] || slices[0];

    // Compute stopping angle so target slice center aligns under pointer
    const sliceArc = targetSlice.arc;
    const slightRandomOffset = (Math.random() - 0.5) * (sliceArc * 0.5);
    const alignedTarget = pointerAngle - (targetSlice.midAngle + slightRandomOffset);

    // Smooth spin duration: 4.0 - 5.5 seconds
    const totalDurationMs = Math.max(3800, Math.min(6000, (spinDuration || 1) * 4500));
    const extraRotations = 5 + Math.floor(Math.random() * 2);
    const twoPi = 2 * Math.PI;

    // Ensure we always spin forward clockwise
    const currentNorm = ((currentAngleRef.current % twoPi) + twoPi) % twoPi;
    const targetNorm = ((alignedTarget % twoPi) + twoPi) % twoPi;
    let delta = targetNorm - currentNorm;
    if (delta <= 0) delta += twoPi;

    const finalAngle = currentAngleRef.current + extraRotations * twoPi + delta;

    const startAngle = currentAngleRef.current;
    const totalDelta = finalAngle - startAngle;
    const startTime = performance.now();
    let lastFrameTime = startTime;

    // Single continuous natural physics deceleration (quartic ease-out)
    // Starts fast, continuously decelerates, and glides to a stop with ZERO mid-spin pauses or restarts
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);
      const easedProgress = easeOutQuart(progress);

      const newAngle = startAngle + totalDelta * easedProgress;
      currentAngleRef.current = newAngle;

      // ── Flapper Collision & Elastic Bounce (O(1) Math Pin Calculation) ──
      const dt = Math.min(0.033, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      // Check pin closest to pointer in O(1) time without looping over all slices
      const totalSlices = slices.length;
      let minDiff = 999;
      if (totalSlices > 0) {
        const normAngle = ((newAngle % twoPi) + twoPi) % twoPi;
        const pointerRelAngle = ((pointerAngle - normAngle) % twoPi + twoPi) % twoPi;
        const avgArc = twoPi / totalSlices;
        const approxIdx = Math.round(pointerRelAngle / avgArc) % totalSlices;

        // Check only adjacent pins [approxIdx - 1, approxIdx, approxIdx + 1]
        for (let offset = -1; offset <= 1; offset++) {
          const idx = (approxIdx + offset + totalSlices) % totalSlices;
          const pinAngle = (slices[idx].startAngle + newAngle) % twoPi;
          let diff = pinAngle - pointerAngle;
          while (diff > Math.PI) diff -= twoPi;
          while (diff < -Math.PI) diff += twoPi;

          if (Math.abs(diff) < Math.abs(minDiff)) {
            minDiff = diff;
          }
        }
      }

      // Contact zone: pin approaches from [-0.09, 0] rad
      const contactThreshold = 0.09;
      if (minDiff >= -contactThreshold && minDiff <= 0) {
        // Pin is deflecting flapper backwards
        const ratio = 1 - Math.abs(minDiff) / contactThreshold;
        flapperAngleRef.current = -16 * ratio;
        flapperVelocityRef.current = 0;
        wasInContactRef.current = true;
      } else {
        if (wasInContactRef.current) {
          // Just released from pin: snap forward & play synchronized tick!
          wasInContactRef.current = false;
          flapperVelocityRef.current = 26; // snap forward impulse

          const nowMs = performance.now();
          if (nowMs - lastSoundTickRef.current >= 30) {
            lastSoundTickRef.current = nowMs;
            onTickRef.current?.();
          }
        }

        // Damped harmonic oscillator returning flapper to 0
        const springK = 750;
        const damping = 30;
        const force = -springK * flapperAngleRef.current - damping * flapperVelocityRef.current;
        flapperVelocityRef.current += force * dt;
        flapperAngleRef.current += flapperVelocityRef.current * dt;

        if (Math.abs(flapperAngleRef.current) < 0.1 && Math.abs(flapperVelocityRef.current) < 0.5) {
          flapperAngleRef.current = 0;
          flapperVelocityRef.current = 0;
        }
      }

      drawWheel();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        isSpinningRef.current = false;
        currentAngleRef.current = finalAngle % twoPi;
        flapperAngleRef.current = 0;
        flapperVelocityRef.current = 0;
        drawWheel();
        onStopSpinningRef.current?.();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mustStartSpinning, prizeNumber, sliceLayout, spinDuration, drawWheel]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full select-none"
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: "1 / 1",
      }}
    >
      {/* Crisp Canvas with integrated 3 o'clock pointer */}
      <canvas
        ref={canvasRef}
        className="block rounded-full"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        }}
      />
    </div>
  );
}

