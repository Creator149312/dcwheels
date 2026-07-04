import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Reaction from "@models/reaction";
import User from "@models/user";

export async function GET(req) {
  try {
    await connectMongoDB();
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing entityType or entityId" },
        { status: 400 }
      );
    }

    // Cast entityId so the aggregation match hits the compound index on
    // { entityType, entityId, reactionType } — a string would force Mongo
    // to scan every doc to coerce types.
    let entityIdCast;
    try {
      entityIdCast = new mongoose.Types.ObjectId(entityId);
    } catch {
      return NextResponse.json({ counts: {}, reactedByCurrentUser: false });
    }

    // Resolve the user id (if any) in parallel with the counts aggregation.
    const currentUserPromise = session?.user?.email
      ? User.findOne({ email: session.user.email }).select("_id").lean()
      : Promise.resolve(null);

    // Previously this route did `Reaction.find(...).lean()` to load every
    // reaction doc, then reduced in JS. For a wheel with 10k likes that's
    // 10k docs + network round-trip per page view. The aggregation below
    // returns one tiny row per reactionType instead and is covered by the
    // { entityType, entityId, reactionType } index.
    const countsPromise = Reaction.aggregate([
      { $match: { entityType, entityId: entityIdCast } },
      { $group: { _id: "$reactionType", count: { $sum: 1 } } },
    ]);

    const [currentUser, countsRows] = await Promise.all([
      currentUserPromise,
      countsPromise,
    ]);

    const counts = countsRows.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    // Separate tiny query — exists? — instead of scanning every reaction.
    let reactedByCurrentUser = false;
    if (currentUser?._id) {
      const mine = await Reaction.exists({
        userId: currentUser._id,
        entityType,
        entityId: entityIdCast,
      });
      reactedByCurrentUser = Boolean(mine);
    }

    return NextResponse.json({ counts, reactedByCurrentUser });
  } catch (err) {
    console.error("Error fetching reactions:", err);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
