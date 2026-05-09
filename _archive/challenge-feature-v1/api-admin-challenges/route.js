import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { isAdminSession } from "@utils/auth/isAdmin";
import { connectMongoDB } from "@lib/mongodb";
import Challenge from "@models/challenge";

async function adminGuard() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** GET /api/admin/challenges — list all (including inactive) */
export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;

  await connectMongoDB();
  const challenges = await Challenge.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json(challenges);
}

/** POST /api/admin/challenges — create one */
export async function POST(req) {
  const denied = await adminGuard();
  if (denied) return denied;

  await connectMongoDB();
  const body = await req.json();

  const {
    title, description, entityType, tier, badgeSlug,
    streakDays, taskInstruction, verificationHint,
    quizQuestions, quizPassThreshold, active,
    wheelId, wheelTitle, wheelPath,
  } = body;

  if (!title?.trim() || !badgeSlug?.trim()) {
    return NextResponse.json({ error: "title and badgeSlug are required." }, { status: 400 });
  }

  const challenge = await Challenge.create({
    title: String(title).trim().slice(0, 120),
    description: String(description || "").trim().slice(0, 500),
    entityType: entityType || "",
    tier: tier || "common",
    badgeSlug: String(badgeSlug).trim().toLowerCase(),
    streakDays: Math.max(0, parseInt(streakDays) || 0),
    taskInstruction: String(taskInstruction || "").trim().slice(0, 300),
    verificationHint: String(verificationHint || "").trim().slice(0, 300),
    quizQuestions: Math.max(3, Math.min(5, parseInt(quizQuestions) || 3)),
    quizPassThreshold: Math.max(1, parseInt(quizPassThreshold) || 2),
    active: active !== false,
    wheelId: wheelId || null,
    wheelTitle: String(wheelTitle || "").trim().slice(0, 200),
    wheelPath: String(wheelPath || "").trim().slice(0, 300),
  });

  return NextResponse.json(challenge, { status: 201 });
}
