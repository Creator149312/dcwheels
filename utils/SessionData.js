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
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean();
  return user?._id?.toString() ?? null;
};
