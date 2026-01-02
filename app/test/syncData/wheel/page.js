import Wheel from "@models/wheel";
import { connectMongoDB } from "@lib/mongodb";

async function buildIndexes() {
  await connectMongoDB();

  await Wheel.syncIndexes(); // ensures schema indexes are applied

  const indexes = await Wheel.collection.indexes();
  console.log("Indexes synced successfully!");
  console.table(indexes); // prints all indexes for verification
}

export default function Page() {
  // buildIndexes();
}

// import Wheel from "@models/wheel";
// import { connectMongoDB } from "@lib/mongodb";

// async function findDuplicates() {
//   await connectMongoDB();

//   // Aggregate duplicates based on title + createdBy
//   const duplicates = await Wheel.aggregate([
//     {
//       $group: {
//         _id: { title: "$title", createdBy: "$createdBy" },
//         count: { $sum: 1 },
//         docs: { $push: { _id: "$_id", createdAt: "$createdAt" } }
//       }
//     },
//     {
//       $match: { count: { $gt: 1 } } // only groups with duplicates
//     }
//   ]);

//   console.log("Duplicate entries based on {title, createdBy}:");
//   console.table(
//     duplicates.map(d => ({
//       title: d._id.title,
//       createdBy: d._id.createdBy,
//       count: d.count,
//       ids: d.docs.map(doc => doc._id.toString())
//     }))
//   );
// }

// export default function Page() {
//   findDuplicates();
// }
