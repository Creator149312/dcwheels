import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { email, password } = await request.json();
  
  try {
    await connectMongoDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({
        found: false,
        email,
        message: "User not found"
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    return NextResponse.json({
      found: true,
      email: user.email,
      emailVerified: user.emailVerified,
      hasPassword: !!user.password,
      passwordHash: user.password?.substring(0, 20) + "...",
      passwordMatch,
      message: passwordMatch ? "✓ Password matches" : "✗ Password does not match"
    });
  } catch (e) {
    return NextResponse.json({
      error: e.message
    }, { status: 500 });
  }
}
