import { connectMongoDB } from "@lib/mongodb";
import SaveList from "@models/savelist";
import UnifiedList from "@models/unifiedlist";

export async function POST(req, { params }) {
  await connectMongoDB();
  const { listId } = params;
  const body = await req.json();
  const { entityType, entityId, name, slug, image } = body;

  const list = await UnifiedList.findById(listId);
  if (!list) return new Response(JSON.stringify({ error: "List not found" }), { status: 404 });

  const exists = list.items.some(
    (i) => i.entityType === entityType && i.entityId.toString() === entityId
  );
  if (!exists) {
    list.items.push({ entityType, entityId, name, slug, image });
    await list.save();
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function DELETE(req, { params }) {
  await connectMongoDB();
  const { listId } = params;
  const body = await req.json();
  const { entityType, entityId } = body;

  const list = await UnifiedList.findById(listId);
  if (!list) return new Response(JSON.stringify({ error: "List not found" }), { status: 404 });

  list.items = list.items.filter(
    (i) => !(i.entityType === entityType && i.entityId.toString() === entityId)
  );
  await list.save();

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
