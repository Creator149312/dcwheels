import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import { NextResponse } from "next/server";

const usersToVerify = [
  'shadowroguex@example.ie',
  'pixelsamurai77@example.jp',
  'cactusridermx@example.mx',
  'falcondune99@example.ae',
  'mysticlotusin@example.in',
  'ironbritknight@example.uk',
  'libertyeagleusa@example.us'
];

export async function GET() {
  try {
    await connectMongoDB();

    const results = {
      verified: [],
      notFound: [],
      errors: []
    };

    for (const email of usersToVerify) {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          results.notFound.push(email);
          continue;
        }

        // Set emailVerified to current date if not already set
        if (!user.emailVerified) {
          user.emailVerified = new Date();
          await user.save();
          results.verified.push({ email, status: 'VERIFIED_NOW', hasPassword: !!user.password });
        } else {
          results.verified.push({ email, status: 'ALREADY_VERIFIED', hasPassword: !!user.password });
        }
      } catch (e) {
        results.errors.push({ email, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: usersToVerify.length,
        verified: results.verified.length,
        notFound: results.notFound.length,
        errors: results.errors.length
      },
      results
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e.message
    }, { status: 500 });
  }
}
