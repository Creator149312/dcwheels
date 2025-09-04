import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import ReactionTest from "@models/reactiontest";
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

    const currentUser = session
      ? await User.findOne({ email: session.user.email })
      : null;

    const reactions = await ReactionTest.find({ entityType, entityId }).lean();

    // Aggregate counts per reaction type
    const counts = reactions.reduce((acc, r) => {
      acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
      return acc;
    }, {});

    const reactedByCurrentUser = currentUser
      ? reactions.some(r => r.userId.toString() === currentUser._id.toString())
      : false;

    return NextResponse.json({ counts, reactedByCurrentUser });
  } catch (err) {
    console.error("Error fetching reactions:", err);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
