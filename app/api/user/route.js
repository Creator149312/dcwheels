import { connectMongoDB } from "@/lib/mongodb";
import User, { RESERVED_USERNAMES } from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { name, email, password, emailVerified, authMethod } = await request.json();
  await connectMongoDB();

  // 1. Normalized handle from the provided name/username
  const handle = name.toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 40);

  // 2. Uniqueness checks for both handle and name
  const existing = await User.findOne({ 
    $or: [
      { email: email },
      { username: handle },
      { name: new RegExp(`^${name}$`, "i") }
    ]
  }).select("_id email username").lean();
  
  if (existing) {
    let message = "This account already exists.";
    if (existing.email === email) message = "Email is already registered.";
    else message = "Username is already taken. Please choose another.";

    return NextResponse.json(
      { message },
      { status: 409 }
    );
  }

  // 3. Reserved handles check
  if (RESERVED_USERNAMES.has(handle)) {
    return NextResponse.json(
      { message: "This username is reserved. Please choose another." },
      { status: 400 }
    );
  }

  await User.create({ 
    name, 
    email, 
    username: handle, // set handle on creation
    password, 
    emailVerified, 
    authMethod 
  });
  return NextResponse.json({ message: "User Registered" }, { status: 201 });
}
