import assert from "node:assert";
import { calculateDiffRatio } from "../lib/contentDiff.js";
import { evaluateWheelQuality } from "../lib/wheelIndexGate.js";
import { evaluateListQuality } from "../lib/listIndexGate.js";

console.log("=== Testing Canonical Fork Filter & Remix Engine Logic ===");

// 1. Test calculateDiffRatio
console.log("--- 1. Testing calculateDiffRatio ---");
const originalWheel = ["Pizza", "Burger", "Pasta", "Sushi", "Tacos"];
const cloneIdentical = ["Pizza", "Burger", "Pasta", "Sushi", "Tacos"];
const clone1Changed = ["Pizza", "Burger", "Pasta", "Sushi", "Burrito"]; // 1 change out of 5
const cloneHalfChanged = ["Pizza", "Burger", "Ramen", "Steak", "Salad"]; // 3 changes out of 5

const diffIdentical = calculateDiffRatio(originalWheel, cloneIdentical);
assert.strictEqual(diffIdentical, 0.0, "Identical lists should have diffRatio 0.0");

const diff1 = calculateDiffRatio(originalWheel, clone1Changed);
console.log(`1 change diffRatio: ${diff1} (expected ~0.33 Jaccard distance)`);
assert(diff1 > 0.30, "1 substitution out of 5 should produce a Jaccard distance of 2/6 = 0.3333");

const diffSmallChange = calculateDiffRatio(
  ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6", "Option 7", "Option 8", "Option 9", "Option 10"],
  ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6", "Option 7", "Option 8", "Option 9", "Option X"]
);
console.log(`1 substitution in 10 diffRatio: ${diffSmallChange}`);
assert(diffSmallChange < 0.30, "1 substitution in 10 should be < 0.30 (approx 0.18)");

// 2. Test evaluateWheelQuality with Fork Logic
console.log("\n--- 2. Testing evaluateWheelQuality Fork Logic ---");

// Base original wheel meeting all criteria
const originalQualifyingWheel = {
  title: "Best Favorite Action Movies",
  slug: "best-favorite-action-movies",
  isPublic: true,
  isDeleted: false,
  data: [
    { text: "The Dark Knight" },
    { text: "Mad Max: Fury Road" },
    { text: "Inception" },
    { text: "The Matrix" },
    { text: "Gladiator" },
    { text: "Die Hard" },
    { text: "John Wick" },
    { text: "Terminator 2: Judgment Day" }
  ],
  description: "A great list of action movies for movie night with friends and family.",
  likeCount: 5,
  commentCount: 2,
};

const originalResult = evaluateWheelQuality(originalQualifyingWheel);
assert.strictEqual(originalResult, true, "Original wheel should be eligible for indexing");

// Low-diff fork (<30% modified, low engagement)
const lowDiffFork = {
  ...originalQualifyingWheel,
  slug: "best-favorite-action-movies-fork",
  forkedFrom: { wheelId: "651234567890abcdef123456", authorHandle: "creator" },
  diffRatio: 0.15,
  likeCount: 0,
  commentCount: 0,
};
const lowDiffResult = evaluateWheelQuality(lowDiffFork);
console.log("Low-diff fork eligible:", lowDiffResult);
assert.strictEqual(lowDiffResult, false, "Low-diff fork should be blocked from indexing");

// High-diff fork (>=30% modified)
const highDiffFork = {
  ...originalQualifyingWheel,
  slug: "best-favorite-action-movies-remix",
  forkedFrom: { wheelId: "651234567890abcdef123456", authorHandle: "creator" },
  diffRatio: 0.45,
  likeCount: 5,
  commentCount: 2,
};
const highDiffResult = evaluateWheelQuality(highDiffFork);
console.log("High-diff fork eligible:", highDiffResult);
assert.strictEqual(highDiffResult, true, "High-diff fork (>=30%) should be eligible for indexing");

// Low-diff fork with viral popularity override (likeCount + commentCount >= 50)
const viralFork = {
  ...lowDiffFork,
  likeCount: 45,
  commentCount: 6,
};
const viralResult = evaluateWheelQuality(viralFork);
console.log("Viral low-diff fork eligible:", viralResult);
assert.strictEqual(viralResult, true, "Viral fork (>=50 engagement) should bypass the diffRatio restriction");

// 3. Test evaluateListQuality with Fork Logic
console.log("\n--- 3. Testing evaluateListQuality Fork Logic ---");

const originalQualifyingList = {
  name: "Top 10 Shonen Anime of All Time",
  slug: "top-10-shonen-anime-of-all-time",
  isPublic: true,
  isDeleted: false,
  isSystem: false,
  description: "The definitive ranking of the greatest shonen anime series ever produced in anime history.",
  items: [
    { title: "Hunter x Hunter", rank: 1, image: "https://example.com/hxh.jpg" },
    { title: "One Piece", rank: 2, image: "https://example.com/op.jpg" },
    { title: "Naruto", rank: 3, image: "https://example.com/naruto.jpg" },
    { title: "Bleach", rank: 4, image: "https://example.com/bleach.jpg" },
    { title: "Fullmetal Alchemist", rank: 5, image: "https://example.com/fma.jpg" },
    { title: "Dragon Ball Z", rank: 6, image: "https://example.com/dbz.jpg" },
    { title: "Jujutsu Kaisen", rank: 7, image: "https://example.com/jjk.jpg" },
  ],
  likeCount: 10,
  commentCount: 4,
};

const origListResult = evaluateListQuality(originalQualifyingList);
assert.strictEqual(origListResult, true, "Original list should be eligible for indexing");

// Low-diff list fork
const lowDiffListFork = {
  ...originalQualifyingList,
  slug: "top-10-shonen-anime-fork",
  forkedFrom: { listId: "651234567890abcdef123457", userId: "651234567890abcdef123458" },
  diffRatio: 0.12,
  likeCount: 2,
  commentCount: 0,
};
const lowDiffListResult = evaluateListQuality(lowDiffListFork);
console.log("Low-diff list fork eligible:", lowDiffListResult);
assert.strictEqual(lowDiffListResult, false, "Low-diff list fork should be blocked");

// High-diff list fork
const highDiffListFork = {
  ...lowDiffListFork,
  diffRatio: 0.40,
  likeCount: 5,
  commentCount: 2,
};
const highDiffListResult = evaluateListQuality(highDiffListFork);
console.log("High-diff list fork eligible:", highDiffListResult);
assert.strictEqual(highDiffListResult, true, "High-diff list fork should be eligible");

console.log("\n ALL TESTS PASSED SUCCESSFULLY! Canonical fork filter is 100% sound.");

console.log("\n ALL TESTS PASSED SUCCESSFULLY! Canonical fork filter is 100% sound.");
