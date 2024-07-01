import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { searchtitle } = params;
  await connectMongoDB();
  const list = await Wheel.find({
    title: { $regex: new RegExp(searchtitle, "i") },
  });
  return NextResponse.json({ list }, { status: 200 });
}
