/**
 * One-time backfill: normalize all user.email values to lowercase.
 *
 * Run:
 *   node scripts/backfill-lowercase-emails.js
 *
 * Requires MONGODB_URI in environment or .env.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import the ES-module model and read its default export.
const userModule = require("../models/user");
const User = userModule.default || userModule.User || userModule;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log("Connected to MongoDB");

  // 1. Find users whose email contains uppercase characters
  const mixedCaseUsers = await User.find({ email: /[A-Z]/ }).select("email username").lean();
  console.log(`\nFound ${mixedCaseUsers.length} user(s) with mixed-case emails:`);
  mixedCaseUsers.forEach((u) => {
    console.log(`  - ${u.email} ${u.username ? `(username: ${u.username})` : ""}`);
  });

  if (mixedCaseUsers.length === 0) {
    console.log("Nothing to backfill. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // 2. Resolve collisions: if the lowercase version already belongs to another
  //    document, we need to decide what to do. For now, report and skip.
  const skipped = [];
  const updated = [];

  for (const user of mixedCaseUsers) {
    const lower = user.email.toLowerCase();

    const existing = await User.findOne({ email: lower, _id: { $ne: user._id } }).select("_id email").lean();
    if (existing) {
      skipped.push({ id: user._id.toString(), from: user.email, to: lower, collisionWith: existing._id.toString() });
      continue;
    }

    const result = await User.updateOne(
      { _id: user._id },
      { $set: { email: lower } }
    );

    if (result.modifiedCount > 0) {
      updated.push({ id: user._id.toString(), from: user.email, to: lower });
    }
  }

  console.log("\nBackfill complete.");
  console.log(`  Updated: ${updated.length}`);
  updated.forEach((u) => console.log(`    ${u.from} → ${u.to}`));
  console.log(`  Skipped (collision): ${skipped.length}`);
  skipped.forEach((s) => console.log(`    ${s.from} → ${s.to} (collision with ${s.collisionWith})`));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
