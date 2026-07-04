/**
 * Auto News Bot
 *
 * This script demonstrates automated fetching from 3 different APIs
 * (Reddit, TMDB, and Jikan) to generate engaging "Spinpapa Style"
 * public posts with polls, ready for the Global Feed.
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

async function runBot() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Get the admin/bot user
    const botUser = await db.collection("users").findOne({ email: SYSTEM_USER_EMAIL });
    if (!botUser) {
      throw new Error(`Bot user not found: ${SYSTEM_USER_EMAIL}`);
    }

    const newPosts = [];

    // ==========================================
    // 1. TMDB - #1 Trending Movie + Auto Poll
    // ==========================================
    console.log("Fetching TMDB trending movie...");
    if (TMDB_API_KEY) {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const topMovie = tmdbData.results[0];
        
        if (topMovie) {
          newPosts.push({
            userId: botUser._id,
            authorName: botUser.name || botUser.username,
            authorImage: botUser.image,
            title: `Currently #1 Trending Worldwide: ${topMovie.title}`,
            content: `"${topMovie.overview}"\n\nIs the hype justified?`,
            tags: ["movies", "trending", "cinema", "box-office"],
            isPublic: true,
            hasPoll: true,
            pollOptions: [
              { _id: new mongoose.Types.ObjectId(), text: "Watching it ASAP", voteCount: 0 },
              { _id: new mongoose.Types.ObjectId(), text: "Waiting for streaming", voteCount: 0 },
              { _id: new mongoose.Types.ObjectId(), text: "Not interested", voteCount: 0 }
            ],
            contentRef: {
              type: "movie",
              externalId: topMovie.id.toString(),
              title: topMovie.title,
              image: `https://image.tmdb.org/t/p/w500${topMovie.poster_path}`
            },
            likeCount: 0,
            commentCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`✓ Added TMDB Post: ${topMovie.title}`);
        }
      }
    }

    // ==========================================
    // 2. JIKAN - Top Airing Anime + Auto Poll
    // ==========================================
    console.log("Fetching Jikan top airing anime...");
    const animeRes = await fetch("https://api.jikan.moe/v4/top/anime?filter=airing&limit=1");
    if (animeRes.ok) {
      const animeData = await animeRes.json();
      const topAnime = animeData.data && animeData.data[0];
      
      if (topAnime) {
        newPosts.push({
          userId: botUser._id,
          authorName: botUser.name || botUser.username,
          authorImage: botUser.image,
          title: `Everyone is talking about ${topAnime.title}`,
          content: `It just hit the top of the charts with a massive score of ${topAnime.score}/10! Are you following the hype?`,
          tags: ["anime", "trending", "manga", "discussion"],
          isPublic: true,
          hasPoll: true,
          pollOptions: [
            { _id: new mongoose.Types.ObjectId(), text: "Peak Fiction!", voteCount: 0 },
            { _id: new mongoose.Types.ObjectId(), text: "It's Overrated", voteCount: 0 },
            { _id: new mongoose.Types.ObjectId(), text: "Haven't watched yet", voteCount: 0 }
          ],
          contentRef: {
            type: "anime",
            externalId: topAnime.mal_id.toString(),
            title: topAnime.title,
            image: topAnime.images.jpg.large_image_url
          },
          likeCount: 0,
          commentCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✓ Added Jikan Post: ${topAnime.title}`);
      }
    }

    // ==========================================
    // 3. Reddit Cheat Code - r/gaming Hot
    // ==========================================
    console.log("Fetching Reddit r/gaming hot post...");
    // Bypass Reddit API blocks by using User-Agent
    const redditRes = await fetch("https://www.reddit.com/r/gaming/hot.json?limit=3", {
      headers: { "User-Agent": "Mozilla/5.0 (SpinpapaBot/1.0)" }
    });
    
    if (redditRes.ok) {
      const redditData = await redditRes.json();
      // Skip the pinned megathreads, get a real post
      const topGamingPost = redditData.data.children.find(child => !child.data.stickied)?.data;
      
      if (topGamingPost) {
        // Clean up title and keep it short
        const cleanTitle = topGamingPost.title.length > 90 
          ? topGamingPost.title.substring(0, 90) + "..." 
          : topGamingPost.title;

        newPosts.push({
          userId: botUser._id,
          authorName: botUser.name || botUser.username,
          authorImage: botUser.image,
          title: cleanTitle,
          content: "Spotted this trending heavily in the gaming community right now. What's your take?",
          tags: ["gaming", "news", "reddit-hot", "video-games"],
          isPublic: true,
          hasPoll: true,
          pollOptions: [
            { _id: new mongoose.Types.ObjectId(), text: "Strongly Agree", voteCount: 0 },
            { _id: new mongoose.Types.ObjectId(), text: "Disagree completely", voteCount: 0 }
          ],
          // No direct contentRef here as it's a general discussion
          likeCount: 0,
          commentCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✓ Added Reddit Post: ${cleanTitle}`);
      }
    }

    // Insert all into MongoDB
    if (newPosts.length > 0) {
      // Reverse array so latest comes first
      const result = await db.collection("posts").insertMany(newPosts.reverse());
      console.log(`\n🎉 Successfully injected ${result.insertedCount} news posts into the Global Feed!`);
    }

  } catch (error) {
    console.error("Bot execution failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

connectMongoDB().then(runBot);
