import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { name, email, password, emailVerified, authMethod } = await request.json();
  await connectMongoDB();
  await User.create({ name, email, password, emailVerified, authMethod });
  return NextResponse.json({ message: "User Registered" }, { status: 201 });
}
