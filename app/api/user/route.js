import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { name, email, password, emailVerified, authMethod } = await request.json();
  await connectMongoDB();

  // Check for duplicate username before hitting the unique index so we can
  // return a friendly message instead of a raw MongoDB duplicate-key error.
  if (name) {
    const existing = await User.findOne({ name }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { message: "Username is already taken. Please choose another." },
        { status: 409 }
      );
    }
  }

  await User.create({ name, email, password, emailVerified, authMethod });
  return NextResponse.json({ message: "User Registered" }, { status: 201 });
}
