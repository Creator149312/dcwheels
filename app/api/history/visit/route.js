// app/api/history/visit/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Visit from "@models/visit";
import { sessionUserId } from "@utils/SessionData";
import { getServerSession } from "@node_modules/next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";

export async function POST(req) {
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

    // 4) Optional dedupe (uncomment if you want)
    // const recent = await Visit.findOne({ userId, wheelId: wheelObjectId }).sort({ visitedAt: -1 });
    // if (recent && Date.now() - recent.visitedAt.getTime() < 5 * 60_000) {
    //   return NextResponse.json({ ok: true, deduped: true });
    // }

    // 5) Create visit
    await Visit.create({ userId, wheelId: wheelObjectId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Visit POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
