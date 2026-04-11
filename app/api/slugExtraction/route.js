import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page"; // adjust path to your Page model

export async function GET(request) {
  try {
    // Ensure DB connection
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    // Query only slug field
    const pages = await Page.find({}, "slug")
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(pages || []);
  } catch (error) {
    console.error("Error fetching slugs:", error);
    return NextResponse.json({ error: "Failed to fetch slugs" }, { status: 500 });
  }
}
