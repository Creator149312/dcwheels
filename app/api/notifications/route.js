import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongodb";
import Notification from "@/models/notification";
import { sessionUserId } from "@/utils/SessionData";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    // Get latest 20 notifications
    let notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("sender", "name avatar")
      .lean();

    // ── DYNAMIC MESSAGE REGENERATION ─────────────────────────────────────────
    // If count > 1, we rewrite the message for better UX
    notifications = notifications.map(notif => {
      if (notif.count > 1 && notif.sender) {
        const othersCount = notif.count - 1;
        const senderName = notif.sender.name || "Someone";
        
        if (notif.type === "LIKE") {
          notif.message = `${senderName} and ${othersCount} others liked your content`;
        } else if (notif.type === "FOLLOW") {
          notif.message = `${senderName} and ${othersCount} others followed you`;
        }
      }
      return notif;
    });

    return NextResponse.json({ unreadCount, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE read notifications for the authenticated user.
// This keeps unread notifications untouched and only removes ones already seen.
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { deletedCount } = await Notification.deleteMany({
      recipient: userId,
      isRead: true,
    });

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
