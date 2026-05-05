import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import { sessionUserId } from "@utils/SessionData";

/**
 * /api/user/settings — read + update the currently-authenticated user's
 * privacy/preference flags. Currently exposes only `publicSpins` (whether
 * saved decisions appear in the public per-wheel "Spin Stories" feed); the
 * shape is deliberately flat so future flags can be added without breaking
 * the client.
 *
 * GET returns 401 (not 200 with empty body) for guests so the client UI
 * can clearly differentiate "not logged in" from "logged in, all defaults".
 */
export async function GET() {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId).select("publicSpins").lean();
    return NextResponse.json({
      settings: {
        publicSpins: !!user?.publicSpins,
      },
    });
  } catch (err) {
    console.error("User settings GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Whitelist fields explicitly. Anything not in this set is ignored
    // even if the client sends it — keeps role/email/etc. tamper-proof
    // through this endpoint.
    const update = {};
    if (typeof body.publicSpins === "boolean") {
      update.publicSpins = body.publicSpins;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, select: "publicSpins" }
    ).lean();

    return NextResponse.json({
      settings: {
        publicSpins: !!user?.publicSpins,
      },
    });
  } catch (err) {
    console.error("User settings PATCH error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
