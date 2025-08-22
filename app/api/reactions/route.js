import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import Reaction from "@/models/reaction";
import User from "@/models/user";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "You must be logged in to react" }), { status: 401 });
    }

    const { contentId, type, reaction } = await req.json();
    if (!contentId || !type || !reaction) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    await connectMongoDB();

    // Get user ObjectId
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

    // Check for an existing reaction from this user
    const existing = await Reaction.findOne({ userId: user._id, contentId: page._id });

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction → do nothing or return error
        return new Response(JSON.stringify({ error: "You have already reacted" }), { status: 400 });
      } else {
        // Switch reaction type
        await TopicPage.updateOne(
          { _id: page._id },
          {
            $inc: {
              [`reactions.${existing.reaction}`]: -1,
              [`reactions.${reaction}`]: 1,
            },
          }
        );
        existing.reaction = reaction;
        await existing.save();
      }
    } else {
      // New reaction
      await Reaction.create({
        userId: user._id,
        contentId: page._id,
        type,
        reaction,
      });
      await TopicPage.updateOne(
        { _id: page._id },
        { $inc: { [`reactions.${reaction}`]: 1 } }
      );
    }

    const updated = await TopicPage.findById(page._id);

    return new Response(JSON.stringify({ reactions: updated.reactions }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
