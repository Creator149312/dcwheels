"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const adminCommonID = "gauravsingh9314@gmail.com";
const FALLBACK_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function getSegmentText(segment) {
  if (typeof segment === "string") return segment;
  if (segment && typeof segment === "object") {
    if (typeof segment.text === "string") return segment.text;
    if (typeof segment.option === "string") return segment.option;
  }
  return "Option";
}

function getSegmentColor(segment, index, segColors) {
  if (segment && typeof segment === "object") {
    if (typeof segment.color === "string") return segment.color;
    if (segment.style && typeof segment.style.backgroundColor === "string") {
      return segment.style.backgroundColor;
    }
  }
  if (segColors && segColors.length > 0) {
    return segColors[index % segColors.length];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function drawWheelPreview(canvas, wheel) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is not available");
  }

  const size = canvas.width;
  const isSmallCanvas = size <= 512;
  const center = size / 2;
  const radius = size * 0.45;

  const rawSegments = Array.isArray(wheel?.data) && wheel.data.length > 0 ? wheel.data : ["Option"];
  const segments = rawSegments.slice(0, 24);
  const arcSize = (Math.PI * 2) / segments.length;
  
  const wheelData = wheel?.wheelData || {};
  const segColors = wheelData.segColors || [];

  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, size, size);

  // Math scaling
  const titleFontSize = isSmallCanvas ? 16 : 26;
  const segmentFontSize = isSmallCanvas ? 11 : 14;
  const footerFontSize = isSmallCanvas ? 10 : 14;

  // Wheel segments
  for (let i = 0; i < segments.length; i += 1) {
    const start = -Math.PI / 2 + i * arcSize;
    const end = start + arcSize;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = getSegmentColor(segments[i], i, segColors);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isSmallCanvas ? 1 : 2;
    ctx.stroke();

    const label = getSegmentText(segments[i]).replace(/<[^>]+>/g, "").trim() || "Option";
    const angle = start + arcSize / 2;
    const paddingMultiplier = wheelData?.textDistance || 80;
    const textRadius = radius * (paddingMultiplier / 100) * 0.85; // Adjusted to stay within canvas boundaries effectively
    
    const tx = center + Math.cos(angle) * textRadius;
    const ty = center + Math.sin(angle) * textRadius;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111827";
    ctx.font = `600 ${segmentFontSize}px sans-serif`;
    const maxChars = isSmallCanvas ? 12 : 16;
    const shortLabel = label.length > maxChars ? `${label.slice(0, maxChars - 2)}..` : label;
    ctx.fillText(shortLabel, 0, 0);
    ctx.restore();
  }

  // Draw inner radius (donut hole) or center cap
  const innerRadiusPercent = wheelData?.innerRadius || 0;
  if (innerRadiusPercent > 0) {
    const minInnerPercent = Math.min(innerRadiusPercent, 60);
    const innerRadiusPx = radius * (minInnerPercent / 100);
    ctx.beginPath();
    ctx.arc(center, center, innerRadiusPx, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.lineWidth = isSmallCanvas ? 1 : 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = isSmallCanvas ? 2 : 4;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();
  }

  // Center Text Branding
  if (wheelData?.centerText) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${isSmallCanvas ? 14 : 20}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wheelData.centerText, center, center);
  }

  // Footer with extra padding from top (move further down)
  ctx.fillStyle = "#334155";
  ctx.font = `500 ${footerFontSize}px sans-serif`;
  ctx.textAlign = "center";
  // Add more padding from the bottom (increase value)
  const footerPadding = isSmallCanvas ? 6 : 12; // was 12/24, now 6/12 for more space
  ctx.fillText("spinpapa.com", center, size - footerPadding);
}

async function canvasToBlob(canvas) {
  // To improve sharpness, render at 2x and downscale
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = canvas.width * 2;
  tmpCanvas.height = canvas.height * 2;
  const tmpCtx = tmpCanvas.getContext("2d");
  tmpCtx.scale(2, 2);
  tmpCtx.drawImage(canvas, 0, 0);
  return new Promise((resolve, reject) => {
    tmpCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }
      resolve(blob);
    }, "image/webp", 1.0); // quality 100
  });
}

export default function WheelPreviewGeneratorPage() {
  const { status, data: session } = useSession();
  const hiddenCanvasRef = useRef(null);

  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyWheelId, setBusyWheelId] = useState(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [log, setLog] = useState([]);

  const appendLog = useCallback((line) => {
    setLog((prev) => [line, ...prev].slice(0, 20));
  }, []);

  const isAdmin = session?.user?.email === adminCommonID;

  const fetchMissingPreviewWheels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wheel-preview?limit=4000", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load wheels");
      }
      setWheels(Array.isArray(data.wheels) ? data.wheels : []);
    } catch (error) {
      appendLog(`Load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [appendLog]);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchMissingPreviewWheels();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [fetchMissingPreviewWheels, isAdmin, status]);

  const generatePreviewForWheel = useCallback(
    async (wheel) => {
      if (!hiddenCanvasRef.current) {
        throw new Error("Hidden renderer is not ready");
      }

      setBusyWheelId(wheel._id);

      try {
        drawWheelPreview(hiddenCanvasRef.current, wheel);
        const blob = await canvasToBlob(hiddenCanvasRef.current);

        const form = new FormData();
        form.append("wheelId", wheel._id);
        form.append("file", new File([blob], `${wheel._id}.webp`, { type: "image/webp" }));

        const uploadRes = await fetch("/api/admin/wheel-preview", {
          method: "POST",
          body: form,
        });

        const payload = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(payload?.error || "Upload failed");
        }

        setWheels((prev) => prev.filter((item) => item._id !== wheel._id));
        appendLog(`Generated: ${wheel.title}`);
      } finally {
        setBusyWheelId(null);
      }
    },
    [appendLog]
  );

  const handleGenerateAll = useCallback(async () => {
    if (isBatchRunning || wheels.length === 0) return;

    setIsBatchRunning(true);
    try {
      const listSnapshot = [...wheels];
      for (const wheel of listSnapshot) {
        try {
          await generatePreviewForWheel(wheel);
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          appendLog(`Failed: ${wheel.title} (${error.message})`);
        }
      }
    } finally {
      setIsBatchRunning(false);
    }
  }, [appendLog, generatePreviewForWheel, isBatchRunning, wheels]);

  if (status === "loading") {
    return <div className="p-6">Loading session...</div>;
  }

  if (!isAdmin) {
    return <div className="p-6">Unauthorized.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <canvas ref={hiddenCanvasRef} width={320} height={320} className="hidden" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wheel Preview Generator</h1>
          <p className="text-sm text-gray-500">Generate and store wheel preview images for wheels where wheelPreview is null.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMissingPreviewWheels}
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={isBatchRunning || busyWheelId !== null || wheels.length === 0}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50 text-sm"
          >
            {isBatchRunning ? "Generating..." : "Generate All"}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading wheels...</p>
      ) : wheels.length === 0 ? (
        <p className="text-green-700">No wheels pending preview generation.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Title</th>
                <th className="text-left p-2 border">Created By</th>
                <th className="text-left p-2 border">Segments</th>
                <th className="text-left p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {wheels.map((wheel) => {
                const isBusy = busyWheelId === wheel._id;
                return (
                  <tr key={wheel._id} className="border-t">
                    <td className="p-2 border">{wheel.title}</td>
                    <td className="p-2 border text-xs text-gray-600">{wheel.createdBy}</td>
                    <td className="p-2 border">{Array.isArray(wheel.data) ? wheel.data.length : 0}</td>
                    <td className="p-2 border">
                      <button
                        type="button"
                        disabled={isBusy || isBatchRunning}
                        onClick={async () => {
                          try {
                            await generatePreviewForWheel(wheel);
                          } catch (error) {
                            appendLog(`Failed: ${wheel.title} (${error.message})`);
                          }
                        }}
                        className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                      >
                        {isBusy ? "Generating..." : "Generate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-gray-100 rounded p-3">
          <h2 className="font-semibold mb-2">Recent Activity</h2>
          <ul className="text-sm space-y-1">
            {log.map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
