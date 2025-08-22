import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  const {id} = params;

  const { title, description, data, wheelData, relatedTo } = await request.json();
  await connectMongoDB();
  await Wheel.findByIdAndUpdate(id, { title, description, data, wheelData, relatedTo });
  return NextResponse.json({ message: "Wheel updated" }, { status: 200 });
}

export async function GET(request, { params }) {
  const { id } = params;
  await connectMongoDB();
  const list = await Wheel.findOne({ _id: id });
  return NextResponse.json({ list }, { status: 200 });
}
