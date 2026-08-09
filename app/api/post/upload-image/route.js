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
    let mode;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const dataUrl = body?.dataUrl;
      mode = body?.mode;
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
      mode = formData.get("mode");
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

    const resolvedMode = mode === "poll" ? "poll" : "post";
    const baseId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Post mode: generate 480/780/1080 variants for main post images.
    // Poll mode: generate 240/480 variants for poll option grid images.
    if (resolvedMode === "poll") {
      const [smBuffer, mdBuffer] = await Promise.all([
        sharp(buffer)
          .resize(240, 240, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer(),
        sharp(buffer)
          .resize(480, 480, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer(),
      ]);

      const [smBlob, mdBlob] = await Promise.all([
        put(`posts/${baseId}/poll-sm.webp`, smBuffer, {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/webp",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }),
        put(`posts/${baseId}/poll-md.webp`, mdBuffer, {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/webp",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }),
      ]);

      return NextResponse.json(
        {
          url: mdBlob.url,
          variants: { sm: smBlob.url, md: mdBlob.url },
        },
        { status: 200 }
      );
    }

    const [smBuffer, mdBuffer, lgBuffer] = await Promise.all([
      sharp(buffer)
        .resize(480, 480, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer(),
      sharp(buffer)
        .resize(780, 780, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(buffer)
        .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ]);

    const [smBlob, mdBlob, lgBlob] = await Promise.all([
      put(`posts/${baseId}/sm.webp`, smBuffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
      put(`posts/${baseId}/md.webp`, mdBuffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
      put(`posts/${baseId}/lg.webp`, lgBuffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
    ]);

    return NextResponse.json(
      {
        url: lgBlob.url,
        image: lgBlob.url,
        variants: { sm: smBlob.url, md: mdBlob.url, lg: lgBlob.url },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/post/upload-image error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
