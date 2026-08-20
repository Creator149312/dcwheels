import { connectMongoDB } from "../lib/mongodb.js";
import Wheel from "../models/wheel.js";
import User from "../models/user.js";

async function backfillWheelUserIds() {
  console.log("Connecting to MongoDB...");
  await connectMongoDB();

  const legacyWheels = await Wheel.find({
    $or: [{ userId: { $exists: false } }, { userId: null }],
  }).select("_id createdBy");

  console.log(`Found ${legacyWheels.length} legacy wheels without a valid userId.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const wheel of legacyWheels) {
    if (!wheel.createdBy || typeof wheel.createdBy !== "string") {
      skippedCount++;
      continue;
    }

    const email = wheel.createdBy.trim().toLowerCase();
    const user = await User.findOne({ email }).select("_id").lean();

    if (user && user._id) {
      await Wheel.updateOne(
        { _id: wheel._id },
        { $set: { userId: user._id } }
      );
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(
    `Migration finished. Updated: ${updatedCount}, Skipped/Unmatched: ${skippedCount}`
  );
  process.exit(0);
}

backfillWheelUserIds().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
