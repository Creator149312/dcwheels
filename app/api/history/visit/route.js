// app/api/history/visit/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import Visit from "@models/visit";
import Wheel from "@models/wheel";
import { sessionUserId } from "@utils/SessionData";
import { getServerSession } from "@node_modules/next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

export async function POST(req) {
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/history/visit");
  if (limited) return rateLimitResponse(retryAfter);

  try {
    await connectMongoDB();

    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Resolve user
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = user._id;

    // 3) Parse body
    const body = await req.json();
    const { wheelId } = body ?? {};
    if (!wheelId) {
      return NextResponse.json({ error: "wheelId required" }, { status: 400 });
    }

    // Optional: cast wheelId to ObjectId to avoid type mismatch
    const wheelObjectId = new mongoose.Types.ObjectId(wheelId);

    // 4) Dedupe: skip if same user visited same wheel within last 5 minutes
    const recent = await Visit.findOne({ userId, wheelId: wheelObjectId }).sort({ visitedAt: -1 }).lean();
    if (recent && Date.now() - new Date(recent.visitedAt).getTime() < 5 * 60_000) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    // 5) Create visit record only — view_count is tracked separately via
    //    lib/wheelAnalytics.incrementWheelViewCount (bot-filtered, no auth required)
    await Visit.create({ userId, wheelId: wheelObjectId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Visit POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
