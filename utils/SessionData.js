import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";
import { connectMongoDB } from "@lib/mongodb";

export const sessionData = async () => {
  return await getServerSession(authOptions);
};

export const sessionUserId = async () => {
  await connectMongoDB();

  // ✅ 1. Get session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const email = session.user.email;

  // ✅ 2. Find user by email
  const user = await User.findOne({ email }).lean();
  if (!user) return null;

  // ✅ 3. Return MongoDB _id
  return user._id.toString();
};
