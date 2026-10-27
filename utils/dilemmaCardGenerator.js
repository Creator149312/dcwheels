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
 * Clean and format post content / title into a concise debate headline.
 * Cuts cleanly at word boundaries instead of slicing words mid-character.
 */
function formatDebateTitle(rawText, maxChars = 85) {
  if (!rawText) return "Who Takes The Crown?";
  let text = stripHtml(rawText).replace(/[\r\n]+/g, " ").trim();

  // If text is within limit, return directly
  if (text.length <= maxChars) return text;

  // Truncate at word boundary
  const sub = text.slice(0, maxChars);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > 35) {
    return sub.slice(0, lastSpace).trim() + "…";
  }
  return sub.trim() + "…";
}

/**
 * Canvas text wrapping helper (up to maxLines).
 * Returns an array of lines fitted within maxWidth.
 */
function wrapCanvasText(ctx, text, maxWidth, maxLines = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length === maxLines - 1) {
        // Last allowed line: append remainder and truncate cleanly if needed
        const remainingWords = words.slice(i).join(" ");
        let finalLine = remainingWords;
        while (ctx.measureText(finalLine + "…").width > maxWidth && finalLine.includes(" ")) {
          finalLine = finalLine.slice(0, finalLine.lastIndexOf(" "));
        }
        lines.push(finalLine !== remainingWords ? finalLine + "…" : finalLine);
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Draws an image with object-fit: cover into a given bounding rectangle,
 * properly preserving aspect ratio without distortion or stretching.
 */
function drawImageCover(ctx, img, x, y, width, height) {
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  if (!imgWidth || !imgHeight) return;

  const targetRatio = width / height;
  const imgRatio = imgWidth / imgHeight;

  let sourceWidth = imgWidth;
  let sourceHeight = imgHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (imgRatio > targetRatio) {
    // Image is wider than target area: crop sides
    sourceWidth = imgHeight * targetRatio;
    sourceX = (imgWidth - sourceWidth) / 2;
  } else {
    // Image is taller than target area: crop top/bottom
    sourceHeight = imgWidth / targetRatio;
    sourceY = (imgHeight - sourceHeight) / 2;
  }

  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

/**
 * Draws rounded image or color placeholder
 */
async function drawOptionCard(ctx, { x, y, width, height, option, percentage, isVoted, vsColor, isCompact = false }) {
  ctx.save();

  // Background box
  ctx.fillStyle = "#161d2d";
  roundRect(ctx, x, y, width, height, isCompact ? 18 : 24);
  ctx.fill();

  // If selected/voted option, highlight border
  ctx.strokeStyle = isVoted ? "#6366f1" : "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = isVoted ? (isCompact ? 4 : 5) : 2;
  roundRect(ctx, x, y, width, height, isCompact ? 18 : 24);
  ctx.stroke();

  // Option Image if present
  if (option.image) {
    const img = await loadImageSafe(option.image);
    if (img) {
      ctx.save();
      roundRect(ctx, x, y, width, height, isCompact ? 18 : 24);
      ctx.clip();
      drawImageCover(ctx, img, x, y, width, height);

      // Gradient overlay for contrast
      const gradient = ctx.createLinearGradient(x, y + height * 0.2, x, y + height);
      gradient.addColorStop(0, "rgba(0,0,0,0.05)");
      gradient.addColorStop(0.55, "rgba(0,0,0,0.65)");
      gradient.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
  }

  // Progress percentage fill bar at the bottom
  const barHeight = isCompact ? 10 : 12;
  const barBottomPadding = isCompact ? 18 : 26;
  const fillWidth = Math.max(12, (width * percentage) / 100);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  roundRect(ctx, x + 16, y + height - barBottomPadding, width - 32, barHeight, 6);
  ctx.fill();

  ctx.fillStyle = isVoted ? "#6366f1" : "#38bdf8";
  roundRect(ctx, x + 16, y + height - barBottomPadding, fillWidth - 32 > 0 ? fillWidth - 32 : fillWidth, barHeight, 6);
  ctx.fill();
  ctx.restore();

  // "YOUR VOTE" Badge
  if (isVoted) {
    ctx.save();
    ctx.fillStyle = "#6366f1";
    const badgeW = isCompact ? 100 : 120;
    const badgeH = isCompact ? 26 : 32;
    roundRect(ctx, x + 14, y + 14, badgeW, badgeH, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${isCompact ? 11 : 13}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOUR VOTE", x + 14 + badgeW / 2, y + 14 + badgeH / 2);
    ctx.restore();
  }

  // Percentage Display
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${isCompact ? 36 : 48}px system-ui, -apple-system, sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 12;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${percentage}%`, x + 18, y + height - (isCompact ? 32 : 44));
  ctx.restore();

  // Text title
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${isCompact ? 22 : 26}px system-ui, -apple-system, sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 14;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";

  const cleanText = stripHtml(option.text);
  const maxChars = isCompact ? 24 : 28;
  const truncatedText = cleanText.length > maxChars ? cleanText.slice(0, maxChars - 2) + "…" : cleanText;
  ctx.fillText(truncatedText, x + 18, y + height - (isCompact ? 72 : 98));
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

  // Calculate vote totals and percentages across all valid options (up to 4)
  const isMultiWay = options.length > 2;
  const safeOptions = isMultiWay ? options.slice(0, 4) : options.slice(0, 2);

  // Compute total votes across all options in this dilemma
  const totalVotesAcrossAll = safeOptions.reduce((sum, opt) => {
    const id = opt._id ?? opt.id;
    return sum + (voteCounts[id] || opt.voteCount || 0);
  }, 0);

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
  ctx.fillText(isMultiWay ? "⚡ POP CULTURE SHOWDOWN" : "⚡ POP CULTURE DILEMMA", 48 + 130, (isStory ? 64 : 36) + 24);

  // Top right watermark
  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("SPINPAPA.COM", width - 48, (isStory ? 64 : 36) + 24);
  ctx.restore();

  // Post Question Title (Dynamic 1 or 2 lines with clean word-wrapping)
  ctx.save();
  const titleFontSize = isStory ? 44 : (isMultiWay ? 28 : 32);
  const titleLineHeight = isStory ? 54 : (isMultiWay ? 36 : 40);
  ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cleanTitle = formatDebateTitle(postTitle, isStory ? 90 : (isMultiWay ? 65 : 75));
  const maxTitleWidth = width - 120; // 60px padding on each side
  const titleLines = wrapCanvasText(ctx, cleanTitle, maxTitleWidth, 2);

  const baseTitleY = isStory ? (titleLines.length === 1 ? 195 : 185) : (titleLines.length === 1 ? 108 : 98);
  titleLines.forEach((line, idx) => {
    const lineY = baseTitleY + (idx * titleLineHeight);
    ctx.fillText(line, width / 2, lineY);
  });
  ctx.restore();

  // Find user-selected option or default to first
  const selectedOpt = safeOptions.find((o) => String(o._id ?? o.id) === String(selectedOptionId)) || safeOptions[0];
  const selectedText = selectedOpt?.text || "Option";

  if (isStory) {
    if (isMultiWay) {
      // ── 9:16 Story Layout for 3 or 4 Options (2x2 Grid) ──
      const cols = 2;
      const count = safeOptions.length;
      const cardSize = 440;
      const gapX = 36;
      const gapY = 36;
      const gridWidth = cardSize * cols + gapX; // 916px
      const startX = (width - gridWidth) / 2; // 82px
      const startY = 270;

      for (let i = 0; i < count; i++) {
        const opt = safeOptions[i];
        const id = opt._id ?? opt.id;
        const votes = voteCounts[id] || opt.voteCount || 0;
        const pct = totalVotesAcrossAll > 0 ? Math.round((votes / totalVotesAcrossAll) * 100) : Math.round(100 / count);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardSize + gapX);
        const y = startY + row * (cardSize + gapY);

        await drawOptionCard(ctx, {
          x,
          y,
          width: cardSize,
          height: cardSize,
          option: opt,
          percentage: pct,
          isVoted: String(selectedOptionId) === String(id),
          isCompact: true,
        });
      }

      // Central VS Badge in the center of the 2x2 grid (if 4 options)
      if (count === 4) {
        const centerGridX = width / 2;
        const centerGridY = startY + cardSize + gapY / 2;
        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(centerGridX, centerGridY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 24px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("VS", centerGridX, centerGridY);
        ctx.restore();
      }

      // Verdict callout box
      const calloutWidth = gridWidth;
      ctx.save();
      ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
      roundRect(ctx, startX, 1550, calloutWidth, 125, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 25px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`"I voted ${stripHtml(selectedText)}. What's your verdict?"`, width / 2, 1595);

      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "500 19px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Vote & settle the debate on spinpapa.com`, width / 2, 1636);
      ctx.restore();

      // Footer
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, height - 90);
      ctx.lineTo(startX + calloutWidth, height - 90);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "500 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${totalVotesAcrossAll.toLocaleString()} community votes recorded`, startX, height - 48);

      ctx.textAlign = "right";
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.fillText(postUrl, startX + calloutWidth, height - 48);
      ctx.restore();
    } else {
      // ── 9:16 Story Layout for 2 Options (VS Mode) ──
      const opt0 = safeOptions[0] || { text: "Option A" };
      const opt1 = safeOptions[1] || { text: "Option B" };
      const id0 = opt0._id ?? opt0.id;
      const id1 = opt1._id ?? opt1.id;
      const count0 = voteCounts[id0] || opt0.voteCount || 0;
      const count1 = voteCounts[id1] || opt1.voteCount || 0;
      const total2 = count0 + count1;
      const pct0 = total2 > 0 ? Math.round((count0 / total2) * 100) : 50;
      const pct1 = total2 > 0 ? 100 - pct0 : 50;

      const cardSize = 580; // 580 x 580 true 1:1 square
      const cardX = (width - cardSize) / 2; // 250px centered
      const card0Y = 270;
      const card1Y = 920;

      await drawOptionCard(ctx, {
        x: cardX,
        y: card0Y,
        width: cardSize,
        height: cardSize,
        option: opt0,
        percentage: pct0,
        isVoted: String(selectedOptionId) === String(id0),
      });

      await drawOptionCard(ctx, {
        x: cardX,
        y: card1Y,
        width: cardSize,
        height: cardSize,
        option: opt1,
        percentage: pct1,
        isVoted: String(selectedOptionId) === String(id1),
      });

      // Central VS Badge
      const vsY = (card0Y + cardSize + card1Y) / 2;
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(width / 2, vsY, 52, 0, Math.PI * 2);
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
      ctx.save();
      ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
      roundRect(ctx, cardX, 1550, cardSize, 125, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 25px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`"I voted ${stripHtml(selectedText)}. What's your verdict?"`, width / 2, 1595);

      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "500 19px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Vote & settle the debate on spinpapa.com`, width / 2, 1636);
      ctx.restore();

      // Footer
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX, height - 90);
      ctx.lineTo(cardX + cardSize, height - 90);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "500 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${total2.toLocaleString()} community votes recorded`, cardX, height - 48);

      ctx.textAlign = "right";
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.fillText(postUrl, cardX + cardSize, height - 48);
      ctx.restore();
    }
  } else {
    // ── 16:9 Landscape / Discord / Twitter Layout (1200 x 675) ──
    if (isMultiWay) {
      // 3 or 4 options in 16:9 format: 4 items side-by-side or 3 side-by-side
      const count = safeOptions.length;
      const cardWidth = count === 4 ? 250 : 330;
      const cardHeight = 420;
      const gap = count === 4 ? 16 : 24;
      const totalWidth = count * cardWidth + (count - 1) * gap;
      const startX = (width - totalWidth) / 2;
      const cardY = 160;

      for (let i = 0; i < count; i++) {
        const opt = safeOptions[i];
        const id = opt._id ?? opt.id;
        const votes = voteCounts[id] || opt.voteCount || 0;
        const pct = totalVotesAcrossAll > 0 ? Math.round((votes / totalVotesAcrossAll) * 100) : Math.round(100 / count);
        const x = startX + i * (cardWidth + gap);

        await drawOptionCard(ctx, {
          x,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          option: opt,
          percentage: pct,
          isVoted: String(selectedOptionId) === String(id),
          isCompact: true,
        });
      }

      // Footer
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`"I voted ${stripHtml(selectedText)}. What's your verdict?"`, startX, height - 42);

      ctx.textAlign = "right";
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
      ctx.fillText(postUrl, startX + totalWidth, height - 42);
      ctx.restore();
    } else {
      // 2 options in 16:9 (classic 1v1 VS side-by-side)
      const opt0 = safeOptions[0] || { text: "Option A" };
      const opt1 = safeOptions[1] || { text: "Option B" };
      const id0 = opt0._id ?? opt0.id;
      const id1 = opt1._id ?? opt1.id;
      const count0 = voteCounts[id0] || opt0.voteCount || 0;
      const count1 = voteCounts[id1] || opt1.voteCount || 0;
      const total2 = count0 + count1;
      const pct0 = total2 > 0 ? Math.round((count0 / total2) * 100) : 50;
      const pct1 = total2 > 0 ? 100 - pct0 : 50;

      const cardSize = 400; // 400 x 400 true 1:1 square
      const gap = 48;
      const totalContentWidth = cardSize * 2 + gap; // 848px
      const startX = (width - totalContentWidth) / 2; // 176px centered
      const cardY = 175;

      await drawOptionCard(ctx, {
        x: startX,
        y: cardY,
        width: cardSize,
        height: cardSize,
        option: opt0,
        percentage: pct0,
        isVoted: String(selectedOptionId) === String(id0),
        isCompact: true,
      });

      await drawOptionCard(ctx, {
        x: startX + cardSize + gap,
        y: cardY,
        width: cardSize,
        height: cardSize,
        option: opt1,
        percentage: pct1,
        isVoted: String(selectedOptionId) === String(id1),
        isCompact: true,
      });

      // Central VS Badge
      const vsX = width / 2;
      const vsY = cardY + cardSize / 2;
      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(vsX, vsY, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 24px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VS", vsX, vsY);
      ctx.restore();

      // Footer
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`"I voted ${stripHtml(selectedText)}. What's your verdict?"`, startX, height - 42);

      ctx.textAlign = "right";
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
      ctx.fillText(postUrl, startX + totalContentWidth, height - 42);
      ctx.restore();
    }
  }

  const dataUrl = canvas.toDataURL("image/png", 0.95);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));

  return { dataUrl, blob };
}
