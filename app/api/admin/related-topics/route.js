import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "2000"); // Increased default ceiling
    const page = parseInt(searchParams.get("page") || "1");
    const filter = searchParams.get("filter") || "all"; // all | missing
    const q = searchParams.get("q") || "";
    const sortField = searchParams.get("sort") === "title" ? "title" : "createdAt";

    await connectMongoDB();

    const query = { createdBy: ADMIN_EMAIL };
    if (filter === "missing") {
      query.$or = [
        { relatedTopics: { $exists: false } },
        { relatedTopics: { $size: 0 } },
      ];
    }
    
    if (q) {
      query.title = { $regex: q, $options: "i" };
    }

    // If limit is 0 or negative, fetch all records (for admin simplicity)
    const effectiveLimit = limit > 0 ? limit : 0;

    const wheels = await Wheel.find(query)
      .select("title relatedTopics tags createdAt")
      .sort({ [sortField]: sortField === "title" ? 1 : -1 })
      .skip(effectiveLimit > 0 ? (page - 1) * effectiveLimit : 0)
      .limit(effectiveLimit)
      .lean();

    const count = await Wheel.countDocuments(query);

    return NextResponse.json({
      wheels,
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error("Admin wheels fetch error:", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
