import { connectMongoDB } from "@lib/mongodb";
import List from "@models/list";
import UnifiedList from "@models/unifiedlist";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

const validateEmail = async (data) => {
  let errors = {};

  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.email = "Invalid email address";
  }

  return errors;
};

export async function PUT(request, { params }) {
  const { id } = params;
  const {
    newTitle: title,
    newDescription: description,
    newWords: words,
  } = await request.json();
  await connectMongoDB();
  await List.findByIdAndUpdate(id, { title, description, words });
  return NextResponse.json({ message: "List updated" }, { status: 200 });
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { createdBy } = params;
  const validationErrors = validateEmail({ email: createdBy });
  if (Object.keys(validationErrors).length === 0) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      if (createdBy === session.user.email) {
        //if user abc is requesting for data of user abc
        await connectMongoDB();
        const lists = await List.find({ createdBy: createdBy });
        return NextResponse.json({ lists }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
