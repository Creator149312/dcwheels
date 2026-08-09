import "dotenv/config";
import mongoose from "mongoose";

// --- Minimal Schema Definition (Avoids Next.js alias issues) ---
const TopicPageSchema = new mongoose.Schema({
  type: String,
  relatedId: mongoose.Schema.Types.Mixed,
  worthIt: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
    meh: { type: Number, default: 0 },
  },
  rating: {
    totalScore: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  title: mongoose.Schema.Types.Mixed,
});

const TopicPage = mongoose.models.TopicPage || mongoose.model("TopicPage", TopicPageSchema);

// --- API Helpers ---

async function fetchAnimeScore(id) {
  const query = `query ($id: Int) { Media(id: $id, type: ANIME) { averageScore } }`;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: parseInt(id) } }),
    });
    const data = await res.json();
    const score = data.data?.Media?.averageScore; // 0-100
    return score ? score / 20 : null; // Normalize to 0-5
  } catch (err) {
    return null;
  }
}

async function fetchMovieScore(id) {
  const API_KEY = process.env.TMDB_API_KEY;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`);
    const data = await res.json();
    const score = data.vote_average; // 0-10
    return score ? score / 2 : null; // Normalize to 0-5
  } catch (err) {
    return null;
  }
}

async function fetchGameScore(id) {
  const API_KEY = process.env.RAWG_API_KEY;
  try {
    const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`);
    const data = await res.json();
    const score = data.rating; // 0-5
    return score || null;
  } catch (err) {
    return null;
  }
}

// --- Main Script ---

async function run() {
  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected.");

  // Only process types that have a rating system
  const topics = await TopicPage.find({ type: { $in: ["anime", "movie", "tv", "game"] } });
  console.log(`🔍 Found ${topics.length} TopicPages to process.`);

  const SEED_WEIGHT = 10;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const topic of topics) {
    const { type, relatedId, worthIt, rating } = topic;
    const title = topic.title?.english || topic.title?.romaji || topic.title?.localized || topic.title?.default || "Unknown";
    
    // Skip if already has rating data (unless force is needed)
    if (rating && rating.count > 0) {
      skippedCount++;
      continue;
    }

    console.log(`\n📄 Processing: [${type.toUpperCase()}] ${title} (ID: ${relatedId})`);

    let finalWorthIt = worthIt || { yes: 0, no: 0, meh: 0 };
    let finalRating = { totalScore: 0, count: 0 };

    const hasWorthIt = (finalWorthIt.yes + finalWorthIt.no) > 0;

    if (hasWorthIt) {
      // Bootstrap stars from existing worthIt data
      // Yes = 4.5 stars, No = 1.5 stars
      const yesCount = finalWorthIt.yes || 0;
      const noCount = finalWorthIt.no || 0;
      finalRating.count = yesCount + noCount;
      finalRating.totalScore = (yesCount * 4.5) + (noCount * 1.5);
      console.log(`   💡 Derived rating from existing worthIt data (${yesCount}Y / ${noCount}N)`);
    } else {
      // No data at all, fetch from API
      let S = null;
      if (type === "anime") S = await fetchAnimeScore(relatedId);
      else if (type === "movie" || type === "tv") S = await fetchMovieScore(relatedId);
      else if (type === "game") S = await fetchGameScore(relatedId);

      if (S === null) {
        console.log(`   ⚠️ No external score found. Using neutral seed (3.0).`);
        S = 3.0;
      }

      // Generate seed for BOTH systems
      finalRating.count = SEED_WEIGHT;
      finalRating.totalScore = Math.round(S * SEED_WEIGHT * 10) / 10;

      if (S >= 3.5) {
        finalWorthIt = { yes: SEED_WEIGHT, no: 0, meh: 0 };
      } else if (S >= 2.5) {
        finalWorthIt = { yes: 7, no: 3, meh: 0 };
      } else {
        finalWorthIt = { yes: 0, no: SEED_WEIGHT, meh: 0 };
      }
      console.log(`   🌐 Seeded from external API (Score: ${S.toFixed(1)})`);
    }

    topic.worthIt = finalWorthIt;
    topic.rating = {
      totalScore: parseFloat(finalRating.totalScore.toFixed(2)),
      count: finalRating.count,
    };

    await topic.save();
    updatedCount++;
  }

  console.log(`\n✨ Finished! Updated ${updatedCount} pages, skipped ${skippedCount}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
