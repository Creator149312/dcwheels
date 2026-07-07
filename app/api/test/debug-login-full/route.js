import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { email, password } = await request.json();
  const debugLog = [];
  
  try {
    debugLog.push("1. Connecting to MongoDB...");
    await connectMongoDB();
    debugLog.push("✓ Connected");

    debugLog.push(`2. Looking up user: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        debugLog,
        email
      });
    }
    
    debugLog.push(`✓ User found: ${user.email}`);
    debugLog.push(`  - ID: ${user._id}`);
    debugLog.push(`  - emailVerified: ${user.emailVerified} (type: ${typeof user.emailVerified})`);
    debugLog.push(`  - emailVerified is truthy: ${!!user.emailVerified}`);
    debugLog.push(`  - password hash length: ${user.password?.length || 0}`);
    debugLog.push(`  - password hash preview: ${user.password?.substring(0, 20)}...`);

    // Check email verification
    if (!user.emailVerified) {
      debugLog.push("✗ FAIL: User email is not verified");
      return NextResponse.json({
        success: false,
        error: "User email not verified",
        debugLog
      });
    }
    debugLog.push("✓ Email is verified");

    // Test password comparison
    debugLog.push(`3. Comparing password...`);
    debugLog.push(`  - Input password: ${password}`);
    debugLog.push(`  - Hash exists: ${!!user.password}`);
    
    if (!user.password) {
      debugLog.push("✗ FAIL: No password hash stored");
      return NextResponse.json({
        success: false,
        error: "No password hash in database",
        debugLog
      });
    }

    let passwordsMatch = false;
    try {
      passwordsMatch = await bcrypt.compare(password, user.password);
      debugLog.push(`✓ bcrypt.compare completed`);
      debugLog.push(`  - Match result: ${passwordsMatch}`);
    } catch (compareErr) {
      debugLog.push(`✗ bcrypt.compare error: ${compareErr.message}`);
      return NextResponse.json({
        success: false,
        error: `Password comparison error: ${compareErr.message}`,
        debugLog
      });
    }

    if (!passwordsMatch) {
      debugLog.push("✗ FAIL: Passwords do not match");
      return NextResponse.json({
        success: false,
        error: "Password mismatch",
        debugLog
      });
    }

    debugLog.push("✓ Password matches!");
    debugLog.push("4. All checks passed - login should succeed");

    return NextResponse.json({
      success: true,
      message: "Login would succeed",
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      debugLog
    });

  } catch (e) {
    debugLog.push(`✗ Unexpected error: ${e.message}`);
    return NextResponse.json({
      success: false,
      error: e.message,
      stack: e.stack,
      debugLog
    }, { status: 500 });
  }
}
