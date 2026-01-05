// app/api/history/list/route.ts
import { NextResponse } from "next/server";
import Visit from "@models/visit";
import Wheel from "@models/wheel";
import { sessionUserId } from "@utils/SessionData";
import { connectMongoDB } from "@lib/mongodb";

export async function GET() {
  await connectMongoDB
  const userId = await sessionUserId();

  const visits = await Visit.find({ userId })
    .sort({ visitedAt: -1 })
    .limit(50)
    .lean();

  const wheelIds = visits.map(v => v.wheelId);
  const wheels = await Wheel.find({ _id: { $in: wheelIds } }).lean();

  // Map wheels by id to preserve order
  const byId = new Map(wheels.map(w => [String(w._id), w]));
  const history = visits
    .map(v => byId.get(String(v.wheelId)))
    .filter(Boolean);

  return NextResponse.json({ history });
}
