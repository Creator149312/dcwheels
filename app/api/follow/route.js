import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import Follow from "@/models/follow";
import User from "@/models/user";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "You must be logged in to follow" }), { status: 401 });
    }

    const { contentId, type } = await req.json();
    if (!contentId || !type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    await connectMongoDB();

    // Find user by email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const queryId = mongoose.Types.ObjectId.isValid(contentId)
      ? new mongoose.Types.ObjectId(contentId)
      : contentId;

    const page = await TopicPage.findOne({ _id: queryId, type });
    if (!page) {
      return new Response(JSON.stringify({ error: "Content not found" }), { status: 404 });
    }

    // Check if follow exists in Follow collection
    const existingFollow = await Follow.findOne({ userId: user._id, contentId: page._id });

    let isFollowing;
    if (existingFollow) {
      // Unfollow
      await Follow.deleteOne({ _id: existingFollow._id });
      await TopicPage.updateOne({ _id: page._id }, { $inc: { followers: -1 } });
      isFollowing = false;
    } else {
      // Follow
      await Follow.create({ userId: user._id, contentId: page._id, type });
      await TopicPage.updateOne({ _id: page._id }, { $inc: { followers: 1 } });
      isFollowing = true;
    }

    const updated = await TopicPage.findById(page._id);

    return new Response(JSON.stringify({
      followers: updated.followers,
      isFollowing
    }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
