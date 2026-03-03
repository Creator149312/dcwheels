import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  // 1. Ensure the param matches your folder name [searchtitle]
  const { searchtitle } = params; 
  const { searchParams } = new URL(request.url);
  const start = parseInt(searchParams.get("start") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!searchtitle) {
    return NextResponse.json({ list: [], total: 0 }, { status: 200 });
  }

  await connectMongoDB();

  try {
    const results = await Wheel.aggregate([
      {
        $search: {
          index: "default",
          autocomplete: {
            query: decodeURIComponent(searchtitle),
            path: "title"
          }
        }
      },
      // 2. Add skip/limit BEFORE projection for performance
      { $skip: start },
      { $limit: limit },
      {
        $project: {
          title: 1,
          data: 1, // CRITICAL: You must include this so UI can read item.data.length
          score: { $meta: "searchScore" }
        }
      }
    ]);

    // 3. More efficient way to get total count using $$SEARCH_META
    // But for now, keeping your count logic with the fix:
    const totalCount = await Wheel.aggregate([
      {
        $search: {
          index: "default",
          autocomplete: {
            query: decodeURIComponent(searchtitle),
            path: "title"
          }
        }
      },
      { $count: "total" }
    ]);

    return NextResponse.json(
      { 
        list: results, 
        total: totalCount[0]?.total || 0 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wheels", list: [], total: 0 },
      { status: 500 }
    );
  }
}

// import { connectMongoDB } from "@lib/mongodb";
// import Wheel from "@models/wheel";
// import { NextResponse } from "next/server";

// export async function GET(request, { params }) {
//   const { searchtitle } = params;
//   const { searchParams } = new URL(request.url);
//   const start = parseInt(searchParams.get("start") || "0", 10);
//   const limit = parseInt(searchParams.get("limit") || "10", 10);

//   await connectMongoDB();

//   try {
//     const results = await Wheel.aggregate([
//       {
//         $search: {
//           index: "default", // or the name of your Atlas Search index
//           autocomplete: {
//             query: searchtitle,
//             path: "title"
//           }
//         }
//       },
//       { $skip: start },
//       { $limit: limit },
//       {
//         $project: {
//           title: 1,
//           // include other fields you want returned
//           score: { $meta: "searchScore" }
//         }
//       }
//     ]);

//     const totalCount = await Wheel.aggregate([
//       {
//         $search: {
//           index: "default",
//           autocomplete: {
//             query: searchtitle,
//             path: "title"
//           }
//         }
//       },
//       { $count: "total" }
//     ]);

//     return NextResponse.json(
//       { list: results, total: totalCount[0]?.total || 0 },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Search error:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch wheels" },
//       { status: 500 }
//     );
//   }
// }


// import { connectMongoDB } from "@lib/mongodb";
// import Wheel from "@models/wheel";
// import { NextResponse } from "next/server";

// export async function GET(request, { params }) {
//   const { searchtitle } = params;
//   const { searchParams } = new URL(request.url);
//   const start = parseInt(searchParams.get("start") || "0", 10);
//   const limit = parseInt(searchParams.get("limit") || "10", 10);

//   await connectMongoDB();

//   try {
//     const allMatches = await Wheel.find({
//       title: { $regex: new RegExp(searchtitle, "i") },
//     });

//     const sliced = allMatches.slice(start, start + limit);

//     return NextResponse.json(
//       { list: sliced, total: allMatches.length },
//       {
//         status: 200,
//         // Optional: caching hint (if supported by your framework)
//         // headers: { "Cache-Control": "public, max-age=60" }
//       }
//     );
//   } catch (error) {
//     console.error("Search error:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch wheels" },
//       { status: 500 }
//     );
//   }
// }
