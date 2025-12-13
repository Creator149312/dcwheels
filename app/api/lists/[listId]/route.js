// app/api/lists/[listId]/route.js
import { connectMongoDB } from "@lib/mongodb";
import SaveList from "@models/savelist";
import UnifiedList from "@models/unifiedlist";

export async function GET(req, { params }) {
  await connectMongoDB();
  const { listId } = params;
  const list = await UnifiedList.findById(listId).lean();
  if (!list) {
    return new Response(JSON.stringify({ error: "List not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(list), { status: 200 });
}
