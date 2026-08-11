import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/post";
import TopicPage from "@/models/topicpage";
import { generateAIPost } from "@/scripts/ai-generation-helper"; // We'll need to make sure this is accessible

const ADMIN_EMAILS = ["admin@example.com"]; // Update with your admin emails

export async function POST(req) {
  try {
    // 1. Basic Auth Check (Example)
    // You should use your existing auth session check here
    
    const { slug, type, title, count = 1 } = await req.json();

    if (!slug || !type) {
      return NextResponse.json({ error: "Slug and type are required" }, { status: 400 });
    }

    await connectToDatabase();

    // 2. Fetch Topic Metadata
    const topicPage = await TopicPage.findOne({ slug, type });
    if (!topicPage) {
      return NextResponse.json({ error: "TopicPage not found" }, { status: 404 });
    }

    const results = [];
    
    for (let i = 0; i < count; i++) {
        // 3. Generate Content via AI
        const postTypes = ["Casual", "Controversial", "Poll"];
        const selectedType = postTypes[Math.floor(Math.random() * postTypes.length)];
        
        const aiData = await generateAIPost(title, selectedType);

        // 4. Create Post
        const newPost = new Post({
          content: aiData.content,
          authorName: "Community Bot", // Or a random persona
          authorHandle: "bot",
          type: selectedType === "Poll" ? "poll" : "text",
          pollOptions: aiData.pollOptions || [],
          tags: [title.toLowerCase().replace(/\s+/g, ""), "seeding"],
          contentRef: {
            type: type,
            externalId: String(topicPage.relatedId),
            slug: slug,
            image: topicPage.image || ""
          },
          status: "published",
          createdAt: new Date(),
        });

        await newPost.save();
        results.push(newPost._id);
    }

    return NextResponse.json({ 
        success: true, 
        message: `Seeded ${count} posts for ${title}`,
        postIds: results 
    });

  } catch (error) {
    console.error("Seeding API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
