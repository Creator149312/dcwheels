import { NextResponse } from "next/server";
import { sessionData } from "@utils/SessionData";
import {
  TMDB_PRESETS,
  TMDB_GENRES,
  TMDB_DECADES,
} from "@lib/tmdbPresets";

// Returns the catalog of TMDB presets + filter dictionaries so the UI can
// render a dropdown / radio group without hardcoding anything.
export async function GET() {
  const session = await sessionData();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      presets: TMDB_PRESETS.map((p) => ({
        key: p.key,
        label: p.label,
        titleHint: p.titleHint,
        supports: p.supports,
      })),
      genres: TMDB_GENRES,
      decades: TMDB_DECADES.map((d) => d.value),
    },
    { status: 200 }
  );
}
