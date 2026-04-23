import { put } from "@vercel/blob";
import sharp from "sharp";

// Shared helper for uploading user-supplied images to Vercel Blob storage
// instead of embedding them as base64 inside Mongo documents. Base64 blobs
// in Mongo balloon document size, slow down list reads, and burn Atlas IOPS.
//
// Usage:
//   const { url } = await uploadImageBuffer(buffer, { prefix, filename });
//   const { url } = await uploadDataUrl("data:image/png;base64,....", { prefix });
//
// Returns { url } — a publicly readable CDN URL suitable for <img src>.

const DEFAULT_MAX_DIMENSION = 800;
const DEFAULT_WEBP_QUALITY = 82;

function slugify(value, fallback = "img") {
  const s = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return s || fallback;
}

/**
 * Decode a data: URL into a Buffer. Returns null for non-data inputs.
 */
export function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  if (!dataUrl.startsWith("data:")) return null;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(5, commaIdx); // e.g. "image/png;base64"
  const payload = dataUrl.slice(commaIdx + 1);
  const isBase64 = header.includes(";base64");
  const mime = header.split(";")[0] || "application/octet-stream";
  const buffer = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { buffer, mime };
}

/**
 * Upload a raw buffer as an optimized webp to Vercel Blob.
 */
export async function uploadImageBuffer(
  buffer,
  {
    prefix = "uploads",
    filename = "image",
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_WEBP_QUALITY,
  } = {}
) {
  if (!buffer || !buffer.length) {
    throw new Error("uploadImageBuffer: empty buffer");
  }

  const optimized = await sharp(buffer)
    .resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  const safeName = `${slugify(filename)}-${Date.now()}.webp`;
  const path = `${prefix.replace(/^\/+|\/+$/g, "")}/${safeName}`;

  const uploaded = await put(path, optimized, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: uploaded.url, bytes: optimized.length };
}

/**
 * Convenience: take a data: URL (base64-encoded image from a form), push
 * it to blob storage and return the resulting URL. Returns null if the
 * input isn't a data URL so callers can pass through plain URLs unchanged.
 */
export async function uploadDataUrl(dataUrl, opts = {}) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return uploadImageBuffer(parsed.buffer, opts);
}

/**
 * True if the given string looks like a data URL we should migrate.
 */
export function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}
