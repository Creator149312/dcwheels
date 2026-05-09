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

/** PATCH /api/admin/challenges/[id] — update fields */
export async function PATCH(req, { params }) {
  const denied = await adminGuard();
  if (denied) return denied;

  await connectMongoDB();
  const body = await req.json();

  const allowed = [
    "title", "description", "entityType", "tier", "badgeSlug",
    "streakDays", "taskInstruction", "verificationHint",
    "quizQuestions", "quizPassThreshold", "active",
    "wheelId", "wheelTitle", "wheelPath",
  ];

  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // Sanitize types
  if (updates.title)            updates.title            = String(updates.title).trim().slice(0, 120);
  if (updates.description)      updates.description      = String(updates.description).trim().slice(0, 500);
  if (updates.badgeSlug)        updates.badgeSlug        = String(updates.badgeSlug).trim().toLowerCase();
  if (updates.taskInstruction)  updates.taskInstruction  = String(updates.taskInstruction).trim().slice(0, 300);
  if (updates.verificationHint) updates.verificationHint = String(updates.verificationHint).trim().slice(0, 300);
  if ("wheelId" in updates) updates.wheelId = updates.wheelId || null;   // null = unlinked
  if (updates.wheelTitle)       updates.wheelTitle = String(updates.wheelTitle).trim().slice(0, 200);
  if ("wheelPath" in updates)  updates.wheelPath = String(updates.wheelPath || "").trim().slice(0, 300);
  if ("streakDays"     in updates) updates.streakDays     = Math.max(0, parseInt(updates.streakDays) || 0);
  if ("quizQuestions"  in updates) updates.quizQuestions  = Math.max(3, Math.min(5, parseInt(updates.quizQuestions) || 3));
  if ("quizPassThreshold" in updates) updates.quizPassThreshold = Math.max(1, parseInt(updates.quizPassThreshold) || 2);

  const challenge = await Challenge.findByIdAndUpdate(
    params.id,
    { $set: updates },
    { new: true }
  ).lean();

  if (!challenge) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(challenge);
}

/** DELETE /api/admin/challenges/[id] */
export async function DELETE(_, { params }) {
  const denied = await adminGuard();
  if (denied) return denied;

  await connectMongoDB();
  await Challenge.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
