import { connectMongoDB } from "@lib/mongodb";
import List from "@models/list";
import UnifiedList from "@models/unifiedlist";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  const { id } = params;
  const { newTitle: title, newDescription: description, newWords: words } = await request.json();
  await connectMongoDB();
  await List.findByIdAndUpdate(id, { title, description, words });
  return NextResponse.json({ message: "List updated" }, { status: 200 });
}

export async function GET(request, { params }) {
  const { id } = params;
  await connectMongoDB();
  const list = await List.findOne({ _id: id });
  return NextResponse.json({ list }, { status: 200 });
}