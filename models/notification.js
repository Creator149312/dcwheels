import mongoose, { Schema, models } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    sender: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: false 
    },
    type: { 
      type: String, 
      enum: ["LIKE", "COMMENT", "REPLY", "FOLLOW", "SYSTEM", "WHEEL_CLONE"], 
      required: true 
    },
    entityId: { 
      type: Schema.Types.ObjectId, 
      required: false 
    },
    entityModel: { 
      type: String, 
      enum: ["Post", "Comment", "Ask", "Wheel", "User", "UserWheel", "DecisionLog"],
      required: false 
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    message: { 
      type: String, 
      required: true 
    },
    link: { 
      type: String, 
      required: true 
    },
    // OPTIMIZATION: Auto-Cleanup (TTL)
    // Marks document for deletion 30 days after creation.
    // In a real prod environment, you might only want to expire 'isRead' notifications,
    // but a global 30-day retention is standard for social notifications.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expires: 0 }
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for fast unread counts and queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
