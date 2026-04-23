import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import WheelAnalytics from "@models/wheelAnalytics";

const BOT_UA_REGEX =
  /(bot|crawler|spider|crawling|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|discordbot|slackbot|telegrambot|embedly|quora link preview|pinterest|google-structured-data-testing-tool|bingpreview)/i;

function isLikelyBot(ua = "") {
  if (!ua) return true;
  return BOT_UA_REGEX.test(ua);
}

function isPrefetch(headersLike) {
  const purpose = headersLike.get("purpose") || "";
  const xPurpose = headersLike.get("x-purpose") || "";
  const secPurpose = headersLike.get("sec-purpose") || "";
  const nextRouterPrefetch = headersLike.get("next-router-prefetch") || "";

  return (
    purpose.toLowerCase() === "prefetch" ||
    xPurpose.toLowerCase() === "prefetch" ||
    secPurpose.toLowerCase() === "prefetch" ||
    nextRouterPrefetch === "1"
  );
}

export function shouldTrackView(headersLike) {
  const ua = headersLike.get("user-agent") || "";
  return !isLikelyBot(ua) && !isPrefetch(headersLike);
}

async function ensureValidWheelId(wheelId) {
  if (!wheelId || !mongoose.Types.ObjectId.isValid(wheelId)) {
    throw new Error("Invalid wheelId");
  }
}

export async function incrementWheelViewCount(wheelId) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  await WheelAnalytics.findOneAndUpdate(
    { wheel: wheelId },
    {
      $inc: { view_count: 1 },
      $setOnInsert: { spin_count: 0 },
    },
    { upsert: true, new: true }
  );
}

export async function incrementWheelSpinCount(wheelId) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  await WheelAnalytics.findOneAndUpdate(
    { wheel: wheelId },
    {
      $inc: { spin_count: 1 },
      $setOnInsert: { view_count: 0 },
    },
    { upsert: true, new: true }
  );
}

export async function getWheelAnalytics(wheelId) {
  await ensureValidWheelId(wheelId);
  await connectMongoDB();

  const analytics = await WheelAnalytics.findOne({ wheel: wheelId })
    .select("view_count spin_count")
    .lean();

  return {
    view_count: analytics?.view_count || 0,
    spin_count: analytics?.spin_count || 0,
  };
}
