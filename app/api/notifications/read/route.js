import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { markAsRead } from "@/lib/notificationService";
import { sessionUserId } from "@/utils/SessionData";

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = body.notificationId || null;

    const modifiedCount = await markAsRead(userId, notificationId);

    return NextResponse.json({ success: true, modifiedCount });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
