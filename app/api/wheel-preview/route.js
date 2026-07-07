import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import sharp from "sharp";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  try {
    const formData = await req.formData();
    const wheelId = formData.get("wheelId");
    const file = formData.get("file");

    if (!wheelId || typeof wheelId !== "string") {
      return NextResponse.json({ error: "wheelId is required" }, { status: 400 });
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const wheel = await Wheel.findById(wheelId).select("_id title createdBy");
    if (!wheel) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }

    // Ensure the current user owns this wheel
    if (wheel.createdBy !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slug = (wheel.title || "wheel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const blobPath = `wheel-previews/${slug}-${wheelId}.webp`;
    const thumbBlobPath = `wheel-previews/${slug}-${wheelId}-thumb.webp`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate full 640x640 preview and 300x300 thumb in parallel
    const [optimizedBuffer, thumbBuffer] = await Promise.all([
      sharp(fileBuffer)
        .resize(640, 640, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 92 })
        .toBuffer(),
      sharp(fileBuffer)
        .resize(300, 300, { fit: "cover", position: "centre" })
        .webp({ quality: 88 })
        .toBuffer(),
    ]);

    const [uploaded] = await Promise.all([
      put(blobPath, optimizedBuffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
      put(thumbBlobPath, thumbBuffer, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
    ]);

    await Wheel.findByIdAndUpdate(wheelId, { wheelPreview: uploaded.url });

    return NextResponse.json(
      {
        success: true,
        wheelId,
        wheelPreview: uploaded.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/wheel-preview error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
