// app/api/auth/reset-password/route.js
import bcrypt from 'bcryptjs';
import db from '../../../lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  const { token, email, newPassword } = await request.json();
  const user = await db.getUserByEmail(email);

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const isValid = await bcrypt.compare(token, user.passwordResetToken);

  if (!isValid) {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.updateUserPassword(email, hashedPassword);

  return NextResponse.json({ message: 'Password reset successful' });
}
