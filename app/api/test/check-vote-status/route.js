import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import TopicPageVote from "@models/topicPageVote";
import TopicPage from "@models/topicpage";

export async function POST(req) {
  try {
    const { email, topicPageSlug } = await req.json();

    await connectMongoDB();

    // 1. Find the user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return Response.json({ error: "User not found", email }, { status: 404 });
    }

    // 2. Find the topic page by slug
    const topicPage = await TopicPage.findOne({ slug: topicPageSlug });
    if (!topicPage) {
      return Response.json({ error: "Topic page not found", topicPageSlug }, { status: 404 });
    }

    // 3. Check if user has voted on this topic
    const vote = await TopicPageVote.findOne({
      userId: user._id,
      topicPageId: topicPage._id,
    });

    return Response.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, name: user.name },
      topicPage: { id: topicPage._id.toString(), slug: topicPage.slug, title: topicPage.title },
      vote: vote ? {
        topicPageVoteId: vote._id.toString(),
        rating: vote.rating,
        worthIt: vote.worthIt,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      } : null,
      voteExists: !!vote,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
