import { connectMongoDB } from "@lib/mongodb";
import List from "@models/list";
import { validateListDescription, validateListTitle } from "@utils/Validator";
import { NextResponse } from "next/server";

//sending request to create a list
export async function POST(request) {
  let error = "";
  try {
    const { title, description, words, createdBy } = await request.json();

    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) error = vlt;
    if (vld.length !== 0) error = vld;

    if (error.length === 0) {
      // console.log("Inside Processing");
      await connectMongoDB();
      await List.create({ title, description, words, createdBy });
      // console.log("List Created");
      return NextResponse.json({ message: "List Created Successfully" });
    } else {
      return NextResponse.json({ error });
    }
  } catch (e) {
    return NextResponse.json({ error });
  }
}

//get all the lists
export async function GET() {
  await connectMongoDB();
  const lists = await List.find();
  return NextResponse.json({ lists }, { status: 200 });
}
export async function DELETE(request) {
  const id = request.nextUrl.searchParams.get("id");
  await connectMongoDB();
  await List.findByIdAndDelete(id);
  return NextResponse.json({ message: "List deleted" }, { status: 200 });
}
