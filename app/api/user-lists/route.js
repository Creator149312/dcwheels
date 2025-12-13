import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import SaveList from "@models/savelist";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user) {
    return new Response(JSON.stringify({ error: "No user found" }), { status: 404 });
  }

  const lists = await SaveList.find({ userId: user._id }).lean();
  return new Response(JSON.stringify(lists), { status: 200 });
}
