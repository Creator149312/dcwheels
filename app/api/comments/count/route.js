import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Comment from "@models/comment";

export const revalidate = 60; // cache for 1 minute

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ count: 0 });
  }

  try {
    await connectMongoDB();
    const count = await Comment.countDocuments({
      entityType,
      entityId,
      parentCommentId: null,
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
