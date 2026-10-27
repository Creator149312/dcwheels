import React from "react";
import { Resend } from "resend";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import MilestoneLog from "@/models/milestoneLog";
import MilestoneNotificationEmail from "@/app/(auth)/email/MilestoneNotificationEmail";
import apiConfig from "@utils/ApiUrlConfig";
import crypto from "crypto";

// Minimalist, high-signal milestone steps:
// - 1 (First interaction ever - huge delight moment for new creators)
// - 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000
const MILESTONE_THRESHOLDS = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Generate a simple HMAC-based unsubscribe token
 * so users can 1-click unsubscribe from email without needing to be logged in.
 */
export function generateUnsubscribeToken(userId, email) {
  const secret = process.env.NEXTAUTH_SECRET || "spinpapa-email-secret-fallback";
  return crypto
    .createHmac("sha256", secret)
    .update(`${String(userId)}:${String(email).toLowerCase()}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId, email, token) {
  const expected = generateUnsubscribeToken(userId, email);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Checks whether an entity's new count has reached or crossed a milestone threshold,
 * and if so, sends a single idempotent notification email.
 *
 * @param {Object} params
 * @param {String|ObjectId} params.userId - Author of the entity
 * @param {String|ObjectId} params.entityId - ID of the wheel, post, or list
 * @param {"wheel"|"post"|"list"} params.entityType
 * @param {"LIKE"|"COMMENT"|"SPIN"} params.milestoneType
 * @param {Number} params.currentCount - The new total count after increment
 * @param {String} params.entityTitle - Display title of the wheel/post/list
 * @param {String} [params.entityUrl] - Relative or absolute link to the entity
 */
export async function checkAndSendMilestoneEmail({
  userId,
  entityId,
  entityType,
  milestoneType,
  currentCount,
  entityTitle,
  entityUrl,
}) {
  if (!userId || !entityId || !currentCount || currentCount < 1) return null;

  // Find the highest threshold that currentCount is currently >= to
  const matchingThresholds = MILESTONE_THRESHOLDS.filter((t) => currentCount >= t);
  if (matchingThresholds.length === 0) return null;

  const threshold = matchingThresholds[matchingThresholds.length - 1];

  try {
    await connectMongoDB();

    // 1. Check if this threshold was already recorded for this entity
    const alreadyLogged = await MilestoneLog.findOne({
      entityId,
      milestoneType,
      threshold,
    }).lean();

    if (alreadyLogged) {
      return null; // Already notified for this milestone
    }

    // 2. Fetch the author to verify email and email notification preferences
    const author = await User.findById(userId)
      .select("email name username emailNotifications")
      .lean();

    if (!author || !author.email) return null;

    // Honor user opt-out preference
    if (author.emailNotifications === false) {
      return null;
    }

    // 3. Atomically record the milestone to prevent race conditions
    // If another concurrent request already inserted it, this will reject via unique index
    try {
      await MilestoneLog.create({
        userId,
        entityId,
        entityType,
        milestoneType,
        threshold,
      });
    } catch (insertErr) {
      if (insertErr.code === 11000) {
        // Duplicate key: another thread sent this milestone
        return null;
      }
      throw insertErr;
    }

    // 4. Send email via Resend
    if (!process.env.EMAIL_API_KEY) {
      console.warn("[MilestoneEmail] Skipping email: EMAIL_API_KEY not configured.");
      return null;
    }

    const resend = new Resend(process.env.EMAIL_API_KEY);
    const token = generateUnsubscribeToken(author._id, author.email);
    const baseUrl = apiConfig.baseUrl || "https://spinpapa.com";

    const fullTargetUrl = entityUrl
      ? entityUrl.startsWith("http")
        ? entityUrl
        : `${baseUrl}${entityUrl.startsWith("/") ? "" : "/"}${entityUrl}`
      : baseUrl;

    const unsubscribeUrl = `${baseUrl}/api/notifications/unsubscribe?uid=${author._id}&token=${token}&email=${encodeURIComponent(author.email)}`;

    const actionWord =
      milestoneType === "LIKE"
        ? threshold === 1 ? "like" : "likes"
        : milestoneType === "COMMENT"
        ? threshold === 1 ? "comment" : "comments"
        : threshold === 1 ? "spin" : "spins";

    const subject =
      threshold === 1
        ? `Your ${entityType} got its first ${actionWord} on Spinpapa!`
        : `🎉 Your ${entityType} hit ${threshold.toLocaleString()} ${actionWord}!`;

    const { error } = await resend.emails.send({
      from: "Spinpapa <onboarding@spinpapa.com>",
      to: [author.email],
      subject,
      react: (
        <MilestoneNotificationEmail
          recipientName={author.name || author.username || "Creator"}
          entityTitle={entityTitle || `Your ${entityType}`}
          entityType={entityType}
          milestoneType={milestoneType}
          count={threshold}
          targetUrl={fullTargetUrl}
          unsubscribeUrl={unsubscribeUrl}
        />
      ),
    });

    if (error) {
      console.error("[MilestoneEmail] Resend error:", error);
      return null;
    }

    return true;
  } catch (err) {
    console.error("[MilestoneEmail] Failed to process milestone:", err);
    return null;
  }
}

/**
 * Fire-and-forget helper: schedules milestone check asynchronously
 * so the API request is never blocked by database queries or email delivery.
 */
export function enqueueMilestoneCheck(params) {
  if (typeof setImmediate === "function") {
    setImmediate(() => {
      checkAndSendMilestoneEmail(params).catch((err) => {
        console.error("[enqueueMilestoneCheck] error:", err);
      });
    });
  } else {
    setTimeout(() => {
      checkAndSendMilestoneEmail(params).catch((err) => {
        console.error("[enqueueMilestoneCheck] error:", err);
      });
    }, 0);
  }
}
