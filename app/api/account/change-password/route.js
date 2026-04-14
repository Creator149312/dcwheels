import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { checkRateLimit, getIpFromRequest, rateLimitResponse } from "@lib/rateLimit";

export async function POST(req) {
  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/account/change-password");
  if (limited) return rateLimitResponse(retryAfter);

  await connectMongoDB();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await User.findOne({ email: session.user.email }).select("password authMethod");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Google OAuth users have no password
  if (user.authMethod === "google") {
    return NextResponse.json({ error: "Google accounts cannot change password here" }, { status: 400 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email: session.user.email }, { password: hashed });

  return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
}
