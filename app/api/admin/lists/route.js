import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FILE = resolve(process.cwd(), "data/high-quality-tmdb-lists.json");

function readData() {
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch {
    return { lists: [] };
  }
}

function writeData(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
}

// GET /api/admin/lists
export async function GET() {
  const data = readData();
  return NextResponse.json(data);
}

// DELETE /api/admin/lists?name=List+Name
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ ok: false, error: "Missing name" }, { status: 400 });
  }

  const data = readData();
  const before = data.lists.length;
  data.lists = data.lists.filter((list) => list.name !== name);

  if (data.lists.length === before) {
    return NextResponse.json({ ok: false, error: "List not found" }, { status: 404 });
  }

  writeData(data);
  return NextResponse.json({ ok: true });
}

// PUT /api/admin/lists?name=List+Name
export async function PUT(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ ok: false, error: "Missing name" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const data = readData();
  const index = data.lists.findIndex((list) => list.name === name);

  if (index === -1) {
    return NextResponse.json({ ok: false, error: "List not found" }, { status: 404 });
  }

  data.lists[index] = { ...data.lists[index], ...body };
  writeData(data);
  return NextResponse.json({ ok: true, list: data.lists[index] });
}
