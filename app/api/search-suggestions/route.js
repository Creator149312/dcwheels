import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  await connectMongoDB();

  const results = await Wheel.find({
    title: { $regex: "^" + query, $options: "i" },
  })
    .limit(10)
    .select("title -_id");

  const suggestions = results.map((item) => item.title);
  return NextResponse.json(suggestions);
}
