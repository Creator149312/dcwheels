import mongoose from "mongoose";
import dotenv from "dotenv";
import seedPosts from "./seed-anime-posts.js";

dotenv.config();

/**
 * BULK SEEDING SCRIPT
 * Format: Provide an array of objects with 'slug' and 'title'.
 * The 'slug' should be the URL-friendly part (e.g., "solo-leveling" for /anime/solo-leveling).
 */

const ANIME_LIST = [
  { slug: "209895-jujutsu-kaisen-shimetsu-kaiyuu-kouhen", title: "Jujutsu Kaisen" },
  { slug: "209939-sousou-no-frieren-3rd-season", title: "Frieren" },
  { slug: "213846-ore-dake-level-up-na-ken-beyond-the-system", title: "Solo Leveling" },
  { slug: "127230-chainsaw-man", title: "Chainsaw Man" }
];

async function bulkSeed() {
  try {
    const MAX_POSTS = 10;
    let totalSeeded = 0;
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for bulk seeding...");

    for (const anime of ANIME_LIST) {
      if (totalSeeded >= MAX_POSTS) break;

      // Seed ~3 posts per anime until we hit 10
      const remainingNeeded = MAX_POSTS - totalSeeded;
      const countForThisAnime = Math.min(3, remainingNeeded);

      for (let i = 0; i < countForThisAnime; i++) {
        await seedPosts(anime.slug, anime.title);
        totalSeeded++;
      }
    }

    console.log("Successfully completed bulk seeding.");
  } catch (error) {
    console.error("Bulk seeding failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

bulkSeed();
