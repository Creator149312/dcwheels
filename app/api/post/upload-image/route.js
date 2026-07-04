import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";
import sharp from "sharp";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB for high-quality posts
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

/**
 * POST /api/post/upload-image
 * Dedicated endpoint for uploading post images (higher resolution than segment images).
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let buffer;
    let mime;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const dataUrl = body?.dataUrl;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
        return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
      }
      if (dataUrl.length > MAX_DATAURL_LENGTH) {
        return NextResponse.json({ error: "Image exceeds 5 MB limit" }, { status: 400 });
      }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      }
      buffer = parsed.buffer;
      mime = parsed.mime;
    } else {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      }
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "Image exceeds 5 MB limit" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      mime = file.type;
    }

    // Optimize for feed: Resize to max 1200px width/height and convert to WebP
    // This allows for much higher quality than the 300x300 segment images.
    const optimized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const blobPath = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

    const uploaded = await put(blobPath, optimized, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: uploaded.url }, { status: 200 });
  } catch (error) {
    console.error("POST /api/post/upload-image error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
