// app/api/pages/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Page from "@/models/page";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectMongoDB();

    const idsParam = req.nextUrl.searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json([], { status: 200 });
    }

    const ids = idsParam.split(",").map((id) => new mongoose.Types.ObjectId(id));

    const pages = await Page.find({ _id: { $in: ids } })
      .select("_id title slug")
      .lean();

    return NextResponse.json(pages);
  } catch (err) {
    console.error("Error fetching pages:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
