import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;     // max 30 requests per IP per minute

function rateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > WINDOW_MS) {
    // reset window
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }

  rateLimitMap.set(ip, entry);
  return entry.count <= MAX_REQUESTS;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  // Rate limiting check
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { suggestions: [], error: "Too many requests, please slow down." },
      { status: 429 }
    );
  }

  // Validate query length
  if (!query || query.length < 3) {
    return NextResponse.json(
      { suggestions: [], error: "Query must be at least 3 characters." },
      { status: 400 }
    );
  }

  await connectMongoDB();

  try {
    const matches = await Wheel.find({
      title: { $regex: new RegExp(query, "i") },
    })
      .limit(5)
      .select("_id title");

    return NextResponse.json(
      { suggestions: matches, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error("Suggest error:", error);
    return NextResponse.json(
      { suggestions: [], error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
