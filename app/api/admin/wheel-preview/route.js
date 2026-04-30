import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import sharp from "sharp";

const adminCommonID = "gauravsingh9314@gmail.com";

function isAdminEmail(email) {
  const configuredAdmin = process.env.ADMIN_EMAIL;
  if (configuredAdmin && typeof configuredAdmin === "string") {
    return email === configuredAdmin;
  }
  return email === adminCommonID;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email || !isAdminEmail(email)) {
    return null;
  }

  return session;
}

export async function GET(req) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 100), 5000);

  try {
    const wheels = await Wheel.find({
      $or: [
        { wheelPreview: null },
        { wheelPreview: { $exists: false } },
        { wheelPreview: "" },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select("_id title data wheelData createdBy updatedAt")
      .lean();

    return NextResponse.json({ wheels }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/wheel-preview error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
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

    const wheel = await Wheel.findById(wheelId).select("_id title");
    if (!wheel) {
      return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
    }

    const slug = (wheel.title || "wheel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const blobPath = `wheel-previews/${slug}-${wheelId}.webp`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    // Use 320x320 and quality 85 for wheel previews
    const optimizedBuffer = await sharp(fileBuffer)
      .resize(320, 320, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const uploaded = await put(blobPath, optimizedBuffer, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

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
    console.error("POST /api/admin/wheel-preview error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
