/**
 * scripts/backfill-post-hashtags.mjs
 * 
 * Scans all posts for #[tag] patterns in the content and ensures they exist 
 * in the post's tags array. Run via: node scripts/backfill-post-hashtags.mjs
 */
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "spinpapa_dbprod"; 

async function backfill() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing in .env");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const postCol = db.collection('posts');

    console.log("Fetching all posts...");
    const posts = await postCol.find({ content: { $regex: /#/ } }).toArray();
    console.log(`Found ${posts.length} posts containing '#' in content.`);

    let updatedCount = 0;
    const hashtagRegex = /#(\w+)/g;

    for (const post of posts) {
      const content = post.content || "";
      const existingTags = Array.isArray(post.tags) ? post.tags : [];
      let newTags = [...existingTags];
      
      const matches = content.matchAll(hashtagRegex);
      let changed = false;

      for (const match of matches) {
        const tag = match[1].toLowerCase();
        if (tag && !newTags.includes(tag)) {
          newTags.push(tag);
          changed = true;
        }
      }

      if (changed) {
        await postCol.updateOne(
          { _id: post._id },
          { $set: { tags: newTags.slice(0, 10) } }
        );
        updatedCount++;
      }
    }

    console.log(`✅ Backfill complete. Updated ${updatedCount} posts.`);
  } catch (err) {
    console.error("Backfill failed:", err);
  } finally {
    await client.close();
  }
}

backfill();
