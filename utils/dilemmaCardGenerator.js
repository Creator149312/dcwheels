/**
 * Reusable client-side generator for Dilemma / VS Poll Share Cards
 * Supports:
 * - 9:16 Instagram Story / TikTok (1080 x 1920)
 * - 16:9 Twitter / Reddit / Discord / Landscape (1200 x 675)
 */

import { loadImageSafe, roundRect } from "./trophyCardGenerator";

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
 * Draws rounded image or color placeholder
 */
async function drawOptionCard(ctx, { x, y, width, height, option, percentage, isVoted, vsColor }) {
  ctx.save();

  // Background box
  ctx.fillStyle = "#161d2d";
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();

  // If selected/voted option, highlight border
  ctx.strokeStyle = isVoted ? "#6366f1" : "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = isVoted ? 5 : 2;
  roundRect(ctx, x, y, width, height, 24);
  ctx.stroke();

  // Option Image if present
  if (option.image) {
    const img = await loadImageSafe(option.image);
    if (img) {
      ctx.save();
      roundRect(ctx, x, y, width, height, 24);
      ctx.clip();
      ctx.drawImage(img, x, y, width, height);

      // Gradient overlay for contrast
      const gradient = ctx.createLinearGradient(x, y + height * 0.3, x, y + height);
      gradient.addColorStop(0, "rgba(0,0,0,0.1)");
      gradient.addColorStop(0.7, "rgba(0,0,0,0.75)");
      gradient.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
  }

  // Progress percentage fill bar at the bottom
  const barHeight = 12;
  const fillWidth = Math.max(12, (width * percentage) / 100);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  roundRect(ctx, x + 16, y + height - 28, width - 32, barHeight, 6);
  ctx.fill();

  ctx.fillStyle = isVoted ? "#6366f1" : "#38bdf8";
  roundRect(ctx, x + 16, y + height - 28, fillWidth - 32 > 0 ? fillWidth - 32 : fillWidth, barHeight, 6);
  ctx.fill();
  ctx.restore();

  // "YOUR VOTE" Badge
  if (isVoted) {
    ctx.save();
    ctx.fillStyle = "#6366f1";
    roundRect(ctx, x + 16, y + 16, 120, 32, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOUR VOTE", x + 16 + 60, y + 16 + 16);
    ctx.restore();
  }

  // Percentage Display
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 12;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${percentage}%`, x + 20, y + height - 38);
  ctx.restore();

  // Text title
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 14;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";

  const cleanText = stripHtml(option.text);
  const truncatedText = cleanText.length > 28 ? cleanText.slice(0, 26) + "…" : cleanText;
  ctx.fillText(truncatedText, x + 20, y + height - 92);
  ctx.restore();

  ctx.restore();
}

/**
 * Generate Dilemma Share Card (supports 9:16 story and 16:9 feed)
 */
export async function generateDilemmaCard({
  postTitle = "",
  options = [],
  voteCounts = {},
  selectedOptionId = null,
  postUrl = "spinpapa.com",
  format = "story", // "story" (9:16) or "landscape" (16:9)
}) {
  if (typeof window === "undefined") return null;

  const isStory = format === "story";
  const width = isStory ? 1080 : 1200;
  const height = isStory ? 1920 : 675;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Dark Modern Background with gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#080c14");
  bgGrad.addColorStop(0.5, "#0d1322");
  bgGrad.addColorStop(1, "#070a10");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle border outline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 4;
  roundRect(ctx, 16, 16, width - 32, height - 32, 32);
  ctx.stroke();

  // Calculate vote totals and percentages
  const safeOptions = options.slice(0, 2); // Best formatted for 2-way VS dilemmas
  const opt0 = safeOptions[0] || { text: "Option A" };
  const opt1 = safeOptions[1] || { text: "Option B" };
  const id0 = opt0._id ?? opt0.id;
  const id1 = opt1._id ?? opt1.id;

  const count0 = voteCounts[id0] || opt0.voteCount || 0;
  const count1 = voteCounts[id1] || opt1.voteCount || 0;
  const total = count0 + count1;
  const pct0 = total > 0 ? Math.round((count0 / total) * 100) : 50;
  const pct1 = total > 0 ? 100 - pct0 : 50;

  // Header: Brand & Title
  ctx.save();
  // Brand Pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundRect(ctx, 48, isStory ? 64 : 36, 260, 48, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡ POP CULTURE DILEMMA", 48 + 130, (isStory ? 64 : 36) + 24);

  // Top right watermark
  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("SPINPAPA.COM", width - 48, (isStory ? 64 : 36) + 24);
  ctx.restore();

  // Post Question Title
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${isStory ? 48 : 34}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cleanTitle = stripHtml(postTitle) || "Who Takes The Crown?";
  const displayTitle = cleanTitle.length > 55 ? cleanTitle.slice(0, 52) + "…" : cleanTitle;
  ctx.fillText(displayTitle, width / 2, isStory ? 200 : 120);
  ctx.restore();

  if (isStory) {
    // ── 9:16 Story Layout (Stacked cards with central VS) ──
    const cardWidth = width - 96;
    const cardHeight = 520;
    const card0Y = 320;
    const card1Y = 960;

    await drawOptionCard(ctx, {
      x: 48,
      y: card0Y,
      width: cardWidth,
      height: cardHeight,
      option: opt0,
      percentage: pct0,
      isVoted: String(selectedOptionId) === String(id0),
    });

    await drawOptionCard(ctx, {
      x: 48,
      y: card1Y,
      width: cardWidth,
      height: cardHeight,
      option: opt1,
      percentage: pct1,
      isVoted: String(selectedOptionId) === String(id1),
    });

    // Central VS Badge
    const vsY = (card0Y + cardHeight + card1Y) / 2;
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(width / 2, vsY, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", width / 2, vsY);
    ctx.restore();

    // Verdict callout box
    const selectedText = String(selectedOptionId) === String(id1) ? opt1.text : opt0.text;
    ctx.save();
    ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
    roundRect(ctx, 48, 1560, width - 96, 120, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`"I voted ${stripHtml(selectedText)}. What's your verdict?"`, width / 2, 1605);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "500 20px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Vote & settle the debate on spinpapa.com`, width / 2, 1645);
    ctx.restore();

    // Footer
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, height - 90);
    ctx.lineTo(width - 48, height - 90);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "500 20px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${total.toLocaleString()} community votes recorded`, 48, height - 48);

    ctx.textAlign = "right";
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(postUrl, width - 48, height - 48);
    ctx.restore();
  } else {
    // ── 16:9 Landscape / Discord / Twitter Layout (Side by side) ──
    const gap = 36;
    const cardWidth = (width - 96 - gap) / 2;
    const cardHeight = 400;
    const cardY = 175;

    await drawOptionCard(ctx, {
      x: 48,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      option: opt0,
      percentage: pct0,
      isVoted: String(selectedOptionId) === String(id0),
    });

    await drawOptionCard(ctx, {
      x: 48 + cardWidth + gap,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      option: opt1,
      percentage: pct1,
      isVoted: String(selectedOptionId) === String(id1),
    });

    // Central VS Badge
    const vsX = width / 2;
    const vsY = cardY + cardHeight / 2;
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(vsX, vsY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", vsX, vsY);
    ctx.restore();

    // Footer
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`"I voted ${stripHtml(String(selectedOptionId) === String(id1) ? opt1.text : opt0.text)}. What's your verdict?"`, 48, height - 42);

    ctx.textAlign = "right";
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(postUrl, width - 48, height - 42);
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL("image/png", 0.95);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));

  return { dataUrl, blob };
}
