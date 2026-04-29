// app/api/fix-tags/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { isAdminSession } from "@utils/auth/isAdmin";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import OpenAI from "openai";

const bannedWords = [
  "nsfw",
  "porn",
  "hentai",
  "nude",
  "sex",
  "violence",
  "drugs",
  "kill",
  "murder",
  "terrorist",
  "weapon",
  "abuse",
  "random",
  "generator",
  "random selection",
  "decision making",
];

// export async function POST(req) {
//   await connectMongoDB();

//   const { searchParams } = new URL(req.url);
//   const limitParam = searchParams.get("limit");
//   const limit = limitParam === "all" ? 0 : parseInt(limitParam || "200");

//   try {
//     const query = { tags: { $exists: true, $not: { $size: 0 } } };
//     const wheels = await Wheel.find(query).limit(limit || 0);

//     let updatedCount = 0;

//     // Basic list of banned/inappropriate tags (expand as needed)
//     const bannedWords = [
//       "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
//       "kill", "murder", "terrorist", "weapon", "abuse"
//     ];

//     // Helper: clean and validate tags
//     const cleanTag = (tag) => {
//       const cleaned = tag
//         .replace(/[^a-zA-Z0-9]/g, '') // only allow alphanumeric
//         .trim()
//         .toLowerCase();
//       return cleaned;
//     };

//     for (const wheel of wheels) {
//       const originalTags = wheel.tags || [];

//       const cleanedTags = Array.from(
//         new Set(
//           originalTags
//             .map(cleanTag)
//             .filter(tag =>
//               tag.length > 0 &&
//               !bannedWords.includes(tag)
//             )
//         )
//       ).slice(0, 15); // max 15 tags

//       if (JSON.stringify(wheel.tags) !== JSON.stringify(cleanedTags)) {
//         wheel.tags = cleanedTags;
//         await wheel.save();
//         updatedCount++;
//       }
//     }

//     return NextResponse.json({ message: `Updated ${updatedCount} wheels.` });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await connectMongoDB();

//   const { searchParams } = new URL(req.url);
//   const limitParam = searchParams.get("limit");
//   const limit = limitParam === "all" ? 0 : parseInt(limitParam || "200");

//   try {
//     const query = { tags: { $exists: true, $not: { $size: 0 } } };
//     const wheels = await Wheel.find(query).limit(limit || 0);

//     let updatedCount = 0;

//     // Basic list of banned/inappropriate tags (expand as needed)
//     const bannedWords = [
//       "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
//       "kill", "murder", "terrorist", "weapon", "abuse"
//     ];

//     // Helper: clean and validate tags
//     const cleanTag = (tag) => {
//       const cleaned = tag
//         .replace(/[^a-zA-Z0-9]/g, '') // only allow alphanumeric
//         .trim()
//         .toLowerCase();
//       return cleaned;
//     };

//     for (const wheel of wheels) {
//       const originalTags = wheel.tags || [];

//       // Clean and filter tags
//       let cleanedTags = Array.from(
//         new Set(
//           originalTags
//             .map(cleanTag)
//             .filter(tag =>
//               tag.length > 0 &&
//               !bannedWords.includes(tag)
//             )
//         )
//       );

//       // Enforce min 3 and max 7 tags
//       if (cleanedTags.length > 7) {
//         cleanedTags = cleanedTags.slice(0, 7);
//       } else if (cleanedTags.length < 3) {
//         // If fewer than 3, try to pad with items or description keywords
//         const extraCandidates = [
//           ...(wheel.items || []),
//           ...(wheel.description ? wheel.description.split(/\s+/) : [])
//         ].map(cleanTag);

//         for (const candidate of extraCandidates) {
//           if (cleanedTags.length >= 3) break;
//           if (candidate.length > 0 && !bannedWords.includes(candidate) && !cleanedTags.includes(candidate)) {
//             cleanedTags.push(candidate);
//           }
//         }
//       }

//       if (JSON.stringify(wheel.tags) !== JSON.stringify(cleanedTags)) {
//         wheel.tags = cleanedTags;
//         await wheel.save();
//         updatedCount++;
//       }
//     }

//     return NextResponse.json({ message: `Updated ${updatedCount} wheels.` });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const limit = limitParam === "all" ? 0 : parseInt(limitParam || "40");
  const page = parseInt(pageParam || "0");

  try {
    // const query = { tags: { $exists: true, $not: { $size: 0 } } };
    const query = {
      $or: [
        { tags: { $exists: false } }, // field missing
        { tags: { $size: 0 } }, // field exists but empty
      ],
    };

    const wheels = await Wheel.find(query)
      .skip(page * limit) // skip previous batches
      .limit(limit || 0); // process current batch

    let updatedCount = 0;

    const bannedWords = [
      "nsfw",
      "porn",
      "hentai",
      "nude",
      "sex",
      "violence",
      "drugs",
      "kill",
      "murder",
      "terrorist",
      "weapon",
      "abuse",
    ];

    const cleanTag = (tag) =>
      tag
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")   // strip symbols but keep spaces & hyphens
        .replace(/[\s-]+/g, "-")         // collapse whitespace/hyphens to single hyphen
        .replace(/(^-|-$)/g, "");        // trim leading/trailing hyphens

    // const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const wheel of wheels) {
      console.log("Wheel title " + wheel.title);
      // console.log("Description:", wheel.description);
      // console.log("Original tags:", wheel.tags);

      // let cleanedTags = Array.from(
      //   new Set(
      //     (wheel.tags || [])
      //       .map(cleanTag)
      //       .filter((tag) => tag.length > 0 && !bannedWords.includes(tag))
      //   )
      // );

      // console.log("Cleaned tags before OpenAI:", cleanedTags);

      // if (wheel.description.length > 25) {
      //   if (cleanedTags.length < 3 || cleanedTags.length > 7) {
      //     const prompt = `
      //     Resource description: ${wheel.description || ""}
      //     Current tags: ${cleanedTags.join(", ")}

      //     Task: Validate and correct the tags.
      //     - Return between 3 and 7 tags.
      //     - Tags must be relevant to the description and items.
      //     - Avoid tags that contain terms related to random, generator, decision making, selection, wheel etc.
      //     - No duplicates or unnecessary synonyms.
      //     - Output as an array of strings.

      //     Example format: ["tag1", "tag2", "tag3"]
      //     `;

      //     const delay = 2000 + Math.floor(Math.random() * 1000);
      //     console.log(`Sleeping for ${delay}ms before OpenAI call...`);
      //     await sleep(delay);

      //     // console.log("OpenAI prompt:", prompt);

      //     const response = await openai.chat.completions.create({
      //       model: "gpt-4o-mini",
      //       messages: [{ role: "user", content: prompt }],
      //     });

      //     console.log(
      //       "Raw OpenAI response:",
      //       response.choices[0].message.content
      //     );

      //     try {
      //       cleanedTags = JSON.parse(response.choices[0].message.content);
      //     } catch (err) {
      //       console.error(
      //         "Error parsing OpenAI response, falling back:",
      //         err.message
      //       );
      //       if (cleanedTags.length > 7) cleanedTags = cleanedTags.slice(0, 7);
      //       while (cleanedTags.length < 3 && (wheel.items || []).length > 0) {
      //         const candidate = cleanTag(wheel.items.shift());
      //         if (candidate.length > 0 && !cleanedTags.includes(candidate)) {
      //           cleanedTags.push(candidate);
      //         }
      //       }
      //     }
      //   }

      //   console.log("Final tags for wheel:", wheel._id, cleanedTags);

      //   if (JSON.stringify(wheel.tags) !== JSON.stringify(cleanedTags)) {
      //     // wheel.tags = cleanedTags;
      //     wheel.tags = Array.from(
      //       new Set(
      //         (cleanedTags || [])
      //           .map(cleanTag)
      //           .filter((tag) => tag.length > 0 && !bannedWords.includes(tag))
      //       )
      //     );

      //     await wheel.save();
      //     updatedCount++;
      //     console.log(`Wheel ${wheel._id} updated.`);
      //   } else {
      //     console.log(`Wheel ${wheel._id} unchanged.`);
      //   }
      // } else {
      //   console.log("Processing wheel:", wheel.title);
      //   console.log("Description short, assigning default 'user' tag.");

      //   // Always assign "user" tag
      //   const defaultTags = ["user"];

      //   // Only update if tags differ
      //   if (JSON.stringify(wheel.tags) !== JSON.stringify(defaultTags)) {
      //     wheel.tags = defaultTags;
      //     await wheel.save();
      //     updatedCount++;
      //     console.log(`Wheel ${wheel._id} updated with default tag 'user'.`);
      //   } else {
      //     console.log(`Wheel ${wheel._id} already has default tag 'user'.`);
      //   }
      // }
    }

    console.log(`Batch ${page + 1}: Total wheels updated: ${updatedCount}`);
    return NextResponse.json({
      message: `Batch ${page + 1}: Updated ${updatedCount} wheels.`,
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
