// app/api/auth/forgot-password/route.js
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import db from "../../../lib/db";
import User from "@/models/user";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request) {
  const { email } = await request.json();
  const user = await User.findOne({email});

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const token = uuidv4();
  const hashedToken = await bcrypt.hash(token, 10);

  await db.savePasswordResetToken(email, hashedToken);

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.sendEmail({
    to: email,
    subject: "Password Reset",
    text: `Click the link to reset your password: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${email}`,
  });

  return NextResponse.json({ message: "Password reset email sent" });
}
