import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { slugify } from "@utils/HelperFunctions";
import {
  fetchAnime,
  fetchMovies,
  fetchGames,
  fetchCharacters,
} from "./TopicPagesHelperFunctions";
import { isCleanText, isTopicDocSafe } from "@/lib/contentSafety";

const SPOTLIGHT_REVALIDATE = 86400; // 24 hours

const _fetchSpotlightUncached = async (type) => {
  try {
    if (type === "movie") {
      const movies = await fetchMovies({ page: 1, sortBy: "popularity.desc" });
      if (movies && movies.length > 0) {
        return movies
          .filter((m) => !m.adult && isCleanText(m.title))
          .slice(0, 4)
          .map((m) => ({
            id: m.id,
            title: m.title,
            slug: `${m.id}-${slugify(m.title)}`,
            image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : null,
            subtitle: m.release_date?.slice(0, 4) || null,
          }));
      }
    }

    if (type === "anime") {
      const anime = await fetchAnime({ page: 1, perPage: 8, sort: "TRENDING_DESC" });
      if (anime && anime.length > 0) {
        return anime
          .filter((a) => !a.isAdult)
          .map((a) => {
            const title = a.title?.english || a.title?.romaji || "Anime";
            return {
              id: a.id,
              title,
              slug: `${a.id}-${slugify(title)}`,
              image: a.coverImage?.large,
              rating: a.averageScore ? (a.averageScore / 20).toFixed(1) : null,
              genre: a.genres?.[0] || null,
              subtitle: a.startDate?.year ? String(a.startDate.year) : null,
            };
          })
          .filter(isTopicDocSafe)
          .slice(0, 4);
      }
    }

    if (type === "game") {
      const games = await fetchGames({ page: 1, page_size: 8, ordering: "-added" });
      if (games && games.length > 0) {
        return games
          .filter((g) => {
            const isAdultEsrb = g.esrb_rating?.slug === "adults-only";
            const hasAdultTag = (g.tags || []).some((t) => {
              const name = (t.name || "").toLowerCase();
              return name === "nsfw" || name === "sexual content" || name === "erotic" || name === "hentai";
            });
            return !isAdultEsrb && !hasAdultTag && isCleanText(g.name) && isCleanText(g.slug);
          })
          .slice(0, 4)
          .map((g) => ({
            id: g.id,
            title: g.name,
            slug: `${g.id}-${g.slug}`,
            image: g.background_image,
            rating: g.rating ? g.rating.toFixed(1) : null,
            genre: g.genres?.[0]?.name || null,
            subtitle: g.released?.slice(0, 4) || null,
          }));
      }
    }

    if (type === "character") {
      const chars = await fetchCharacters({ page: 1, perPage: 8, sort: "FAVOURITES_DESC" });
      if (chars && chars.length > 0) {
        return chars
          .slice(0, 4)
          .map((c) => {
            const name = c.name?.full || c.name?.native || "Character";
            return {
              id: c.id,
              title: name,
              slug: `${c.id}-${slugify(name)}`,
              image: c.image?.large,
              subtitle: c.gender || null,
            };
          });
      }
    }
  } catch (err) {
    console.error(`[_fetchSpotlightUncached ${type}] external API error:`, err);
  }

  // Fallback to highest-traction TopicPage in MongoDB
  try {
    await connectMongoDB();
    const fallbackPages = await TopicPage.find({
      type,
      cover: { $exists: true, $ne: null },
      slug: { $exists: true, $ne: null },
    })
      .sort({ wheels: -1, updatedAt: -1 })
      .limit(8)
      .select("title slug type cover relatedId details wheels tags description")
      .lean();

    if (fallbackPages.length > 0) {
      return fallbackPages
        .filter(isTopicDocSafe)
        .slice(0, 4)
        .map((p) => ({
          id: p.relatedId,
          title:
            p.title?.default ||
            p.title?.english ||
            p.title?.romaji ||
            p.title?.localized ||
            "Topic",
          slug: p.slug,
          image: p.cover,
          subtitle: p.details?.releaseYear ? String(p.details.releaseYear) : null,
        }));
    }
  } catch (err) {
    console.error(`[_fetchSpotlightUncached ${type}] db fallback error:`, err);
  }

  return [];
};

export const getCachedSpotlight = unstable_cache(
  _fetchSpotlightUncached,
  ["category-top-spotlight"],
  { revalidate: SPOTLIGHT_REVALIDATE, tags: ["category-top-spotlight"] }
);
