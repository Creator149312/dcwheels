import { NextResponse } from "next/server";
import { sessionData } from "@utils/SessionData";
import { slugify } from "@utils/HelperFunctions";
import {
  TMDB_PRESETS,
  TMDB_GENRES,
  TMDB_DECADES,
} from "@lib/tmdbPresets";

const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

// Shape a TMDB movie object into a wheel-ready entity segment.
// Matches the existing segment schema in utils/segmentUtils.js so the
// WinnerPopup's "Explore" button lights up automatically — it routes to
// /movie/{slug} which is handled by app/(content)/[type]/[slug]/page.js.
function toSegment(movie) {
  const title = movie.title || movie.original_title || "Untitled";
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const displaySlug = `${movie.id}-${slugify(title)}`;

  return {
    // Core segment fields (match createSegment() output shape)
    text: title,
    image: movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null,
    imageLandscape: false, // posters are portrait
    // Entity metadata — drives WinnerPopup "Explore" + AddToListButton
    type: "entity",
    entityType: "movie",
    entityId: movie.id,
    slug: displaySlug,
    payload: {
      entityType: "movie",
      entityId: movie.id,
      slug: displaySlug,
    },
    // Extra display hints the editor can show (non-authoritative)
    meta: {
      year,
      rating: movie.vote_average || null,
      overview: movie.overview || "",
    },
  };
}

export async function POST(req) {
  try {
    const session = await sessionData();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "TMDB_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      preset: presetKey,
      genre, // optional: TMDB genre id
      decade, // optional: "2020s", "2010s", ...
      page = 1,
      limit = 20,
    } = body || {};

    const preset = TMDB_PRESETS.find((p) => p.key === presetKey);
    if (!preset) {
      return NextResponse.json(
        { message: "Unknown preset" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      language: "en-US",
      page: String(Math.max(1, Math.min(Number(page) || 1, 20))),
      ...preset.params,
    });

    let resolvedGenre = null;
    let resolvedDecade = null;

    if (preset.supports.includes("genre") && genre) {
      const g = TMDB_GENRES.find((x) => x.id === Number(genre));
      if (!g) {
        return NextResponse.json(
          { message: "Unknown genre" },
          { status: 400 }
        );
      }
      params.set("with_genres", String(g.id));
      resolvedGenre = g;
    }

    if (preset.supports.includes("decade") && decade) {
      const d = TMDB_DECADES.find((x) => x.value === decade);
      if (!d) {
        return NextResponse.json(
          { message: "Unknown decade" },
          { status: 400 }
        );
      }
      params.set("primary_release_date.gte", d.gte);
      params.set("primary_release_date.lte", d.lte);
      resolvedDecade = d.value;
    }

    const url = `${TMDB_BASE}${preset.path}?${params.toString()}`;
    // TMDB's own CDN already caches these; we add a 1h app-level cache to cut
    // repeat calls when the same preset is tweaked/re-run by the operator.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json(
        { message: `TMDB ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();

    // Filter out movies without posters — a wheel segment without an image
    // looks terrible, and "missing poster" is usually a sign of low-quality
    // metadata anyway.
    const usable = (data.results || [])
      .filter((m) => m.poster_path && m.title)
      .slice(0, Math.max(1, Math.min(Number(limit) || 20, 40)));

    const segments = usable.map(toSegment);

    // Build a suggested wheel title from the preset's template.
    let titleHint = preset.titleHint || "Movies Picker Wheel";
    if (resolvedGenre) titleHint = titleHint.replace(/{genre}/g, resolvedGenre.name);
    if (resolvedDecade) titleHint = titleHint.replace(/{decade}/g, resolvedDecade);

    return NextResponse.json(
      {
        preset: preset.key,
        genre: resolvedGenre?.name || null,
        decade: resolvedDecade || null,
        titleHint,
        segments,
        totalResults: data.total_results || usable.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("tmdb/fetch error:", err);
    return NextResponse.json(
      { message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
