// app/api/admin/assign-related/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@/models/wheel";

export async function POST(req) {
  try {
    await connectMongoDB();

    const body = await req.json();
    const { wheelId, relatedTo } = body;

    if (!wheelId || !relatedTo?.type || !relatedTo?.id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updated = await Wheel.findByIdAndUpdate(
      wheelId,
      { relatedTo },
      { new: true }
    );

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Error assigning relatedTo:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
