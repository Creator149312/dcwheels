import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

// Note: A previous PUT handler here referenced an undefined `List` model
// and had no auth — it would have 500'd on first call. Removed entirely
// because nothing in the codebase invokes PUT on this route. Wheel
// updates go through PUT /api/wheel/[id] which enforces ownership.

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
        const lists = await Wheel.find({ createdBy: createdBy })
          .select("_id title description data createdAt wheelPreview tags")
          .sort({ updatedAt: -1 })
          .lean();
        return NextResponse.json({ lists }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
