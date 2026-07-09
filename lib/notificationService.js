import { connectMongoDB } from "./mongodb";
import Notification from "@/models/notification";

/**
 * Creates a notification in the database.
 * 
 * @param {Object} params
 * @param {String} params.recipientId - ObjectId of the user receiving the notification
 * @param {String} params.senderId - ObjectId of the user doing the action (optional)
 * @param {String} params.type - ENUM: 'LIKE', 'COMMENT', 'REPLY', 'FOLLOW', 'SYSTEM', 'WHEEL_CLONE'
 * @param {String} params.entityId - ID of the entity interacted with
 * @param {String} params.entityModel - 'Post', 'Comment', 'Ask', 'Wheel', 'UserWheel', 'User'
 * @param {String} params.message - The text to display (e.g., "Alex liked your post")
 * @param {String} params.link - The href to redirect the user to (e.g., "/post/123")
 */
export async function createNotification({
  recipientId,
  senderId,
  type,
  entityId,
  entityModel,
  message,
  link
}) {
  try {
    // Don't send a notification to oneself
    if (senderId && String(recipientId) === String(senderId)) {
      return null;
    }

    await connectMongoDB();

    // ── OPTIMIZATION: GROUPING / BUNDLING ────────────────────────────────────
    // For specific high-volume types (LIKE, FOLLOW), we bundle instead of 
    // creating a separate notification if an unread one already exists.
    if ((type === "LIKE" || type === "FOLLOW") && entityId) {
      const existingUnread = await Notification.findOne({
        recipient: recipientId,
        type,
        entityId,
        isRead: false
      }).populate("sender", "name");

      if (existingUnread) {
        // If it's a "LIKE", we update the message to "X and others liked..."
        // Note: This is a simple implementation. In a more complex one, 
        // you'd maintain an array of senderIds in the notification doc.
        let newMessage = message;
        if (type === "LIKE") {
          const senderName = existingUnread.sender?.name || "Someone";
          newMessage = `${senderName} and others liked your ${entityModel?.toLowerCase() || 'post'}`;
        } else if (type === "FOLLOW") {
          const senderName = existingUnread.sender?.name || "Someone";
           newMessage = `${senderName} and others followed you`;
        }

        existingUnread.message = newMessage;
        existingUnread.createdAt = new Date(); // Push to top of feed
        await existingUnread.save();
        return existingUnread;
      }
    }

    const notif = await Notification.create({
      recipient: recipientId,
      sender: senderId || null,
      type,
      entityId: entityId || null,
      entityModel: entityModel || null,
      message,
      link,
    });

    return notif;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Marks notifications as read for a specific user
 * @param {String} recipientId - The user ID
 * @param {String} notificationId - (Optional) specific notification. If omitted, marks all as read.
 */
export async function markAsRead(recipientId, notificationId = null) {
  try {
    await connectMongoDB();
    
    const query = { recipient: recipientId };
    if (notificationId) {
      query._id = notificationId;
    }

    const result = await Notification.updateMany(query, { $set: { isRead: true } });
    return result.modifiedCount;
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return 0;
  }
}

/**
 * Gets the count of unread notifications for a user
 */
export async function getUnreadCount(recipientId) {
  try {
    await connectMongoDB();
    return await Notification.countDocuments({ recipient: recipientId, isRead: false });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}
