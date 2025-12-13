import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";

export async function GET(req) {
  await connectMongoDB();

  try {
    const { searchParams } = new URL(req.url);

    // ✅ Pagination params
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // ✅ Fetch all wheels (public)
    const wheels = await Page.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ Format response
    const formatted = wheels.map((wheel) => ({
      _id: wheel._id.toString(),
      title: wheel.title,
      slug: wheel.slug,
      createdAt: wheel.createdAt,
      updatedAt: wheel.updatedAt,
    }));

    return NextResponse.json({ wheels: formatted }, { status: 200 });
  } catch (err) {
    console.error("GET /api/wheel/all error:", err);
    return NextResponse.json(
      { error: "Failed to fetch wheels", details: err.message },
      { status: 500 }
    );
  }
}
