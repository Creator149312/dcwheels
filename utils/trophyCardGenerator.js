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

export function loadImageSafe(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If CORS failed, try without crossOrigin as fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = src;
    };
    img.src = src;
  });
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
 * Generates a 3:4 social card canvas and returns { dataUrl, blob }
 */
export async function generateTrophyCard({
  winner,
  wheelTitle = "",
  winnerColor = "#6366f1",
}) {
  if (typeof window === "undefined") return null;

  const rawWinner = typeof winner === "string" ? winner : winner?.text || "";
  const winnerText = stripHtml(rawWinner) || "Winner";
  const cleanWheelTitle = stripHtml(wheelTitle) || "SpinWheel Decision";
  const winnerImageUrl = winner?.image || "";

  const width = 1080;
  const height = 1440;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // 1. Dark Modern Background
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  // 2. Dynamic Radial Glow matching slice color
  const glowGradient = ctx.createRadialGradient(
    width / 2,
    height / 2 - 100,
    60,
    width / 2,
    height / 2 - 100,
    680
  );
  glowGradient.addColorStop(0, `${winnerColor}44`);
  glowGradient.addColorStop(0.55, `${winnerColor}14`);
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle border outline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 4;
  roundRect(ctx, 20, 20, width - 40, height - 40, 36);
  ctx.stroke();

  // 3. Header: Brand badge + Title
  ctx.save();
  // Brand Pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundRect(ctx, 60, 60, 210, 56, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎡 SPINPAPA", 60 + 105, 60 + 28);

  // Right Tag: "OFFICIAL RESULT"
  ctx.fillStyle = winnerColor;
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("★ OFFICIAL RESULT", width - 60, 60 + 28);
  ctx.restore();

  // 4. Centerpiece: Winner Image or Icon
  const loadedImg = await loadImageSafe(winnerImageUrl);

  let contentCenterY = height / 2 + 100;
  if (loadedImg) {
    const imgSize = 420;
    const imgX = (width - imgSize) / 2;
    const imgY = 240;

    // Outer glow behind avatar
    ctx.save();
    ctx.shadowColor = winnerColor;
    ctx.shadowBlur = 45;
    ctx.fillStyle = "#1e293b";
    roundRect(ctx, imgX - 6, imgY - 6, imgSize + 12, imgSize + 12, 40);
    ctx.fill();
    ctx.restore();

    // Clip rounded image
    ctx.save();
    roundRect(ctx, imgX, imgY, imgSize, imgSize, 34);
    ctx.clip();
    ctx.drawImage(loadedImg, imgX, imgY, imgSize, imgSize);
    ctx.restore();

    // Border around image
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    roundRect(ctx, imgX, imgY, imgSize, imgSize, 34);
    ctx.stroke();

    contentCenterY = imgY + imgSize + 90;
  } else {
    // No image: Trophy badge
    ctx.save();
    ctx.fillStyle = `${winnerColor}20`;
    ctx.beginPath();
    ctx.arc(width / 2, 430, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = winnerColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.font = "120px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏆", width / 2, 430);
    ctx.restore();

    contentCenterY = 690;
  }

  // 5. Winner Text
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = 68;
  if (winnerText.length > 20) fontSize = 54;
  if (winnerText.length > 35) fontSize = 42;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 20;
  ctx.fillText(winnerText, width / 2, contentCenterY);
  ctx.restore();

  // 6. Subtitle / Wheel Origin
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const displayTitle = cleanWheelTitle.length > 50 ? cleanWheelTitle.slice(0, 48) + "…" : cleanWheelTitle;
  ctx.fillText(`Landed from "${displayTitle}"`, width / 2, contentCenterY + 70);
  ctx.restore();

  // 7. Footer Bar: Watermark + Call to Action
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, height - 100);
  ctx.lineTo(width - 60, height - 100);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "500 20px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Create & spin your own wheels at spinpapa.com", 60, height - 55);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("spinpapa.com", width - 60, height - 55);
  ctx.restore();

  const dataUrl = canvas.toDataURL("image/png", 0.95);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));

  return { dataUrl, blob };
}
