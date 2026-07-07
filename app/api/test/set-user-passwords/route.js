import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const usersWithPasswords = [
  {email: 'shadowroguex@example.ie', password: 'PhantomBlade!21'},
  {email: 'pixelsamurai77@example.jp', password: 'NeonKatana#88'},
  {email: 'cactusridermx@example.mx', password: 'DesertRide@34'},
  {email: 'falcondune99@example.ae', password: 'SandStorm$65'},
  {email: 'mysticlotusin@example.in', password: 'RiverFlow!92'},
  {email: 'ironbritknight@example.uk', password: 'TowerGuard#47'},
  {email: 'libertyeagleusa@example.us', password: 'FreedomRing@73'}
];

export async function GET() {
  try {
    await connectMongoDB();

    const results = {
      updated: [],
      notFound: [],
      errors: []
    };

    for (const { email, password } of usersWithPasswords) {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          results.notFound.push(email);
          continue;
        }

        // Hash and save password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        user.password = hashedPassword;
        if (!user.emailVerified) {
          user.emailVerified = new Date();
        }
        
        await user.save();
        results.updated.push({ email, passwordUpdated: true, emailVerified: !!user.emailVerified });
      } catch (e) {
        results.errors.push({ email, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e.message
    }, { status: 500 });
  }
}
