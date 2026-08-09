import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import { connectMongoDB } from "@lib/mongodb";
import mongoose from "mongoose";

export const sessionData = async () => {
  return await getServerSession(authOptions);
};

export const sessionUserId = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  // Fast path: JWT already contains the MongoDB _id (set after login)
  if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
    return session.user.id;
  }

  // Slow path: older sessions without the id claim — look up by email
  if (!session.user.email) return null;
  console.warn("[sessionUserId] slow path hit for email:", session.user.email);
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email.toLowerCase() }).select("_id").lean();
  return user?._id?.toString() ?? null;
};

/**
 * Returns both the current user's MongoDB _id and a lean subset of user
 * fields. Useful when the caller needs userId plus metadata (name, username,
 * shadowBanned, etc.) and wants to avoid a second DB round-trip.
 */
export const sessionUser = async (fields = "_id shadowBanned name username") => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await connectMongoDB();

  // Fast path: JWT contains id — fetch by _id
  if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
    const user = await User.findById(session.user.id).select(fields).lean();
    return user ? { userId: session.user.id, user } : null;
  }

  // Slow path: look up by email
  if (!session.user.email) return null;
  console.warn("[sessionUser] slow path hit for email:", session.user.email);
  const user = await User.findOne({ email: session.user.email.toLowerCase() }).select(fields).lean();
  return user ? { userId: user._id.toString(), user } : null;
};
