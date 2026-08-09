import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

const ALLOWED_PROTOCOLS = ["http:", "https:"];

function isPrivateUrl(url) {
  const hostname = url.hostname.toLowerCase();
  // Block localhost and common internal/private hostnames
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "127.0.0.1") {
    return true;
  }
  // Block private IP ranges
  const ip = hostname.replace(/\[|\]/g, "");
  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    ip === "0.0.0.0" ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fe80:")
  ) {
    return true;
  }
  return false;
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
    }

    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return NextResponse.json({ message: "Only HTTP/HTTPS URLs are allowed" }, { status: 400 });
    }

    if (isPrivateUrl(parsedUrl)) {
      return NextResponse.json({ message: "Cannot fetch private/internal URLs" }, { status: 400 });
    }

    // Fetch with a strict timeout to avoid hanging the request.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "SpinPapabot/1.0",
        Accept: "text/html",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to fetch the page");
    }

    const html = await response.text();

    const getMeta = (tag) => {
      const match = html.match(tag);
      return match ? match[1] : null;
    };

    // Very basic regex-based scraping
    const meta = {
      url: parsedUrl.toString(),
      title: getMeta(/<meta property="og:title" content="([^"]+)"/i) || getMeta(/<title>([^<]+)<\/title>/i),
      description: getMeta(/<meta property="og:description" content="([^"]+)"/i) || getMeta(/<meta name="description" content="([^"]+)"/i),
      image: getMeta(/<meta property="og:image" content="([^"]+)"/i),
      siteName: getMeta(/<meta property="og:site_name" content="([^"]+)"/i),
    };

    return NextResponse.json(meta);
  } catch (err) {
    console.error("OG Preview error:", err);
    return NextResponse.json({ message: "Failed to fetch preview" }, { status: 500 });
  }
}
