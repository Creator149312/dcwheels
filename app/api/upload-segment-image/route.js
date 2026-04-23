import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
// Base64 is ~4/3 the raw byte size, plus a small header. Cap the raw
// string length so clients can't send gigantic payloads.
const MAX_DATAURL_LENGTH = Math.ceil((MAX_SIZE_BYTES * 4) / 3) + 1024;

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(5, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const mime = (header.split(";")[0] || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) return null;
  try {
    const buffer = header.includes(";base64")
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return { buffer, mime };
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ── JSON path: { dataUrl } ─────────────────────────────────────────────
    // Used by the save-wheel flow so segment images only hit Blob storage
    // when the user actually commits the wheel.
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const dataUrl = body?.dataUrl;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
        return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
      }
      if (dataUrl.length > MAX_DATAURL_LENGTH) {
        return NextResponse.json({ error: "Image exceeds 2 MB limit" }, { status: 400 });
      }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      }

      const originalSize = parsed.buffer.length;
      const compressed = await sharp(parsed.buffer)
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      console.log(
        `[upload-segment-image:dataurl] original=${(originalSize / 1024).toFixed(1)}KB ` +
        `compressed=${(compressed.length / 1024).toFixed(1)}KB ` +
        `ratio=${((1 - compressed.length / originalSize) * 100).toFixed(0)}%`
      );

      const blobPath = `segment-images/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const uploaded = await put(blobPath, compressed, {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({ url: uploaded.url }, { status: 200 });
    }

    // ── Multipart path (legacy) ────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 2 MB limit" }, { status: 400 });
    }

    const originalSize = file.size;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Server-side: resize to max 300px (wheel segments are small) and convert to WebP
    const compressed = await sharp(buffer)
      .resize(300, 300, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    console.log(
      `[upload-segment-image] original=${(originalSize / 1024).toFixed(1)}KB ` +
      `compressed=${(compressed.length / 1024).toFixed(1)}KB ` +
      `ratio=${((1 - compressed.length / originalSize) * 100).toFixed(0)}%`
    );

    const blobPath = `segment-images/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

    const uploaded = await put(blobPath, compressed, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: uploaded.url }, { status: 200 });
  } catch (error) {
    console.error("POST /api/upload-segment-image error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
