import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UserEntityStatus from "@models/userEntityStatus";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

/**
 * GET /api/user-entity-status?entityId=<id>
 *
 * Returns the current user's status for a single entity.
 * Responds with { found: boolean, status, entityType, createdAt }.
 */
export async function GET(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    if (!entityId) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const row = await UserEntityStatus.findOne({ userId, entityId }).lean();
    if (!row) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        found: true,
        status: row.status,
        entityType: row.entityType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/user-entity-status error:", err);
    return NextResponse.json({ found: false }, { status: 200 });
  }
}

/**
 * POST /api/user-entity-status
 *
 * Body: { entityType, entityId, name, status }
 * status defaults to "done" if omitted (typical for Mark as Watched/Played).
 *
 * Upserts the user's status for the entity.
 */
export async function POST(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, name, status = "done" } = body || {};

    if (!entityType || !entityId || !name) {
      return NextResponse.json(
        { error: "entityType, entityId, and name are required" },
        { status: 400 }
      );
    }

    if (!["movie", "anime", "game", "character"].includes(entityType)) {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    if (!["want", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const row = await UserEntityStatus.findOneAndUpdate(
      { userId, entityId: String(entityId) },
      {
        $set: {
          entityType,
          name: String(name).slice(0, 200),
          status,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          userId,
          entityId: String(entityId),
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json(
      {
        found: true,
        status: row.status,
        entityType: row.entityType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/user-entity-status error:", err);
    return NextResponse.json(
      { error: "Failed to update status", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-entity-status?entityId=<id>
 *
 * Removes the user's status for an entity (e.g. unmark as watched).
 */
export async function DELETE(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    if (!entityId) {
      return NextResponse.json({ error: "entityId required" }, { status: 400 });
    }

    await UserEntityStatus.deleteOne({ userId, entityId: String(entityId) });

    return NextResponse.json({ found: false }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/user-entity-status error:", err);
    return NextResponse.json(
      { error: "Failed to remove status", details: err.message },
      { status: 500 }
    );
  }
}
