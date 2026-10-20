/**
 * Reusable client-side generator for 3:4 viral trophy share cards (1080 x 1440)
 */

/**
 * Reusable client-side generator for 3:4 viral trophy share cards (1080 x 1440)
 */

function stripHtml(value) {
  if (!value) return "";
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = value;
    return div.textContent?.trim() || "";
  }
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Robust image loader that avoids canvas tainting (DOMException: The operation is insecure)
 * Uses fetch blob whenever possible so crossOrigin issues don't taint the canvas.
 */
export async function loadImageSafe(src) {
  if (!src || typeof src !== "string") return null;

  // 1. Data URLs can be loaded directly without CORS taint
  if (src.startsWith("data:")) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // 2. For remote URLs, try fetching as a blob first to guarantee a clean object URL (never taints canvas)
  try {
    const res = await fetch(src, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        };
        img.src = blobUrl;
      });
    }
  } catch {
    // If direct fetch fails (e.g. host blocks CORS), attempt standard Image with anonymous crossOrigin
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Do NOT load without crossOrigin as fallback, because canvas.toDataURL() will throw an uncatchable security error
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Extracts image URL from any winner format (plain string, object, uri, or HTML img tag)
 */
function extractWinnerImage(winner) {
  if (!winner) return "";
  if (typeof winner.image === "string" && winner.image.trim()) {
    return winner.image.trim();
  }
  if (winner.image && typeof winner.image.uri === "string") {
    return winner.image.uri.trim();
  }
  const rawText = typeof winner === "string" ? winner : winner.text || winner.option || "";
  if (typeof rawText === "string" && rawText.includes("<img")) {
    const match = /src=["']([^"']+)["']/.exec(rawText);
    if (match?.[1]) return match[1];
  }
  return "";
}

/**
 * Draws an elegant vector trophy directly using Canvas paths
 */
function drawVectorTrophy(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer glow aura
  const aura = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 1.1);
  aura.addColorStop(0, `${color}55`);
  aura.addColorStop(0.5, `${color}18`);
  aura.addColorStop(1, "transparent");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Circle backing
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Draw Trophy Cup with rich metallic gradients
  const goldGrad = ctx.createLinearGradient(-size * 0.4, -size * 0.4, size * 0.4, size * 0.4);
  goldGrad.addColorStop(0, "#fef08a"); // Bright gold highlight
  goldGrad.addColorStop(0.4, "#eab308"); // Warm gold
  goldGrad.addColorStop(1, "#ca8a04"); // Deep gold shadow

  ctx.fillStyle = goldGrad;
  ctx.strokeStyle = "#fef9c3";
  ctx.lineWidth = 2.5;

  const s = size * 0.009; // scale factor

  // Cup Bowl
  ctx.beginPath();
  ctx.moveTo(-45 * s, -45 * s);
  ctx.lineTo(45 * s, -45 * s);
  ctx.quadraticCurveTo(42 * s, 10 * s, 0, 18 * s);
  ctx.quadraticCurveTo(-42 * s, 10 * s, -45 * s, -45 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Handles (Left & Right)
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = goldGrad;
  // Left handle
  ctx.beginPath();
  ctx.arc(-42 * s, -22 * s, 16 * s, Math.PI * 0.5, Math.PI * 1.6);
  ctx.stroke();
  // Right handle
  ctx.beginPath();
  ctx.arc(42 * s, -22 * s, 16 * s, -Math.PI * 0.6, Math.PI * 0.5);
  ctx.stroke();

  // Stem
  ctx.fillStyle = goldGrad;
  ctx.fillRect(-8 * s, 16 * s, 16 * s, 22 * s);

  // Base
  ctx.beginPath();
  ctx.moveTo(-28 * s, 38 * s);
  ctx.lineTo(28 * s, 38 * s);
  ctx.lineTo(34 * s, 48 * s);
  ctx.lineTo(-34 * s, 48 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Star in the center of the cup
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -18 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws an image with object-fit: cover into a given bounding rectangle
 */
function drawImageCover(ctx, img, x, y, width, height) {
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  if (!imgWidth || !imgHeight) return;

  const imgRatio = imgWidth / imgHeight;
  const targetRatio = width / height;

  let sx = 0;
  let sy = 0;
  let sWidth = imgWidth;
  let sHeight = imgHeight;

  if (imgRatio > targetRatio) {
    sWidth = imgHeight * targetRatio;
    sx = (imgWidth - sWidth) / 2;
  } else {
    sHeight = imgWidth / targetRatio;
    sy = (imgHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a sleek, horizontal Ticket Badge (880 x 360, under 65KB).
 * Side-by-side layout: visual token on left, punchy result details on right.
 * Perfect for Discord, WhatsApp previews, Twitter, and native share.
 */
export async function generateTrophyCard({
  winner,
  wheelTitle = "",
  winnerColor = "#6366f1",
  totalSegments = 0,
}) {
  if (typeof window === "undefined") return null;

  const rawWinner = typeof winner === "string" ? winner : winner?.text || winner?.option || "";
  const winnerText = stripHtml(rawWinner) || "Winner";
  const cleanWheelTitle = stripHtml(wheelTitle) || "SpinWheel Decision";
  const winnerImageUrl = extractWinnerImage(winner);

  // 880 x 360 Horizontal Ticket Format (~2.44:1)
  const width = 880;
  const height = 360;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // 1. Dark Modern Background with subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0b0f19");
  bgGrad.addColorStop(0.5, "#101726");
  bgGrad.addColorStop(1, "#070a12");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Left Side: Visual Token Frame (up to 250 x 250 max, adapts to natural aspect ratio)
  const loadedImg = await loadImageSafe(winnerImageUrl);
  const maxTokenW = 250;
  const maxTokenH = 250;
  const zoneLeft = 36;
  const zoneWidth = maxTokenW;

  if (loadedImg) {
    const naturalW = loadedImg.naturalWidth || loadedImg.width || 1;
    const naturalH = loadedImg.naturalHeight || loadedImg.height || 1;
    const imgRatio = naturalW / naturalH;

    let targetW = maxTokenW;
    let targetH = maxTokenH;

    if (imgRatio < 1) {
      // Portrait / Poster (e.g. 2:3 movie poster)
      targetH = maxTokenH;
      targetW = Math.round(targetH * imgRatio);
      if (targetW < 140) targetW = 140;
    } else if (imgRatio > 1) {
      // Landscape (e.g. 16:9 wallpaper / game screenshot)
      targetW = maxTokenW;
      targetH = Math.round(targetW / imgRatio);
      if (targetH < 140) targetH = 140;
    } else {
      targetW = maxTokenW;
      targetH = maxTokenH;
    }

    // Center within the left token zone
    const tokenX = Math.round(zoneLeft + (zoneWidth - targetW) / 2);
    const tokenY = Math.round((height - targetH) / 2);
    const cornerRadius = 16;

    // Natural aspect ratio image render (clean, no extra outer gloss or colored glow)
    ctx.save();
    roundRect(ctx, tokenX, tokenY, targetW, targetH, cornerRadius);
    ctx.clip();
    drawImageCover(ctx, loadedImg, tokenX, tokenY, targetW, targetH);
    ctx.restore();

    // Clean, crisp subtle outline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, tokenX, tokenY, targetW, targetH, cornerRadius);
    ctx.stroke();
  } else {
    const tokenSize = 250;
    const tokenX = zoneLeft;
    const tokenY = (height - tokenSize) / 2;
    const cornerRadius = 16;

    // Clean vector trophy container
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    roundRect(ctx, tokenX, tokenY, tokenSize, tokenSize, cornerRadius);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, tokenX, tokenY, tokenSize, tokenSize, cornerRadius);
    ctx.stroke();

    // Glowing vector trophy inside box
    drawVectorTrophy(ctx, tokenX + tokenSize / 2, tokenY + tokenSize / 2, 130, winnerColor);
  }

  // 3. Subtle Ticket Perforation Line separating Left & Right
  const perfX = 318;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(perfX, 26);
  ctx.lineTo(perfX, height - 26);
  ctx.stroke();
  ctx.restore();

  // 4. Right Side: Content Area
  const contentX = 350;
  const contentMaxW = width - contentX - 40; // ~490px

  // Top Bar: Wheel Origin / Pill + Verified Badge
  ctx.save();
  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("🎡 SPINPAPA RESULT", contentX, 42);

  // Right Top Tag: Odds or Spin verified
  const poolCount = totalSegments > 1 ? totalSegments : 0;
  const oddsText = poolCount > 0 ? `1 IN ${poolCount} ODDS` : "VERIFIED SPIN";
  ctx.fillStyle = winnerColor;
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`★ ${oddsText}`, width - 40, 42);
  ctx.restore();

  // Primary Winner Headline
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let fontSize = 42;
  if (winnerText.length > 18) fontSize = 34;
  if (winnerText.length > 28) fontSize = 28;
  if (winnerText.length > 40) fontSize = 23;

  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;

  const winnerY = 125;
  // If text is very long, wrap nicely
  if (winnerText.length > 34) {
    const half = Math.floor(winnerText.length / 2);
    const spaceIdx = winnerText.indexOf(" ", half - 5);
    if (spaceIdx > 0 && spaceIdx < half + 10) {
      const line1 = winnerText.slice(0, spaceIdx).trim();
      const line2 = winnerText.slice(spaceIdx).trim();
      ctx.fillText(line1, contentX, winnerY - fontSize * 0.55);
      ctx.fillText(line2, contentX, winnerY + fontSize * 0.55);
    } else {
      ctx.fillText(winnerText.slice(0, 34) + "…", contentX, winnerY);
    }
  } else {
    ctx.fillText(winnerText, contentX, winnerY);
  }
  ctx.restore();

  // Origin Wheel Subtitle
  ctx.save();
  const displayTitle = cleanWheelTitle.length > 42 ? cleanWheelTitle.slice(0, 40) + "…" : cleanWheelTitle;
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "500 17px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Landed from "${displayTitle}"`, contentX, 195);
  ctx.restore();

  // Ticket Callout Pill: "What would your wheel pick?"
  ctx.save();
  const pillY = 235;
  const pillH = 46;
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  roundRect(ctx, contentX, pillY, contentMaxW, pillH, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, contentX, pillY, contentMaxW, pillH, 12);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 15px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`"Fate made the call. What would you get?"`, contentX + 16, pillY + pillH / 2);

  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`spinpapa.com →`, contentX + contentMaxW - 16, pillY + pillH / 2);
  ctx.restore();

  // Footer rule + tiny branding
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("Official Spinpapa Decision Pass", contentX, height - 20);

  ctx.textAlign = "right";
  ctx.fillText("spinpapa.com", width - 40, height - 20);
  ctx.restore();

  // Output as high-quality WebP (<65KB)
  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/webp", 0.92);
  } catch {
    dataUrl = canvas.toDataURL("image/png", 0.92);
  }

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else canvas.toBlob(resolve, "image/png", 0.92);
    }, "image/webp", 0.92);
  });

  return { dataUrl, blob };
}
