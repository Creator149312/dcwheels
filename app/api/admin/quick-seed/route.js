import mongoose from "mongoose";
import { connectMongoDB as connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/post";
import TopicPage from "@/models/topicpage";
import Comment from "@/models/comment";
import { generateAIPost } from "@/scripts/ai-generation-helper";
import { generateAIComments } from "@/scripts/ai-comment-helper";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

const PERSONAS = [
  { id: "6a49165a4e84a6766406ad59", name: "ShadowRogueX", handle: "ShadowRogueX", bio: "Edgy anime fan who loves dark themes and power scaling. Uses irony and internet slang." },
  { id: "6a4916b84e84a6766406ada0", name: "LibertyEagle", handle: "LibertyEagle", bio: "Shonen fan who values friendship and epic battles. Very enthusiastic and uses lots of exclamation marks." },
  { id: "6a4916934e84a6766406ad8e", name: "MysticLotusIN", handle: "MysticLotusIN", bio: "Loves lore, hidden details, and world-building. Polite and analytical." },
  { id: "6a49166c4e84a6766406ad73", name: "PixelSamurai77", handle: "PixelSamurai77", bio: "Gamer who appreciates animation quality and fight choreography. Uses technical terms like 'frame rate' or 'sakuga'." },
  { id: "6a4916a04e84a6766406ad97", name: "IronBritKnight", handle: "IronBritKnight", bio: "Analytical fan who critiques plot holes and pacing. Slightly cynical but fair." },
  // NEW PERSONAS
  { id: "6a49167b4e84a6766406ad7c", name: "CactusRiderMX", handle: "CactusRiderMX", bio: "Slice of life enthusiast who loves cute aesthetics, romance subplots, and wholesome vibes. Employs lots of emojis." },
  { id: "6a4916864e84a6766406ad85", name: "FalconDune99", handle: "FalconDune99", bio: "Source material purist. Constantly compares anime to manga chapters. Deeply knowledgeable but can be a bit of a gatekeeper." }
];

export async function POST(req) {
  try {
    const { slug, type, title, count = 1, forceType } = await req.json();

    if (!slug || !type) {
      return Response.json({ error: "Slug and type are required" }, { status: 400 });
    }

    await connectToDatabase();

    const topicPage = await TopicPage.findOne({ slug, type });
    if (!topicPage) {
      return Response.json({ error: "TopicPage not found" }, { status: 404 });
    }

    const results = [];
    const postTypes = ["casual", "controversial", "poll"];

    for (let i = 0; i < count; i++) {
        let selectedType;
        if (forceType === "Poll") {
          selectedType = "poll";
        } else if (forceType === "Text") {
          selectedType = Math.random() > 0.5 ? "casual" : "controversial";
        } else {
          selectedType = postTypes[Math.floor(Math.random() * postTypes.length)];
        }

        const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
        const aiData = await generateAIPost(persona, title, selectedType);

        // Random date within last 6 months
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const randomTimestamp = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));

        const isPoll = selectedType === "poll" || (aiData && aiData.pollOptions && aiData.pollOptions.length > 0);
        const postContent = aiData?.content || aiData || "No content generated";

        const newPost = new Post({
          userId: persona.id,
          content: postContent,
          authorName: persona.name,
          authorHandle: persona.handle,
          type: isPoll ? "poll" : "text",
          hasPoll: isPoll,
          pollOptions: isPoll 
            ? (aiData.pollOptions || []).map(opt => ({ text: (typeof opt === 'string' ? opt : opt.text).trim().slice(0, 65) }))
            : [],
          tags: [title.toLowerCase().replace(/\s+/g, "")],
          contentRef: {
            type: type,
            externalId: topicPage.relatedId,
            slug: slug,
            image: topicPage.cover || "",
            title: topicPage.title?.english || topicPage.title?.romaji || topicPage.title?.default || title
          },
          status: "published",
          createdAt: randomTimestamp,
          updatedAt: randomTimestamp
        });

        await newPost.save();

        // SEED COMMENTS (1-2 per post to make the platform look alive)
        const commentCount = Math.floor(Math.random() * 2) + 1; 
        const commentPersonas = PERSONAS.filter(p => p.id !== persona.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, commentCount);

        for (const cPersona of commentPersonas) {
            const aiComments = await generateAIComments(cPersona, postContent, title, 1);
            if (aiComments && aiComments.length > 0) {
                const commentTime = new Date(randomTimestamp.getTime() + (Math.random() * 3600000 * 24)); // Within 24 hours of post
                await new Comment({
                    userId: cPersona.id,
                    entityType: "post",
                    entityId: newPost._id,
                    text: aiComments[0].slice(0, 500),
                    createdAt: commentTime < now ? commentTime : now,
                    updatedAt: commentTime < now ? commentTime : now
                }).save();
            }
        }
        
        // Update post comment count
        await Post.findByIdAndUpdate(newPost._id, { commentCount: commentCount });

        results.push(newPost._id);
    }

    return Response.json({ 
        success: true, 
        message: `Seeded ${count} posts for ${title}`,
        postIds: results 
    });

  } catch (error) {
    console.error("Seeding API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
