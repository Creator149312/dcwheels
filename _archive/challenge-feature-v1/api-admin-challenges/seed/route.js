import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { isAdminSession } from "@utils/auth/isAdmin";
import { connectMongoDB } from "@lib/mongodb";
import Challenge from "@models/challenge";

/**
 * POST /api/admin/challenges/seed
 * Body: { challenges: [...] }
 * Inserts each challenge only if no existing document shares the same
 * (badgeSlug + entityType) combination, preventing duplicates on repeated calls.
 */
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongoDB();
  const { challenges } = await req.json();

  if (!Array.isArray(challenges) || challenges.length === 0) {
    return NextResponse.json({ error: "challenges array is required." }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const c of challenges) {
    if (!c.title?.trim() || !c.badgeSlug?.trim()) { skipped++; continue; }

    const exists = await Challenge.findOne({
      badgeSlug: c.badgeSlug,
      entityType: c.entityType || "",
    }).lean();

    if (exists) { skipped++; continue; }

    await Challenge.create({
      title:             String(c.title).trim().slice(0, 120),
      description:       String(c.description || "").trim().slice(0, 500),
      entityType:        c.entityType || "",
      tier:              c.tier || "common",
      badgeSlug:         String(c.badgeSlug).trim().toLowerCase(),
      streakDays:        Math.max(0, parseInt(c.streakDays) || 0),
      taskInstruction:   String(c.taskInstruction || "").trim().slice(0, 300),
      verificationHint:  String(c.verificationHint || "").trim().slice(0, 300),
      quizQuestions:     Math.max(3, Math.min(5, parseInt(c.quizQuestions) || 3)),
      quizPassThreshold: Math.max(1, parseInt(c.quizPassThreshold) || 2),
      active:            c.active !== false,
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, skipped });
}
