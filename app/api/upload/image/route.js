import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { uploadImageBuffer, uploadDataUrl } from "@lib/uploads";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB hard cap on raw upload input.

/**
 * POST /api/upload/image
 *
 * Accepts either:
 *   - multipart/form-data with field `file` (File)
 *   - application/json with { dataUrl: "data:image/...;base64,..." }
 *
 * Returns: { url }
 *
 * Auth: any logged-in user. Images are stored under `user-uploads/<userId>/`
 * so it's trivial to audit or rate-limit per user later.
 */
export async function POST(req) {
  // IP-level guardrail in addition to the per-session auth check — protects
  // against compromised-token flooding and keeps blob egress bills bounded.
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/upload/image");
  if (limited) return rateLimitResponse(retryAfter);

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = `user-uploads/${userId}`;
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large" },
          { status: 413 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadImageBuffer(buf, {
        prefix,
        filename: file.name || "upload",
      });
      return NextResponse.json({ url }, { status: 200 });
    }

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const dataUrl = body?.dataUrl;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
        return NextResponse.json(
          { error: "dataUrl is required" },
          { status: 400 }
        );
      }
      // Rough ceiling on base64 payload — 4/3 overhead vs raw bytes.
      if (dataUrl.length > (MAX_BYTES * 4) / 3 + 1024) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413 }
        );
      }
      const result = await uploadDataUrl(dataUrl, { prefix });
      if (!result) {
        return NextResponse.json(
          { error: "Invalid data URL" },
          { status: 400 }
        );
      }
      return NextResponse.json({ url: result.url }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Unsupported content-type" },
      { status: 415 }
    );
  } catch (error) {
    console.error("POST /api/upload/image error:", error?.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
