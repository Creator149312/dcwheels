/**
 * scripts/seedChallenges.js
 * Run once to populate the Challenge collection:
 *   node scripts/seedChallenges.js
 *
 * Requires MONGODB_URI in environment (same as the app).
 */
import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const ChallengeSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    entityType: String,
    tier: String,
    badgeSlug: String,
    streakDays: Number,
    taskInstruction: String,
    verificationHint: String,
    quizQuestions: Number,
    quizPassThreshold: Number,
    active: Boolean,
  },
  { timestamps: true }
);

const Challenge = mongoose.models.Challenge || mongoose.model("Challenge", ChallengeSchema);

const CHALLENGES = [
  // ── Anime ───────────────────────────────────────────────────
  {
    title: "The First Episode Test",
    description: "Spin the anime wheel, watch the first episode of whatever you land on.",
    entityType: "anime",
    tier: "common",
    badgeSlug: "anime-first-episode",
    streakDays: 0,
    taskInstruction: "Spin any Anime wheel, watch Episode 1 of your result, then verify below.",
    verificationHint: "Answer 2 out of 3 questions about the anime you watched.",
    quizQuestions: 3,
    quizPassThreshold: 2,
    active: true,
  },
  {
    title: "Genre Explorer",
    description: "Land on 3 different anime genres and watch an episode from each.",
    entityType: "anime",
    tier: "rare",
    badgeSlug: "anime-genre-explorer",
    streakDays: 0,
    taskInstruction: "Spin 3 times, land on different genres, watch an episode each time.",
    verificationHint: "Answer 3 out of 5 questions correctly to prove you watched.",
    quizQuestions: 5,
    quizPassThreshold: 3,
    active: true,
  },
  {
    title: "Anime Marathoner",
    description: "Spin the anime wheel and watch something for 7 consecutive days.",
    entityType: "anime",
    tier: "epic",
    badgeSlug: "anime-marathoner",
    streakDays: 7,
    taskInstruction: "Spin and log a completed anime watch every day for 7 days.",
    verificationHint: "Pass the quiz on your final day's pick to complete the challenge.",
    quizQuestions: 5,
    quizPassThreshold: 3,
    active: true,
  },

  // ── Movies ──────────────────────────────────────────────────
  {
    title: "Movie Night",
    description: "Let the wheel decide your next movie. Then actually watch it.",
    entityType: "movie",
    tier: "common",
    badgeSlug: "movie-night",
    streakDays: 0,
    taskInstruction: "Spin a Movie wheel, watch the result, then verify below.",
    verificationHint: "Answer 2 out of 3 questions about the movie you watched.",
    quizQuestions: 3,
    quizPassThreshold: 2,
    active: true,
  },
  {
    title: "Genre Hopper",
    description: "Watch a movie from 3 different genres decided by the wheel.",
    entityType: "movie",
    tier: "rare",
    badgeSlug: "cinephile",
    streakDays: 0,
    taskInstruction: "Spin 3 times in different genre categories and watch each result.",
    verificationHint: "Answer 3 of 5 questions about your final movie to verify.",
    quizQuestions: 5,
    quizPassThreshold: 3,
    active: true,
  },

  // ── Games ───────────────────────────────────────────────────
  {
    title: "Backlog Roulette",
    description: "Spin the game wheel and actually play what it lands on tonight.",
    entityType: "game",
    tier: "common",
    badgeSlug: "backlog-buster",
    streakDays: 0,
    taskInstruction: "Spin a Game wheel, play the result for at least 30 minutes.",
    verificationHint: "Answer 2 out of 3 questions about the game to verify.",
    quizQuestions: 3,
    quizPassThreshold: 2,
    active: true,
  },

  // ── Characters ──────────────────────────────────────────────
  {
    title: "Character Deep Dive",
    description: "Spin for a character and learn their backstory, powers, and arc.",
    entityType: "character",
    tier: "common",
    badgeSlug: "character-pick",
    streakDays: 0,
    taskInstruction: "Spin a Character wheel, read up on the result, then verify.",
    verificationHint: "Answer 2 out of 3 questions about the character.",
    quizQuestions: 3,
    quizPassThreshold: 2,
    active: true,
  },
];

async function seed() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  for (const c of CHALLENGES) {
    const exists = await Challenge.findOne({ badgeSlug: c.badgeSlug, entityType: c.entityType });
    if (exists) {
      console.log(`  SKIP (exists): ${c.title}`);
      continue;
    }
    await Challenge.create(c);
    console.log(`  CREATED: ${c.title}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
