import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";
import { NextResponse } from "next/server";
import {
  ensureArrayOfObjects,
  replaceUnderscoreWithDash,
} from "@utils/HelperFunctions";
import { sessionData, sessionUserId } from "@utils/SessionData";

// ---------------------------------------------------------------------------
// Deterministic palette picker.
// Replaces a previous OpenAI call that spent ~1–2s + tokens per wheel just to
// get 4 hex codes. Same title always maps to the same palette — stable and
// free. Palettes were hand-picked for good segment contrast.
// ---------------------------------------------------------------------------
const PALETTES = [
  ["#EF4444", "#F59E0B", "#10B981", "#3B82F6"],
  ["#8B5CF6", "#EC4899", "#F97316", "#14B8A6"],
  ["#6366F1", "#22C55E", "#EAB308", "#F43F5E"],
  ["#0EA5E9", "#A855F7", "#FB7185", "#84CC16"],
  ["#2563EB", "#DB2777", "#16A34A", "#CA8A04"],
  ["#DC2626", "#0891B2", "#9333EA", "#65A30D"],
  ["#F472B6", "#38BDF8", "#FACC15", "#34D399"],
  ["#E11D48", "#7C3AED", "#059669", "#D97706"],
];

function pickPalette(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

// Try the requested slug, then -2, -3... up to `attempts`. Returns the saved
// Page. Avoids silent 500s when two prompts collide on the same slug.
async function savePageWithUniqueSlug(basePageData, baseSlug, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    try {
      const page = new Page({ ...basePageData, slug });
      await page.save();
      return page;
    } catch (err) {
      if (err?.code !== 11000) throw err; // only retry on duplicate-key
    }
  }
  throw new Error(`Could not find a unique slug for "${baseSlug}"`);
}

export async function POST(req) {
  let savedWheel = null;
  try {
    // Auth gate — previously this route hard-coded `createdBy` to a single
    // admin email, so any caller could create wheels under that account.
    const session = await sessionData();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // Kept for ApiLog attribution in future uses of callOpenAI here.
    await sessionUserId();

    const { jsonKey, jsonData, slug: providedSlug } = await req.json();

    if (
      !jsonKey ||
      !jsonData ||
      !jsonData.title ||
      !jsonData.description ||
      !jsonData.segments
    ) {
      return NextResponse.json(
        { message: "Invalid JSON format. Missing required fields." },
        { status: 400 }
      );
    }

    // Reject obviously-malformed human-edited slugs early — server-side
    // defence mirroring the client-side live check.
    if (providedSlug !== undefined) {
      if (
        typeof providedSlug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(providedSlug) ||
        providedSlug.length > 80
      ) {
        return NextResponse.json(
          { message: "Invalid slug format" },
          { status: 400 }
        );
      }
    }

    await connectMongoDB();

    const colorCodes = pickPalette(jsonData.title);
    const dataObjectForSegments = ensureArrayOfObjects(jsonData.segments);

    const wheel = new Wheel({
      title: jsonData.title,
      description: jsonData.description,
      data: dataObjectForSegments || [],
      wheelData: {
        segColors: colorCodes,
        spinDuration: 5,
        maxNumberOfOptions: 100,
        innerRadius: 15,
        removeWinnerAfterSpin: false,
        customPopupDisplayMessage: "The Winner is...",
      },
      relatedTo: null,
      createdBy: session.user.email,
      tags: jsonData.tags || [],
    });

    await wheel.save();
    savedWheel = wheel;

    const pageSlug = (
      providedSlug || replaceUnderscoreWithDash(jsonKey)
    ).toLowerCase();
    const basePageData = {
      title: jsonData.title,
      description: jsonData.description,
      content: jsonData.content || [],
      indexed: true,
      wheel: wheel._id,
    };

    // When the human explicitly picked a slug at Gate #2 we honour it
    // verbatim — collisions must surface to the UI so the reviewer can edit,
    // not be silently auto-suffixed. Only the unattended bulk path falls
    // back to the suffix-on-collision helper.
    let page;
    if (providedSlug) {
      try {
        page = new Page({ ...basePageData, slug: pageSlug });
        await page.save();
      } catch (err) {
        if (err?.code === 11000) {
          // Roll back the orphan Wheel before returning the collision to UI.
          try { await Wheel.deleteOne({ _id: savedWheel._id }); } catch {}
          savedWheel = null;
          return NextResponse.json(
            { message: "Slug already in use", slug: pageSlug, code: "SLUG_TAKEN" },
            { status: 409 }
          );
        }
        throw err;
      }
    } else {
      page = await savePageWithUniqueSlug(basePageData, pageSlug);
    }

    return NextResponse.json(
      {
        message: "Page and Wheel Created Successfully",
        slug: page.slug,
        wheelId: wheel._id,
      },
      { status: 201 }
    );
  } catch (error) {
    // If the Wheel was created but the Page step failed, roll back the Wheel
    // so we don't leave an orphan document behind.
    if (savedWheel?._id) {
      try {
        await Wheel.deleteOne({ _id: savedWheel._id });
      } catch (cleanupErr) {
        console.error("Failed to roll back orphan wheel:", cleanupErr);
      }
    }
    console.error("createFromJSON error:", error);
    return NextResponse.json(
      { message: error?.message || "Error Creating Page and Wheel" },
      { status: 500 }
    );
  }
}
