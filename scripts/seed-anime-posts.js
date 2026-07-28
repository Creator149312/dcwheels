import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "../models/user.js";
import Post from "../models/post.js";
import TopicPage from "../models/topicpage.js";
import { generateAIPost } from "./ai-generation-helper.js";

/**
 * SEEDING SCRIPT: ANIME PERSONA POSTS (V3 - AI POWERED)
 * Purpose: Generates high-quality, persona-driven AI posts for specific anime.
 */

async function seedPosts(animeSlug, animeTitle, category = "anime") {
  try {
    const personas = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/personas.json"), "utf8"));

    // 1. Fetch TopicPage to get the correct image and externalId
    const topicPage = await TopicPage.findOne({ slug: animeSlug, type: category });
    if (!topicPage) {
      console.log(`TopicPage for slug ${animeSlug} not found. Ensure the page exists before seeding.`);
      return;
    }

    const interestedPersonas = personas.filter(p => p.interests.includes(category));

    if (interestedPersonas.length === 0) {
      console.log("No personas found for category:", category);
      return;
    }

    // Pick a random persona
    const persona = interestedPersonas[Math.floor(Math.random() * interestedPersonas.length)];
    
    // Find the real user in DB
    const user = await User.findOne({ email: persona.email });
    if (!user) {
      console.log(`User ${persona.username} not found in DB. Skipping.`);
      return;
    }

    // Decide type (Casual, Controversial, or Poll)
    const rand = Math.random();
    const type = rand > 0.6 ? "poll" : (rand > 0.3 ? "controversial" : "casual");

    // Generate AI Content
    const result = await generateAIPost(persona, animeTitle, type);
    if (!result) return;

    let content = "";
    let pollOptions = [];
    const isPoll = type === "poll";

    if (isPoll) {
      content = result.content;
      pollOptions = result.pollOptions.map(opt => ({ text: opt, voteCount: 0 }));
    } else {
      content = result;
    }

    const newPost = new Post({
      userId: user._id,
      authorName: user.name,
      authorHandle: user.username,
      authorImage: user.image || persona.avatar,
      content: content,
      hasPoll: isPoll,
      pollOptions: pollOptions,
      contentRef: {
        type: category,
        externalId: topicPage.relatedId.toString(), // Use the real ID from TopicPage
        slug: topicPage.slug,
        title: topicPage.title.default || animeTitle,
        image: topicPage.cover // Use the real cover image from TopicPage
      }
    });

    await newPost.save();
    console.log(`✅ [${type.toUpperCase()}] Seeded for ${animeTitle} by @${persona.username} (Ref attached)`);

  } catch (error) {
    console.error("Error seeding posts:", error);
  }
}

// Example usage if run directly
if (process.argv[2] && process.argv[3]) {
    const slug = process.argv[2];
    const title = process.argv[3];
    
    mongoose.connect(process.env.MONGODB_URI).then(() => {
        seedPosts(slug, title).then(() => mongoose.disconnect());
    });
}

export default seedPosts;
