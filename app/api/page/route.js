import { connectMongoDB } from "@lib/mongodb";
import Page from "@models/page";

import { NextResponse } from "next/server";

//sending request to create a page
export async function POST(request) {
  const { title, content, slug, wheel } = await request.json();

  await connectMongoDB();

  try {
    const creationData = await Page.create({
      title,
      content,
      slug,
      wheel,
    });
    return NextResponse.json({
      message: "Page Created Successfully",
      creationID: creationData._id,
    });
  } catch (error) {
    return NextResponse.json("Failed to Create Page");
  }
}

export async function GET(request) {
  const { slug} = await request.json();
  await connectMongoDB();
  const pageData = await Page.findOne({ slug }).populate('wheel');
  return NextResponse.json({ pageData }, { status: 200 });
}

