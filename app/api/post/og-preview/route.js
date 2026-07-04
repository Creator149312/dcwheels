import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    // Try to fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SpinPapabot/1.0",
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

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
      url,
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
