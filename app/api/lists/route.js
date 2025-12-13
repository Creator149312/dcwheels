import { connectMongoDB } from "@lib/mongodb";
import SaveList from "@models/savelist";
import UnifiedList from "@models/unifiedlist";

// GET /api/lists?userId=123
export async function GET(req) {
  await connectMongoDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
  }

  try {
    const lists = await UnifiedList.find({ userId }).sort({ updatedAt: -1 }).lean();
    return new Response(JSON.stringify(lists), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// POST /api/lists
export async function POST(req) {
  await connectMongoDB();
  const body = await req.json();
  const { userId, name, description } = body;

  if (!userId || !name) {
    return new Response(JSON.stringify({ error: "Missing userId or name" }), { status: 400 });
  }

  try {
    const list = await UnifiedList.create({ userId, name, description });
    return new Response(JSON.stringify(list), { status: 201 });
  } catch (err) {
    // Handle duplicate list names per user
    if (err.code === 11000) {
      return new Response(JSON.stringify({ error: "List name already exists" }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
