// GET /api/decisionlog/by-entity?entityType=movie&entityId=550&limit=10
// Returns public DecisionLog entries for a specific content entity,
// sorted newest-first. Powers the "Recent Spins" section on content pages.

import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import User from "@models/user";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const entityType = (searchParams.get("entityType") || "").trim().slice(0, 50);
    const entityId   = (searchParams.get("entityId")   || "").trim().slice(0, 100);
    const limit      = Math.min(20, Math.max(1, Number(searchParams.get("limit") || 10)));

    if (!entityType || !entityId) {
      return NextResponse.json({ spins: [] });
    }

    const rows = await DecisionLog.find({
      entityType,
      entityId,
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("userId result resultImage note wheelTitle entitySlug createdAt")
      .lean();

    if (rows.length === 0) return NextResponse.json({ spins: [] });

    // Resolve display names for all unique user IDs in one query.
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select("name")
          .lean()
      : [];
    const nameById = new Map(users.map((u) => [String(u._id), u.name || "Anonymous"]));

    const spins = rows.map((r) => ({
      id:          String(r._id),
      result:      r.result,
      resultImage: r.resultImage || null,
      note:        r.note       || null,
      wheelTitle:  r.wheelTitle || null,
      entitySlug:  r.entitySlug || null,
      authorName:  nameById.get(String(r.userId)) || "Anonymous",
      createdAt:   r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }));

    return NextResponse.json({ spins });
  } catch (err) {
    console.error("by-entity GET error:", err);
    return NextResponse.json({ spins: [] }, { status: 500 });
  }
}
