/**
 * AI Topic Post Bot v2 — Memory-Guided, Two-Step Chain-of-Thought
 *
 * Reads post-generation strategy memory files per TopicPage type,
 * uses them as context for OpenAI to generate 5 human-sounding posts
 * per type (anime, movie, game, character) — 20 posts total.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MONGODB_URI = process.env.MONGODB_URI;
const SYSTEM_USER_EMAIL = process.env.SYSTEM_USER_ID || "gauravsingh9314@gmail.com";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// How many posts to generate per type
const POSTS_PER_TYPE = 5;

// Types to run (order matters for console readability)
const TOPIC_TYPES = ["anime", "movie", "game", "character"];

// Where the memory strategy files live
const MEMORY_DIR = path.join(
  __dirname,
  "../app/(content)/_shared/post-generation"
);

if (!OPENAI_API_KEY) {
  console.error("✗ Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─── Helpers ────────────────────────────────────────────────────────────────

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

function getDisplayTitle(topic) {
  return (
    topic.title?.english ||
    topic.title?.romaji ||
    topic.title?.default ||
    topic.title?.original ||
    "Unknown"
  );
}

/** Load the strategy memory file for a given type */
function loadMemory(type) {
  const filePath = path.join(MEMORY_DIR, `${type}.md`);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ No memory file found for type '${type}', using generic prompt.`);
    return null;
  }
  return fs.readFileSync(filePath, "utf-8");
}

// ─── Core Generation Logic ───────────────────────────────────────────────────

async function generatePostForTopic(topic, memoryContext) {
  const topicTitle = getDisplayTitle(topic);

  // STEP 1 — Research: what do fans actually debate about this?
  const researchResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a pop-culture researcher who knows what fans argue about online.",
      },
      {
        role: "user",
        content: `What is one specific, highly debated controversy, hot take, or fan debate surrounding the ${topic.type} "${topicTitle}"? Be precise — reference specific characters, arcs, mechanics, or decisions from the ${topic.type}.`,
      },
    ],
    temperature: 0.75,
  });

  const researchContext = researchResponse.choices[0].message.content;

  // STEP 2 — Generate: write the post using memory strategy as a guide
  const generateResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a genuine fan posting on a community forum called Spinpapa.
Output strictly as a JSON object with these exact keys:
{ "title": "string", "content": "string", "pollOptions": ["string", ...], "category": "string" }

'category' should be the name of the question category you chose (e.g. "Philosophical & Moral Dilemmas").`,
      },
      {
        role: "user",
        content: `You are posting about the ${topic.type} "${topicTitle}".

Here is what fans are debating about it:
${researchContext}

Here is your strategy guide for what type of posts work best for ${topic.type} pages:
---
${memoryContext || "Write an engaging discussion post with a poll about this topic."}
---

Using the strategy guide above, pick the most fitting question category for this specific debate and write the post.

VOICE RULES (strictly follow):
- Sound like a real fan casually starting a discussion, not a bot.
- Mostly lowercase is fine. One natural abbreviation like "tbh" or "kinda" is okay.
- Do NOT use heavy slang (no "mid", "cooked", "based", "af", "ngl", "lowkey").
- Do NOT use hashtags, emojis, or spam exclamation marks.
- Do NOT open with "Hey fellow fans" or "Let's settle this". Just dive in.
- 'pollOptions': 2 to 4 short, punchy, conversational choices.`,
      },
    ],
    temperature: 0.85,
  });

  const postData = JSON.parse(generateResponse.choices[0].message.content);

  return {
    title: postData.title,
    content: postData.content,
    pollOptions: postData.pollOptions.slice(0, 4).map((text) => ({
      _id: new mongoose.Types.ObjectId(),
      text,
      voteCount: 0,
    })),
    category: postData.category || "General",
  };
}

// ─── Main Bot Runner ─────────────────────────────────────────────────────────

async function runBot() {
  try {
    const db = mongoose.connection.db;

    const botUser = await db
      .collection("users")
      .findOne({ email: SYSTEM_USER_EMAIL });
    if (!botUser) {
      throw new Error(`Bot user not found for email: ${SYSTEM_USER_EMAIL}`);
    }

    const allNewPosts = [];

    for (const type of TOPIC_TYPES) {
      console.log(`\n${"═".repeat(55)}`);
      console.log(`  Type: ${type.toUpperCase()} — generating ${POSTS_PER_TYPE} posts`);
      console.log(`${"═".repeat(55)}`);

      // Load the strategy memory file for this type
      const memoryContext = loadMemory(type);

      // Fetch POSTS_PER_TYPE unique random TopicPages of this type
      const topics = await db
        .collection("topicpages")
        .aggregate([
          { $match: { type, cover: { $exists: true, $ne: null } } },
          { $sample: { size: POSTS_PER_TYPE } },
        ])
        .toArray();

      if (topics.length === 0) {
        console.log(`  ⚠ No TopicPages found for type '${type}'. Skipping.`);
        continue;
      }

      for (const topic of topics) {
        const topicTitle = getDisplayTitle(topic);
        console.log(`\n  → ${topicTitle}`);

        try {
          const postData = await generatePostForTopic(topic, memoryContext);

          allNewPosts.push({
            userId: botUser._id,
            authorName: botUser.name || botUser.username || "Spinpapa Fan",
            authorImage: botUser.image,
            title: postData.title,
            content: postData.content,
            tags: [type, "discussion", postData.category?.toLowerCase().replace(/\s+/g, "-") || "debate"],
            isPublic: true,
            hasPoll: true,
            pollOptions: postData.pollOptions,
            contentRef: {
              type,
              externalId: topic.relatedId?.toString(),
              title: topicTitle,
              image: topic.cover,
            },
            likeCount: 0,
            commentCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(`     Title    : "${postData.title}"`);
          console.log(`     Category : ${postData.category}`);
          console.log(`     Poll     : ${JSON.stringify(postData.pollOptions.map(o => o.text))}`);
        } catch (err) {
          console.error(`  ✗ Failed for "${topicTitle}": ${err.message}`);
        }
      }
    }

    // Insert everything at once
    if (allNewPosts.length > 0) {
      const result = await db
        .collection("posts")
        .insertMany(allNewPosts.reverse());
      console.log(
        `\n\n🎉 Done! Injected ${result.insertedCount} posts into the Global Feed.`
      );
    } else {
      console.log("\nNo posts generated.");
    }
  } catch (error) {
    console.error("\nBot execution failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

connectMongoDB().then(runBot);
