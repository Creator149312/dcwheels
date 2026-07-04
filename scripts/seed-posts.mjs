/**
 * Seed script to create sample posts for testing.
 * Creates VS posts, Dilemmas, Truth & Dare, and "Did you know?" posts
 * related to movies and various topics.
 * 
 * Fetches movie images from TMDB API for rich contentRef display.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const SYSTEM_USER_EMAIL = process.env.SYSTEM_USER_ID;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

async function fetchMoviePoster(movieId) {
  try {
    if (!TMDB_API_KEY) {
      console.warn("⚠ TMDB_API_KEY not set, skipping poster fetch");
      return null;
    }
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.poster_path) {
      return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    }
  } catch (error) {
    console.warn(`⚠ Failed to fetch poster for movie ${movieId}:`, error.message);
  }
  return null;
}

async function seedPosts() {
  try {
    const db = mongoose.connection.db;
    const usersCol = db.collection("users");
    const postsCol = db.collection("posts");

    // Find the system user
    const systemUser = await usersCol.findOne({ email: SYSTEM_USER_EMAIL });
    if (!systemUser) {
      console.error(`✗ System user not found: ${SYSTEM_USER_EMAIL}`);
      process.exit(1);
    }
    console.log(`✓ Found system user: ${systemUser.name} (${systemUser.email})`);

    const userId = systemUser._id;

    // Fetch movie posters
    console.log("Fetching movie images from TMDB...");
    const avatarPoster = await fetchMoviePoster("83533");
    const hoppersPoster = await fetchMoviePoster("1327819");

    const posts = [
      // 1. VS Post - Superhero themed
      {
        userId,
        title: "Superman vs Batman - Who would win in a fair fight?",
        content:
          "Both are incredibly powerful, but one relies on superhuman strength and the other on intellect and tech. Who takes it?",
        hasPoll: true,
        pollOptions: [
          { text: "Superman - raw power wins", voteCount: 0 },
          { text: "Batman - strategy and planning", voteCount: 0 },
        ],
        tags: ["superhero", "vs", "debate"],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 2. Dilemma - Would you rather
      {
        userId,
        title: "Would you rather: Have the power to read minds OR see the future?",
        content:
          "Both powers would change your life dramatically. Reading minds could reveal uncomfortable truths, while seeing the future might paralyze you with anxiety. Which one would you choose?",
        hasPoll: true,
        pollOptions: [
          { text: "Read minds - understand people better", voteCount: 0 },
          { text: "See the future - prepare for what's coming", voteCount: 0 },
        ],
        tags: ["would-you-rather", "dilemma", "powers"],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 3. Truth & Dare - hypothetical scenario
      {
        userId,
        title: "What would you do if you were invisible for a day?",
        content:
          "Imagine you woke up tomorrow and discovered you had the power to become completely invisible for 24 hours. What's the first thing you'd do? Would you use it responsibly or let curiosity take over?",
        tags: ["truth-dare", "hypothetical", "what-would-you"],
        isPublic: true,
        hasPoll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 4. Did you know? - Related to Avatar movie
      {
        userId,
        title: "Did you know? Avatar: Fire and Ash broke box office records on opening weekend",
        content:
          "Avatar: Fire and Ash has become one of the highest-grossing opening weekends in cinema history. The continued world-building of Pandora keeps audiences coming back for more breathtaking visuals and epic storytelling.",
        contentRef: {
          type: "movie",
          externalId: "83533",
          title: "Avatar: Fire and Ash",
          ...(avatarPoster && { image: avatarPoster }),
        },
        tags: ["avatar", "movies", "box-office", "did-you-know"],
        isPublic: true,
        hasPoll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // 5. Did you know? - Related to Hoppers movie
      {
        userId,
        title: "Did you know? Hoppers features stunning practical effects and minimal CGI",
        content:
          "The filmmakers behind Hoppers chose to focus on practical effects and real stunts, creating an immersive experience that feels incredibly genuine. This approach to filmmaking is becoming increasingly appreciated by audiences tired of over-reliance on CGI.",
        contentRef: {
          type: "movie",
          externalId: "1327819",
          title: "Hoppers",
          ...(hoppersPoster && { image: hoppersPoster }),
        },
        tags: ["hoppers", "movies", "filmmaking", "did-you-know"],
        isPublic: true,
        hasPoll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Delete existing seed posts (optional - remove if you want to keep accumulating)
    const existing = await postsCol.deleteMany({
      userId,
      title: {
        $in: posts.map((p) => p.title),
      },
    });

    if (existing.deletedCount > 0) {
      console.log(`Removed ${existing.deletedCount} existing posts`);
    }

    // Create new posts
    const result = await postsCol.insertMany(posts);
    console.log(`✓ Created ${result.insertedIds.length} posts:`);

    posts.forEach((post, idx) => {
      console.log(
        `  ${idx + 1}. "${post.title}" (tags: ${post.tags.join(", ")})`
      );
    });

    // Print test URLs
    console.log("\n✓ Test URLs:");
    console.log("  Global Feed: http://localhost:3000");
    console.log("  Tags:");
    const allTags = [...new Set(posts.flatMap((p) => p.tags))];
    allTags.forEach((tag) => {
      console.log(`    http://localhost:3000/tags/${tag}`);
    });
    console.log("  Movie pages:");
    console.log("    http://localhost:3000/movie/83533-avatar-fire-and-ash");
    console.log("    http://localhost:3000/movie/1327819-hoppers");
  } catch (error) {
    console.error("✗ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  }
}

// Run
connectMongoDB().then(seedPosts);

